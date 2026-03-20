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

    // Medical Compatibility Map (Who can donate to whom)
    const COMPATIBILITY_MAP: Record<string, string[]> = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
      'AB-': ['AB-', 'A-', 'B-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-'] // Universal Donor
    };

    const requestedType = request.blood_type_needed;
    const compatibleDonorTypes = COMPATIBILITY_MAP[requestedType] || [requestedType];

    // Find donors with compatible blood types who have push tokens
    const { data: matchingDonors, error: donorsError } = await supabase
      .from('donors')
      .select('id, blood_type, profiles(push_token, full_name)')
      .in('blood_type', compatibleDonorTypes);

    if (donorsError) {
      console.error('Error fetching donors:', donorsError);
      return new Response(JSON.stringify({ error: donorsError.message }), { status: 500 });
    }

    console.log(`Compatible donors for ${requestedType} (${compatibleDonorTypes.join(', ')}):`, matchingDonors?.length || 0);

    // Filter to only donors with push tokens (exclude the requester)
    const pushTokens: string[] = [];
    for (const donor of matchingDonors || []) {
      const profile = (donor as any).profiles;
      if (profile?.push_token) {
        if (donor.id !== request.requester_id) {
          pushTokens.push(profile.push_token);
        } else {
          console.log('Skipping push for requester (self)');
        }
      } else {
        console.log(`Donor ${donor.id} has no push token`);
      }
    }

    console.log(`Found ${pushTokens.length} valid recipient tokens`);

    // Build urgency label
    const urgencyLabel = request.urgency_level === 'critical' ? '🚨 CRITICAL'
      : request.urgency_level === 'high' ? '⚠️ Urgent'
      : request.urgency_level === 'moderate' ? 'Moderate'
      : 'Low';

    const notificationTitle = `${urgencyLabel}: ${request.blood_type_needed} Blood Needed`;
    const notificationBody = `${institutionName} needs ${request.units_needed} unit${request.units_needed > 1 ? 's' : ''} of ${request.blood_type_needed} blood. Tap to respond.`;

    // Persist notifications in the database for history/badges
    const notificationRecords = matchingDonors?.filter((d: any) => d.id !== request.requester_id).map((donor: any) => ({
      user_id: donor.id,
      type: 'urgent_request',
      title: notificationTitle,
      message: notificationBody,
      data: {
        requestId: request.id,
        bloodType: request.blood_type_needed,
        urgency: request.urgency_level,
        institutionName: institutionName
      }
    }));

    if (notificationRecords && notificationRecords.length > 0) {
      console.log(`Inserting ${notificationRecords.length} notification records into database...`);
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationRecords);
      
      if (insertError) {
        console.error('Error inserting notification records:', insertError);
      } else {
        console.log('Successfully persisted notifications to database.');
      }
    }

    // Build notification messages (Expo accepts batches of up to 100)
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notificationTitle,
      body: notificationBody,
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
