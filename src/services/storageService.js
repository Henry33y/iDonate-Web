import { supabase } from '../config/supabase';

export const uploadInstitutionDocument = async (file, userId) => {
  try {
    console.log('Starting upload process...');
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `institutions/${fileName}`;

    console.log('Uploading file:', {
      fileName,
      filePath,
      fileType: file.type,
      fileSize: file.size
    });

    // Upload the file
    const { data, error: uploadError } = await supabase.storage
      .from('idonate')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('Upload successful, getting public URL...');

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('idonate')
      .getPublicUrl(filePath);

    console.log('Public URL generated:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Storage error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

export const deleteInstitutionDocument = async (url) => {
  try {
    // Extract the file path from the URL
    const filePath = url.split('/').pop();
    
    const { error } = await supabase.storage
      .from('idonate')
      .remove([`institutions/${filePath}`]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}; 