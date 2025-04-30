import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';
import { getInstitutionProfile, getAdminProfile } from './firestoreService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const registerInstitution = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Preserve the original Firebase error object
    throw error;
  }
};

export const loginInstitution = async (credentials) => {
  try {
    // Step 1: Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // Step 2: Get institution profile from Firestore
    const institutionProfile = await getInstitutionProfile(userCredential.user.uid);

    if (!institutionProfile) {
      throw new Error('Institution profile not found');
    }

    // Store the institution data in localStorage
    localStorage.setItem('institutionToken', userCredential.user.accessToken);
    localStorage.setItem('institutionData', JSON.stringify(institutionProfile));

    return {
      institution: institutionProfile,
      token: userCredential.user.accessToken
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
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

export const logoutInstitution = () => {
  localStorage.removeItem('institutionToken');
  localStorage.removeItem('institutionData');
};

export const loginAdmin = async (credentials) => {
  try {
    // Step 1: Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // Step 2: Get admin profile from Firestore
    const adminProfile = await getAdminProfile(userCredential.user.uid);

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // Store the admin data in localStorage
    localStorage.setItem('adminToken', userCredential.user.accessToken);
    localStorage.setItem('adminData', JSON.stringify(adminProfile));

    return {
      admin: adminProfile,
      token: userCredential.user.accessToken
    };
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
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

export const logoutAdmin = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
}; 