import { supabase } from '../config/supabase';

export const createInstitutionProfile = async (userId, institutionData) => {
    try {
        const { error } = await supabase
            .from('institutions')
            .insert({
                id: userId,
                institution_name: institutionData.name || '',
                institution_type: institutionData.type || null,
                email: institutionData.email || null,
                phone: institutionData.phone || null,
                region: institutionData.region || null,
                city: institutionData.city || null,
                address: institutionData.city && institutionData.region
                    ? `${institutionData.city}, ${institutionData.region}`
                    : null,
                location: (institutionData.latitude != null && institutionData.longitude != null)
                    ? `POINT(${institutionData.longitude} ${institutionData.latitude})`
                    : null,
                website: institutionData.website || null,
                contact_person_name: institutionData.contactPerson?.name || null,
                contact_person_role: institutionData.contactPerson?.role || null,
                status: 'pending',
                license_number: institutionData.licenseNumber || null,
                documents: institutionData.documents || null,
            });

        if (error) throw error;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const getInstitutionProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) return null;

        // Map Supabase columns back to the shape the UI expects
        return {
            id: data.id,
            name: data.institution_name,
            type: data.institution_type,
            email: data.email,
            phone: data.phone,
            region: data.region,
            city: data.city,
            address: data.address,
            website: data.website,
            contactPerson: data.contact_person_name ? {
                name: data.contact_person_name,
                role: data.contact_person_role,
            } : null,
            status: data.status,
            documents: data.documents,
            verified: data.verified,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

export const getAdminProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .eq('user_type', 'admin')
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const getPendingInstitutions = async () => {
    try {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('status', 'pending');

        if (error) throw error;

        // Map to the shape the UI expects
        return (data || []).map(inst => ({
            id: inst.id,
            name: inst.institution_name,
            type: inst.institution_type,
            email: inst.email,
            phone: inst.phone,
            region: inst.region,
            city: inst.city,
            location: { city: inst.city, region: inst.region },
            address: inst.address,
            website: inst.website,
            contactPerson: inst.contact_person_name ? {
                name: inst.contact_person_name,
                role: inst.contact_person_role,
            } : null,
            status: inst.status,
            documents: inst.documents,
            createdAt: inst.created_at,
        }));
    } catch (error) {
        throw new Error(error.message);
    }
};

export const updateInstitutionStatus = async (institutionId, status) => {
    try {
        const verified = status === 'approved';
        const payload = { status, verified };
        const { error } = await supabase
            .from('institutions')
            .update(payload)
            .eq('id', institutionId);

        if (error) throw error;
    } catch (error) {
        throw new Error(error.message);
    }
};

// ─── Admin Panel Functions ──────────────────────────────────────────

/** Helper: map raw institution row to UI shape */
const mapInstitution = (inst) => ({
    id: inst.id,
    name: inst.institution_name,
    type: inst.institution_type,
    email: inst.email,
    phone: inst.phone,
    region: inst.region,
    city: inst.city,
    location: { city: inst.city, region: inst.region },
    address: inst.address,
    website: inst.website,
    licenseNumber: inst.license_number || null,
    contactPerson: inst.contact_person_name ? {
        name: inst.contact_person_name,
        role: inst.contact_person_role,
    } : null,
    status: inst.status,
    verified: inst.verified,
    documents: inst.documents,
    createdAt: inst.created_at,
});

/** Fetch institutions filtered by status */
export const getInstitutionsByStatus = async (status) => {
    try {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapInstitution);
    } catch (error) {
        throw new Error(error.message);
    }
};

/** Fetch ALL institutions regardless of status */
export const getAllInstitutions = async () => {
    try {
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapInstitution);
    } catch (error) {
        throw new Error(error.message);
    }
};

