const API_KEY = '433137493123127';
const API_SECRET = 'K6Un_7NJfRxqV_Ajv2kMIqoSc6U';
const CLOUD_NAME = 'duxfrljyz';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

export const uploadInstitutionDocument = async (file) => {
  try {
    const timestamp = Math.round((new Date).getTime()/1000);
    const folder = 'idonate/institutions';
    const signature = await generateSignature(timestamp, folder);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(`${CLOUDINARY_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary upload error details:', errorData);
      throw new Error('Upload failed: ' + (errorData.error?.message || 'Unknown error'));
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const deleteInstitutionDocument = async (publicId) => {
  try {
    const timestamp = Math.round((new Date).getTime()/1000);
    const signature = await generateSignature(timestamp, null, publicId);

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const response = await fetch(`${CLOUDINARY_URL}/destroy`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary delete error details:', errorData);
      throw new Error('Delete failed: ' + (errorData.error?.message || 'Unknown error'));
    }

    return await response.json();
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

const generateSignature = async (timestamp, folder = null, publicId = null) => {
  // Create an object with all parameters
  const params = {
    timestamp,
    ...(folder && { folder }),
    ...(publicId && { public_id: publicId })
  };

  // Sort parameters alphabetically and create the string to sign
  const paramsToSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const stringToSign = `${paramsToSign}${API_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}; 