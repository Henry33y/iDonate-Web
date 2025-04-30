import React, { useState, useEffect } from 'react';
import { getPendingInstitutions, updateInstitutionStatus } from '../services/firestoreService';
import { logoutAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPendingInstitutions();
  }, []);

  const fetchPendingInstitutions = async () => {
    try {
      const pendingInstitutions = await getPendingInstitutions();
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
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
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
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
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
                        onClick={() => handleStatusUpdate(institution.id, 'approved')}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(institution.id, 'rejected')}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 