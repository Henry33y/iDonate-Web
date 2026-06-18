// Supabase Edge Function: send-notification-push
// Triggered by a DB webhook on notifications INSERT.
// Sends Expo push notifications for any new notification (including broadcasts).

// @ts-ignore - Deno types are available at runtime in Supabase Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// @ts-ignore - Supabase Edge Functions use Deno, which imports via URLs
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log('Received notification webhook:', payload.type, payload.table);

    // Only process INSERT events on notifications table
    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return new Response(JSON.stringify({ message: 'Ignored' }), { status: 200 });
    }

    const notification = payload.record;
    console.log('New notification to send:', notification.title, 'for user:', notification.user_id);

    // Connect to Supabase with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's push token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('id', notification.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
    }

    if (!profile) {
      console.log('No profile found for user:', notification.user_id);
      return new Response(JSON.stringify({ message: 'No user profile' }), { status: 200 });
    }

    const pushToken = profile.push_token;

    if (!pushToken) {
      console.log('User has no push token:', notification.user_id);
      return new Response(JSON.stringify({ message: 'No push token' }), { status: 200 });
    }

    // Send Push Notification
    const expoPayload = [{
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: {
        ...notification.data,
        notificationId: notification.id,
      },
      priority: 'high',
      channelId: 'blood-requests',
    }];

    console.log('Sending Expo push notification:', JSON.stringify(expoPayload));
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(expoPayload),
    });

    const result = await response.json();
    console.log('Expo Push Result:', JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, notified: 1 }),
      { status: 200 }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500 }
    );
  }
});