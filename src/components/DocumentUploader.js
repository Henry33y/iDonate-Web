import React, { useState } from 'react';
import { uploadInstitutionDocument } from '../services/cloudinaryService';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const DocumentUploader = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadInstitutionDocument(file);
      onUploadSuccess(result);
    } catch (error) {
      onUploadError(error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        border: '2px dashed #ccc',
        borderRadius: 2,
      }}
    >
      <input
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        id="document-upload"
        type="file"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      <label htmlFor="document-upload">
        <Button
          variant="contained"
          component="span"
          startIcon={<CloudUploadIcon />}
          disabled={isUploading}
        >
          Upload Document
        </Button>
      </label>
      
      {isUploading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress variant="determinate" value={uploadProgress} />
          <Typography variant="body2">
            Uploading... {uploadProgress}%
          </Typography>
        </Box>
      )}
      
      <Typography variant="body2" color="textSecondary">
        Supported formats: PDF, DOC, DOCX
      </Typography>
    </Box>
  );
};

export default DocumentUploader; 