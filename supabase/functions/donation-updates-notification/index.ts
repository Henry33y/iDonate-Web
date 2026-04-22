// Supabase Edge Function: donation-updates-notification
// Triggered by a DB webhook on donations INSERT and UPDATE.
// Sends Expo push notifications to the requester when a donor volunteers or changes status.

// @ts-ignore - Deno types are available at runtime in Supabase Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// @ts-ignore - Supabase Edge Functions use Deno, which imports via URLs
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: {
    id: string;
    donor_id: string;
    blood_request_id: string | null;
    institution_id: string;
    status: string;
    donor_confirmed: boolean;
    recipient_confirmed: boolean;
  };
  old_record?: {
    status?: string;
  };
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log('Received donation webhook:', payload.type, payload.table, payload.record.status);

    // Only process events on donations table
    if (payload.table !== 'donations') {
      return new Response(JSON.stringify({ message: 'Ignored' }), { status: 200 });
    }

    const donation = payload.record;
    
    // Only process if it is linked to a specific blood request
    if (!donation.blood_request_id) {
        return new Response(JSON.stringify({ message: 'No blood_request_id, ignored' }), { status: 200 });
    }

    const isInsert = payload.type === 'INSERT';
    const oldStatus = payload.old_record?.status;
    const newStatus = donation.status;

    // Determine if notification is needed
    let title = '';
    let body = '';

    if ((isInsert && newStatus === 'scheduled') || (!isInsert && oldStatus !== 'scheduled' && newStatus === 'scheduled')) {
      title = 'New Volunteer!';
      body = 'Someone has volunteered for your blood request. The hospital is coordinating with them.';
    } else if (!isInsert && oldStatus !== 'confirmed' && newStatus === 'confirmed') {
      title = 'Donation Confirmed';
      body = 'A volunteer\'s donation appointment has been confirmed by the hospital.';
    } else if (!isInsert && oldStatus !== 'completed' && newStatus === 'completed') {
      title = 'Donation Completed! 🎉';
      body = 'A donor has successfully completed their donation for your request. Thank you for using iDonate!';
    } else if (!isInsert && oldStatus !== 'cancelled' && newStatus === 'cancelled') {
        title = 'Donation Cancelled';
        body = 'A volunteer had to cancel their donation intent.';
    } else {
        return new Response(JSON.stringify({ message: 'No status change relevant for notification' }), { status: 200 });
    }

    // Connect to Supabase with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get the requester_id from the blood_request
    const { data: bloodRequest, error: requestError } = await supabase
        .from('blood_requests')
        .select('requester_id, blood_type_needed')
        .eq('id', donation.blood_request_id)
        .single();
    
    if (requestError || !bloodRequest) {
        throw new Error(`Could not find blood request ${donation.blood_request_id}`);
    }

    const requesterId = bloodRequest.requester_id;

    // Do not notify if the donor is somehow the requester (e.g. testing)
    if (requesterId === donation.donor_id) {
        return new Response(JSON.stringify({ message: 'Donor is requester, skipping.' }), { status: 200 });
    }

    // 2. Fetch the push token for the requester
    const { data: requesterProfile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token, full_name')
        .eq('id', requesterId)
        .single();

    if (profileError || !requesterProfile) {
        throw new Error(`Could not find profile for requester ${requesterId}`);
    }

    // Persist notification in database
    const { error: insertError } = await supabase
        .from('notifications')
        .insert({
            user_id: requesterId,
            type: 'request_update',
            title: title,
            message: body,
            data: {
                donationId: donation.id,
                requestId: donation.blood_request_id,
                status: newStatus
            }
        });

    if (insertError) {
        console.error('Error inserting notification record:', insertError);
    }

    const pushToken = requesterProfile.push_token;

    if (!pushToken) {
        return new Response(JSON.stringify({ message: 'Requester has no push token' }), { status: 200 });
    }

    // Send Push Notification
    const expoPayload = [{
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: {
        donationId: donation.id,
        requestId: donation.blood_request_id,
        status: newStatus
      },
      priority: 'high',
      channelId: 'blood-requests',
    }];

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
