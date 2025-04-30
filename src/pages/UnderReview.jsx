import { ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const UnderReview = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <ClockIcon className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Account Under Review
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for registering with iDonate. Your institution account is currently under review.
            We will notify you via email once your account has been approved.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-6 w-6 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
                Check your email for updates on your account status
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>This process typically takes 1-2 business days.</p>
            <p className="mt-2">
              If you have any questions, please contact us at{' '}
              <a href="mailto:support@idonate.com" className="text-red-600 hover:text-red-500">
                support@idonate.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderReview; 