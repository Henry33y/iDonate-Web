import React, { useState, useEffect } from 'react';
import { getPendingInstitutions, updateInstitutionStatus } from '../services/firestoreService';
import { logoutAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { BuildingOfficeIcon, DocumentIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { supabase } from '../config/supabase';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  useEffect(() => {
    fetchPendingInstitutions();
  }, []);

  const fetchPendingInstitutions = async () => {
    try {
      const pendingInstitutions = await getPendingInstitutions();
      console.log('Fetched pending institutions:', pendingInstitutions.length);
      setInstitutions(pendingInstitutions);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (institutionId, status) => {
    try {
      await updateInstitutionStatus(institutionId, status);
      await fetchPendingInstitutions();
      setSelectedInstitution(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const handleDownloadDocument = async (url, filename) => {
    try {
      // Extract the file path from the URL
      const filePath = url.split('/').pop();
      const fullPath = `institutions/${filePath}`;

      console.log('Downloading file:', { fullPath, filename });

      // Download the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('idonate')
        .download(fullPath);

      if (error) {
        console.error('Download error:', error);
        throw new Error(`Download failed: ${error.message}`);
      }

      // Create a blob from the downloaded data
      const blob = new Blob([data], { type: 'application/pdf' });
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      
      // Add to document, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('Download successful:', {
        filename,
        size: blob.size,
        type: blob.type
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      setError(`Failed to download document: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {institutions.length === 0 ? (
              <li className="px-4 py-4">
                <p className="text-gray-500 text-center">No pending institutions</p>
              </li>
            ) : (
              institutions.map((institution) => (
                <li key={institution.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{institution.name}</h3>
                      <p className="text-sm text-gray-500">{institution.email}</p>
                      <p className="text-sm text-gray-500">{institution.phone}</p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSelectedInstitution(institution)}
                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>

      {/* Institution Details Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-red-600 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">{selectedInstitution.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedInstitution(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Institution Details</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedInstitution.type || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedInstitution.email || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedInstitution.phone || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedInstitution.location ? 
                          `${selectedInstitution.location.city || ''}, ${selectedInstitution.location.region || ''}` :
                          'Location not specified'
                        }
                      </dd>
                    </div>
                    {selectedInstitution.website && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Website</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a
                            href={selectedInstitution.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-500"
                          >
                            {selectedInstitution.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedInstitution.contactPerson ? 
                          `${selectedInstitution.contactPerson.name || ''} (${selectedInstitution.contactPerson.role || ''})` :
                          'Not specified'
                        }
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Accreditation Document</h3>
                  {selectedInstitution.documents?.license ? (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <DocumentIcon className="h-8 w-8 text-red-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedInstitution.documents.license.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedInstitution.documents.license.type}
                          </p>
                        </div>
                      </div>
                      {/* PDF Preview */}
                      <div className="mb-4">
                        <iframe
                          src={selectedInstitution.documents.license.url}
                          title="PDF Preview"
                          width="100%"
                          height="300px"
                          style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={selectedInstitution.documents.license.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                        >
                          View in New Tab
                        </a>
                        <button
                          onClick={() => handleDownloadDocument(
                            selectedInstitution.documents.license.url,
                            selectedInstitution.documents.license.name
                          )}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                          Download Document
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No document uploaded</p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => handleStatusUpdate(selectedInstitution.id, 'rejected')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedInstitution.id, 'approved')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 