/** Get platform-wide statistics for admin overview */
export const getPlatformStats = async () => {
    try {
        // Fetch counts in parallel
        const [
            { count: totalDonors },
            { count: totalInstitutions },
            { count: pendingInstitutions },
            { count: approvedInstitutions },
            { count: suspendedInstitutions },
            { count: activeRequests },
            { count: totalRequests },
            { count: completedDonations },
            { count: totalDonations },
        ] = await Promise.all([
            supabase.from('donors').select('*', { count: 'exact', head: true }),
            supabase.from('institutions').select('*', { count: 'exact', head: true }),
            supabase.from('institutions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('institutions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('institutions').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
            supabase.from('blood_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('blood_requests').select('*', { count: 'exact', head: true }),
            supabase.from('donations').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from('donations').select('*', { count: 'exact', head: true }),
        ]);

        return {
            totalDonors: totalDonors || 0,
            totalInstitutions: totalInstitutions || 0,
            pendingInstitutions: pendingInstitutions || 0,
            approvedInstitutions: approvedInstitutions || 0,
            suspendedInstitutions: suspendedInstitutions || 0,
            activeRequests: activeRequests || 0,
            totalRequests: totalRequests || 0,
            completedDonations: completedDonations || 0,
            totalDonations: totalDonations || 0,
        };
    } catch (error) {
        console.error('[Admin] Stats fetch error:', error);
        return {
            totalDonors: 0, totalInstitutions: 0, pendingInstitutions: 0,
            approvedInstitutions: 0, suspendedInstitutions: 0,
            activeRequests: 0, totalRequests: 0,
            completedDonations: 0, totalDonations: 0,
        };
    }
};

/** Fetch all users (profiles) for admin user management */
export const getAllUsers = async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, donors(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(error.message);
    }
};

/** Fetch all blood requests platform-wide (admin) */
export const getAllBloodRequests = async () => {
    try {
        const { data, error } = await supabase
            .from('blood_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(error.message);
    }
};

// ─── Blood Request Functions ────────────────────────────────────────

/** Fetch all blood requests for an institution */
export const getInstitutionRequests = async (institutionId) => {
    const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('requester_id', institutionId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

/** Create a new blood request */
export const createBloodRequest = async (requestData) => {
    const { data, error } = await supabase
        .from('blood_requests')
        .insert(requestData)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

/** Update blood request status */
export const updateBloodRequestStatus = async (requestId, status) => {
    const { data, error } = await supabase
        .from('blood_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

/** Delete a blood request (unlinks associated donations first) */
export const deleteBloodRequest = async (requestId) => {
    // Step 1: Unlink any donations that reference this request
    // (prevents FK constraint "donations_blood_request_id_fkey" violation)
    const { error: unlinkError } = await supabase
        .from('donations')
        .update({ blood_request_id: null })
        .eq('blood_request_id', requestId);

    if (unlinkError) {
        console.warn('[iDonate] Could not unlink donations:', unlinkError.message);
        // Not fatal — the request might have no donations, or RLS blocks the update
    }

    // Step 2: Try hard delete
    const { data, error } = await supabase
        .from('blood_requests')
        .delete()
        .eq('id', requestId)
        .select();

    // If FK constraint still fails (e.g. RLS blocked the unlink), fall back to soft-delete
    if (error) {
        if (error.message.includes('foreign key constraint')) {
            console.warn('[iDonate] FK constraint still active — falling back to soft-delete');
            const { data: softData, error: softError } = await supabase
                .from('blood_requests')
                .update({ status: 'cancelled' })
                .eq('id', requestId)
                .select();

            if (softError) throw new Error(softError.message);
            if (!softData || softData.length === 0) {
                throw new Error('Unable to delete this request. You may not have permission.');
            }
            return;
        }
        throw new Error(error.message);
    }

    // If hard delete succeeded, we're done
    if (data && data.length > 0) return;

    // RLS may silently block DELETE (returns 0 rows with no error).
    // Fall back to soft-delete by marking as 'cancelled'.
    console.warn('[iDonate] Hard delete returned 0 rows — falling back to soft-delete (cancelled)');
    const { data: softData, error: softError } = await supabase
        .from('blood_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .select();

    if (softError) throw new Error(softError.message);
    if (!softData || softData.length === 0) {
        throw new Error('Unable to delete this request. You may not have permission.');
    }
};

/** Get dashboard stats for an institution (accepts pre-fetched data to avoid duplicate queries) */
export const getInstitutionStats = async (institutionId, prefetchedRequests, prefetchedDonations) => {
    const requests = prefetchedRequests || await getInstitutionRequests(institutionId);
    const donations = prefetchedDonations || await getInstitutionDonations(institutionId);

    // Exclude soft-deleted requests from stats
    const liveRequests = requests.filter(r => r.status !== 'deleted');
    const activeRequests = liveRequests.filter(r => r.status === 'pending').length;
    const fulfilledRequests = liveRequests.filter(r => r.status === 'fulfilled').length;
    const totalRequests = liveRequests.length;

    const upcomingDonations = donations.filter(d => d.status === 'scheduled' || d.status === 'confirmed').length;
    const completedDonations = donations.filter(d => d.status === 'completed').length;
    const uniqueDonors = new Set(donations.map(d => d.donor_id)).size;

    console.log('[iDonate:Stats]', { activeRequests, fulfilledRequests, totalRequests, upcomingDonations, completedDonations, uniqueDonors });
    return { activeRequests, fulfilledRequests, totalRequests, upcomingDonations, completedDonations, uniqueDonors };
};

// ─── Donation Functions ─────────────────────────────────────────────

/** Fetch all donations for an institution (with donor profiles) */
export const getInstitutionDonations = async (institutionId) => {
    console.log('[iDonate:Donations] Fetching donations for', institutionId);

    // Try enriched query first, fall back to simple query
    try {
        const { data, error } = await supabase
            .from('donations')
            .select(`
                *,
                profiles:donor_id (
                    full_name,
                    phone_number,
                    avatar_url
                )
            `)
            .eq('institution_id', institutionId)
            .order('scheduled_date', { ascending: false });

        if (error) throw error;
        console.log('[iDonate:Donations] Fetched', data?.length || 0, 'donations (with profiles)');
        return data || [];
    } catch (e) {
        console.warn('[iDonate:Donations] Enriched query failed, trying simple query:', e.message);
        // Fallback: simple query without joins
        const { data, error } = await supabase
            .from('donations')
            .select('*')
            .eq('institution_id', institutionId)
            .order('scheduled_date', { ascending: false });

        if (error) throw new Error(error.message);
        console.log('[iDonate:Donations] Fetched', data?.length || 0, 'donations (simple)');
        return data || [];
    }
};

/** Update a donation status (confirm, complete, cancel, no_show) */
export const updateDonationStatus = async (donationId, status, unitsDonated) => {
    const isCompleting = status === 'completed';
    const payload = { status };
    
    // If institution is marking as completed, set the confirmation flag
    if (isCompleting) {
        payload.institution_confirmed = true;
    }

    if (unitsDonated !== undefined) payload.units_donated = unitsDonated;

    // First update the flags/status
    const { data: updatedDonation, error } = await supabase
        .from('donations')
        .update(payload)
        .eq('id', donationId)
        .select(`
            *,
            blood_requests (
                request_type
            )
        `)
        .single();

    if (error) throw new Error(error.message);

    // Completion logic from completed.md:
    // 1. Institutional Requests: completed when institution confirms.
    // 2. Individual Requests: completed when BOTH donor and recipient confirm.
    
    const requestType = updatedDonation.blood_requests?.request_type || 'individual';
    
    if (requestType === 'institution') {
        // Institutional requests complete as soon as institution confirms
        if (updatedDonation.institution_confirmed && updatedDonation.status !== 'completed') {
            const { data: final } = await supabase
                .from('donations')
                .update({ status: 'completed' })
                .eq('id', donationId)
                .select()
                .single();
            return final || updatedDonation;
        }
    } else {
        // Individual requests need BOTH donor and recipient (or requester) confirmation
        // Note: For now, we use institution_confirmed as a proxy for the 'requester' if they use the dashboard,
        // but typically individual requests are confirmed via mobile.
        // If both donor and institution/requester confirmed, set to completed.
        if (updatedDonation.donor_confirmed && updatedDonation.institution_confirmed && updatedDonation.status !== 'completed') {
            const { data: final } = await supabase
                .from('donations')
                .update({ status: 'completed' })
                .eq('id', donationId)
                .select()
                .single();
            return final || updatedDonation;
        }
    }

    return updatedDonation;
};

// ─── Request Editing & Donor Tracking ───────────────────────────────

/** Update a blood request (units, urgency, description) */
export const updateBloodRequest = async (requestId, updates) => {
    const { data, error } = await supabase
        .from('blood_requests')
        .update(updates)
        .eq('id', requestId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

/** Get donors who responded to a specific blood request */
export const getRequestDonors = async (requestId) => {
    const { data, error } = await supabase
        .from('donations')
        .select(`
            *,
            profiles:donor_id (
                full_name,
                phone_number,
                avatar_url
            )
        `)
        .eq('blood_request_id', requestId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

// ─── Activity & Profile ─────────────────────────────────────────────

/** Get recent donation activity for an institution */
export const getRecentActivity = async (institutionId, limit = 20) => {
    console.log('[iDonate:Activity] Fetching activity for', institutionId);
    try {
        const { data, error } = await supabase
            .from('donations')
            .select(`
                *,
                profiles:donor_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('institution_id', institutionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        console.log('[iDonate:Activity]', data?.length || 0, 'activities');
        return data || [];
    } catch (e) {
        console.warn('[iDonate:Activity] Query failed:', e.message);
        return [];
    }
};

/** Update institution profile */
export const updateInstitutionProfile = async (institutionId, updates) => {
    // Map form field names to database column names
    const dbPayload = {};
    if (updates.institution_name !== undefined) dbPayload.institution_name = updates.institution_name;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.website !== undefined) dbPayload.website = updates.website;
    if (updates.address !== undefined) dbPayload.address = updates.address;

    const { data, error } = await supabase
        .from('institutions')
        .update(dbPayload)
        .eq('id', institutionId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

