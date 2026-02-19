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
        const { error } = await supabase
            .from('institutions')
            .update({ status })
            .eq('id', institutionId);

        if (error) throw error;
    } catch (error) {
        throw new Error(error.message);
    }
};
