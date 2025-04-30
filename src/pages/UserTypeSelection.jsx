import { Link } from 'react-router-dom';
import { UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const UserTypeSelection = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Path
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select how you'd like to join the iDonate community
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {/* Individual User Card */}
          <Link
            to="/download-app"
            className="relative bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-100 text-red-600 mb-4">
                <UserIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Individual User</h3>
              <p className="mt-2 text-sm text-gray-500">
                Join as a blood donor or recipient. Download our mobile app to get started.
              </p>
              <div className="mt-4">
                <span className="text-red-600 font-medium">Get Started →</span>
              </div>
            </div>
          </Link>

          {/* Health Institution Card */}
          <Link
            to="/register/institution"
            className="relative bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-100 text-red-600 mb-4">
                <BuildingOfficeIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Health Institution</h3>
              <p className="mt-2 text-sm text-gray-500">
                Register your hospital, clinic, or blood bank to manage blood donations.
              </p>
              <div className="mt-4">
                <span className="text-red-600 font-medium">Register Now →</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection; 