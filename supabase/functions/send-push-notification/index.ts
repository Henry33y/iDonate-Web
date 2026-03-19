// Supabase Edge Function: send-push-notification
// Triggered by a DB webhook on blood_requests INSERT.
// Sends Expo push notifications to donors whose blood type matches the request.

// @ts-ignore - Deno types are available at runtime in Supabase Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    requester_id: string;
    blood_type_needed: string;
    units_needed: number;
    urgency_level: string;
    patient_name: string | null;
    description: string | null;
  };
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log('Received webhook:', payload.type, payload.table);

    // Only process INSERT events on blood_requests
    if (payload.type !== 'INSERT' || payload.table !== 'blood_requests') {
      return new Response(JSON.stringify({ message: 'Ignored' }), { status: 200 });
    }

    const request = payload.record;
    console.log('New blood request:', request.blood_type_needed, request.units_needed, 'units');

    // Connect to Supabase with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requester's institution name for the notification
    const { data: requesterProfile } = await supabase
      .from('institutions')
      .select('institution_name')
      .eq('id', request.requester_id)
      .maybeSingle();

    const institutionName = requesterProfile?.institution_name || 'A medical institution';

    // Find donors with matching blood type who have push tokens
    const { data: matchingDonors, error: donorsError } = await supabase
      .from('donors')
      .select('id, blood_type, profiles!inner(push_token, full_name)')
      .eq('blood_type', request.blood_type_needed);

    if (donorsError) {
      console.error('Error fetching donors:', donorsError);
      return new Response(JSON.stringify({ error: donorsError.message }), { status: 500 });
    }

    // Filter to only donors with push tokens (exclude the requester)
    const pushTokens: string[] = [];
    for (const donor of matchingDonors || []) {
      const profile = donor.profiles as any;
      if (profile?.push_token && donor.id !== request.requester_id) {
        pushTokens.push(profile.push_token);
      }
    }

    console.log(`Found ${pushTokens.length} donors with ${request.blood_type_needed} blood type and push tokens`);

    if (pushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching donors with push tokens' }), { status: 200 });
    }

    // Build urgency label
    const urgencyLabel = request.urgency_level === 'critical' ? '🚨 CRITICAL'
      : request.urgency_level === 'high' ? '⚠️ Urgent'
      : request.urgency_level === 'moderate' ? 'Moderate'
      : 'Low';

    // Build notification messages (Expo accepts batches of up to 100)
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: `${urgencyLabel}: ${request.blood_type_needed} Blood Needed`,
      body: `${institutionName} needs ${request.units_needed} unit${request.units_needed > 1 ? 's' : ''} of ${request.blood_type_needed} blood.${request.patient_name ? ` Patient: ${request.patient_name}` : ''} Tap to respond.`,
      data: {
        requestId: request.id,
        bloodType: request.blood_type_needed,
        urgency: request.urgency_level,
      },
      priority: request.urgency_level === 'critical' ? 'high' : 'default',
      channelId: 'blood-requests',
    }));

    // Send in batches of 100 (Expo limit)
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      console.log(`Batch ${Math.floor(i / 100) + 1} response:`, JSON.stringify(result));
    }

    return new Response(
      JSON.stringify({ success: true, notified: pushTokens.length }),
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
