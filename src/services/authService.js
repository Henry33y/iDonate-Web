import { supabase } from '../config/supabase';
import { getInstitutionProfile, getAdminProfile } from './supabaseService';

export const registerInstitution = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: 'institution',
          full_name: email, // Will be updated with institution name
        },
      },
    });
    if (error) throw error;
    return data.user;
  } catch (error) {
    throw error;
  }
};

export const loginInstitution = async (credentials) => {
  try {
    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) throw authError;

    // Step 2: Get institution profile from Supabase
    const institutionProfile = await getInstitutionProfile(authData.user.id);

    if (!institutionProfile) {
      throw new Error('Institution profile not found');
    }

    // Step 3: Get session token
    const { data: { session } } = await supabase.auth.getSession();

    // Store the institution data in localStorage
    localStorage.setItem('institutionToken', session?.access_token || '');
    localStorage.setItem('institutionData', JSON.stringify(institutionProfile));

    return {
      institution: institutionProfile,
      token: session?.access_token,
    };
  } catch (error) {
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password');
    } else if (error.status === 429) {
      throw new Error('Too many failed attempts. Please try again later');
    } else {
      throw new Error(error.message || 'Login failed. Please try again');
    }
  }
};

export const getCurrentInstitution = () => {
  const institutionData = localStorage.getItem('institutionData');
  return institutionData ? JSON.parse(institutionData) : null;
};

export const isInstitutionAuthenticated = () => {
  return !!localStorage.getItem('institutionToken');
};

export const logoutInstitution = async () => {
  localStorage.removeItem('institutionToken');
  localStorage.removeItem('institutionData');
  await supabase.auth.signOut();
};

export const loginAdmin = async (credentials) => {
  try {
    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) throw authError;

    // Step 2: Get admin profile from Supabase
    const adminProfile = await getAdminProfile(authData.user.id);

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // Step 3: Get session token
    const { data: { session } } = await supabase.auth.getSession();

    // Store the admin data in localStorage
    localStorage.setItem('adminToken', session?.access_token || '');
    localStorage.setItem('adminData', JSON.stringify(adminProfile));

    return {
      admin: adminProfile,
      token: session?.access_token,
    };
  } catch (error) {
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password');
    } else if (error.status === 429) {
      throw new Error('Too many failed attempts. Please try again later');
    } else {
      throw new Error(error.message || 'Login failed. Please try again');
    }
  }
};

export const getCurrentAdmin = () => {
  const adminData = localStorage.getItem('adminData');
  return adminData ? JSON.parse(adminData) : null;
};

export const isAdminAuthenticated = () => {
  return !!localStorage.getItem('adminToken');
};

export const logoutAdmin = async () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  await supabase.auth.signOut();
};