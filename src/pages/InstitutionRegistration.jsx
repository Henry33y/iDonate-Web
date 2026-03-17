import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { registerInstitution } from '../services/authService';
import { createInstitutionProfile } from '../services/supabaseService';
import { BuildingOfficeIcon, DocumentIcon, XCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { uploadInstitutionDocument } from '../services/storageService';
import LocationPicker from '../components/LocationPicker';

const schema = yup.object().shape({
  name: yup.string().required('Institution name is required'),
  type: yup.string().required('Institution type is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  region: yup.string().required('Region is required'),
  city: yup.string().required('City is required'),
  website: yup.string().optional(),
  licenseNumber: yup.string().required('License number is required'),
  contactPerson: yup.object().shape({
    name: yup.string().required('Contact person name is required'),
    role: yup.string().required('Contact person role is required'),
  }),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});

const institutionTypes = [
  'Hospital',
  'Clinic',
  'Blood Bank',
  'NGO',
  'Research Center',
  'Other',
];

const regions = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Western North',
  'Oti',
  'Savannah',
  'North East',
];

const InstitutionRegistration = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [location, setLocation] = useState(null); // { latitude, longitude, locationName }
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
  });

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      toast.error('Please upload a PDF or image file');
    }
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      // Register the institution
      const user = await registerInstitution(data.email, data.password);

      // Upload document if selected
      let documentUrl = null;
      if (selectedFile) {
        documentUrl = await uploadInstitutionDocument(selectedFile, user.id);
      }

      // Create institution profile (include location from picker)
      await createInstitutionProfile(user.id, {
        ...data,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        documents: documentUrl ? {
          license: {
            name: selectedFile.name,
            type: selectedFile.type,
            url: documentUrl
          }
        } : null
      });

      toast.success('Registration successful! Please wait for admin approval.');
      navigate('/institution/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-red-600" />
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
              Register Your Institution
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join iDonate's network of healthcare institutions
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Institution Details */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Institution Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Institution Type
                </label>
                <select
                  {...register('type')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                >
                  <option value="">Select type</option>
                  {institutionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Region
                </label>
                <select
                  {...register('region')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                >
                  <option value="">Select region</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {errors.region && (
                  <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
            </div>

            {/* Location Picker — GPS or Map */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution Location
              </label>
              <LocationPicker onChange={setLocation} />
            </div>

            {/* Website & License Number */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  {...register('website')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  License Number
                </label>
                <input
                  type="text"
                  {...register('licenseNumber')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.licenseNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.licenseNumber.message}</p>
                )}
              </div>
            </div>

            {/* Contact Person */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  {...register('contactPerson.name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.contactPerson?.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contactPerson.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Person Role
                </label>
                <input
                  type="text"
                  {...register('contactPerson.role')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.contactPerson?.role && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contactPerson.role.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  {...register('password')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white text-gray-900"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Accreditation Document
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors duration-200 ${isDragging
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
              >
                {selectedFile ? (
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-8 w-8 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <ArrowUpTrayIcon className={`mx-auto h-12 w-12 transition-colors duration-200 ${isDragging ? 'text-red-500' : 'text-gray-400'}`} />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500 px-4 py-2 border border-gray-300"
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
                      <p className="pl-1 self-center">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF or image files up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!isValid || isLoading || !selectedFile}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Register Institution'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InstitutionRegistration; 