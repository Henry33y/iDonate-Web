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
        const { error } = await supabase
            .from('institutions')
            .update({ status, verified })
            .eq('id', institutionId);

        if (error) throw error;
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

/** Delete a blood request */
export const deleteBloodRequest = async (requestId) => {
    const { error } = await supabase
        .from('blood_requests')
        .delete()
        .eq('id', requestId);

    if (error) throw new Error(error.message);
};

/** Get dashboard stats for an institution */
export const getInstitutionStats = async (institutionId) => {
    const [requests, donations] = await Promise.all([
        getInstitutionRequests(institutionId),
        getInstitutionDonations(institutionId),
    ]);

    const activeRequests = requests.filter(r => r.status === 'pending').length;
    const fulfilledRequests = requests.filter(r => r.status === 'fulfilled').length;
    const totalRequests = requests.length;

    const upcomingDonations = donations.filter(d => d.status === 'scheduled' || d.status === 'confirmed').length;
    const completedDonations = donations.filter(d => d.status === 'completed').length;
    const uniqueDonors = new Set(donations.map(d => d.donor_id)).size;

    return { activeRequests, fulfilledRequests, totalRequests, upcomingDonations, completedDonations, uniqueDonors };
};

// ─── Donation Functions ─────────────────────────────────────────────

/** Fetch all donations for an institution (with donor profiles) */
export const getInstitutionDonations = async (institutionId) => {
    const { data, error } = await supabase
        .from('donations')
        .select(`
            *,
            donors:donor_id (
                blood_type
            ),
            profiles:donor_id (
                full_name,
                phone_number,
                avatar_url
            ),
            blood_requests:blood_request_id (
                blood_type_needed,
                urgency_level
            )
        `)
        .eq('institution_id', institutionId)
        .order('scheduled_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

/** Update a donation status (confirm, complete, cancel, no_show) */
export const updateDonationStatus = async (donationId, status, unitsDonated) => {
    const payload = { status };
    if (unitsDonated !== undefined) payload.units_donated = unitsDonated;

    const { data, error } = await supabase
        .from('donations')
        .update(payload)
        .eq('id', donationId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
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

    if (error) throw new Error(error.message);
    return data || [];
};

/** Update institution profile */
export const updateInstitutionProfile = async (institutionId, updates) => {
    const { data, error } = await supabase
        .from('institutions')
        .update(updates)
        .eq('id', institutionId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};
