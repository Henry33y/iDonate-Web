import React from 'react';

const InstitutionUnderReview = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-red-600">
            <h3 className="text-center text-2xl font-bold text-white">Application Under Review</h3>
          </div>
          <div className="px-6 py-8">
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Thank you for your patience</h4>
              <p className="text-gray-600 mb-4">
                Your institution's application is currently under review by our team.
                We will notify you via email once your application has been processed.
                This process typically takes 2-3 business days.
              </p>
              <p className="text-gray-600 mb-6">
                If you have any questions or need to update your application,
                please contact our support team at support@idonate.com
              </p>
              <p className="text-sm text-gray-500">
                You will be automatically redirected to your dashboard once your application is approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionUnderReview; 