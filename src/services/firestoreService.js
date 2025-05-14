import { db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export const createInstitutionProfile = async (userId, institutionData) => {
  try {
    const institutionRef = doc(db, 'institutions', userId);
    await setDoc(institutionRef, {
      ...institutionData,
      userId: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      accountType: 'institution'
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getInstitutionProfile = async (userId) => {
  try {
    const institutionRef = doc(db, 'institutions', userId);
    const docSnap = await getDoc(institutionRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getAdminProfile = async (userId) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    const docSnap = await getDoc(adminRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getPendingInstitutions = async () => {
  try {
    const institutionsRef = collection(db, 'institutions');
    const q = query(institutionsRef, where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw new Error(error.message);
  }
};

export const updateInstitutionStatus = async (institutionId, status) => {
  try {
    const institutionRef = doc(db, 'institutions', institutionId);
    await updateDoc(institutionRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw new Error(error.message);
  }
}; 