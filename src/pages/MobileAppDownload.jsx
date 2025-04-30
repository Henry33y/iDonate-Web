import { ArrowDownTrayIcon, DevicePhoneMobileIcon, HeartIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const MobileAppDownload = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <DevicePhoneMobileIcon className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Download the iDonate App
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join our community of life-savers with our easy-to-use mobile application
          </p>
        </div>

        {/* Download Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download for Android
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download for iOS
          </a>
        </div>

        {/* App Benefits */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Use the iDonate App?
          </h3>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-100 text-red-600 mb-4">
                <HeartIcon className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Easy Donation</h4>
              <p className="text-gray-600">
                Find nearby blood donation centers and schedule appointments with ease.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-100 text-red-600 mb-4">
                <UserPlusIcon className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Quick Registration</h4>
              <p className="text-gray-600">
                Create your profile in minutes and start making a difference.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-100 text-red-600 mb-4">
                <DevicePhoneMobileIcon className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Real-time Updates</h4>
              <p className="text-gray-600">
                Receive notifications about urgent blood needs in your area.
              </p>
            </div>
          </div>
        </div>

        {/* App Screenshots */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            App Preview
          </h3>
          <div className="flex justify-center">
            <img
              src="https://via.placeholder.com/300x600"
              alt="App Screenshot"
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppDownload; 