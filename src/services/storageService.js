import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadInstitutionDocument = async (file, userId) => {
  try {
    const storageRef = ref(storage, `uploads/institutions/${userId}/license.pdf`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    throw new Error(error.message);
  }
}; 