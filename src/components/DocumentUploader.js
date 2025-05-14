import { useState } from 'react';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { uploadInstitutionDocument } from '../services/storageService';

const DocumentUploader = ({ onUpload, onRemove, existingDocument }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setSelectedFile(file);
        try {
          const url = await uploadInstitutionDocument(file);
          onUpload({
            name: file.name,
            type: file.type,
            url: url
          });
        } catch (error) {
          console.error('Upload error:', error);
          alert('Failed to upload document. Please try again.');
        }
      } else {
        alert('Please upload a PDF or image file');
      }
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700">
        Accreditation Document
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500"
            >
              <span>Upload a file</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".pdf,image/*"
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">PDF or image up to 10MB</p>
        </div>
      </div>

      {existingDocument && (
        <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-md">
          <div className="flex items-center">
            <DocumentIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {existingDocument.name}
              </p>
              <p className="text-xs text-gray-500">
                {existingDocument.type}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader; 