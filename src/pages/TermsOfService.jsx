import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-red-600 hover:text-red-700">
            <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 010-1.414L13.414 10l-3.707-3.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By creating an account and using iDonate, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>You must provide accurate information</li>
              <li>You must meet legal age requirements for blood donation in your region</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>You are responsible for maintaining the security of your account</li>
              <li>You are responsible for all activities under your account</li>
              <li>Keep your login credentials secure</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Blood Donation Disclaimer</h2>
            <p className="text-gray-700">
              iDonate is a coordination platform. We do not provide medical advice, diagnosis, or treatment. The platform coordinates blood donation opportunities, but final medical eligibility remains the responsibility of healthcare professionals and institutions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Institution Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Provide valid licenses and certifications</li>
              <li>Maintain accurate and up-to-date information</li>
              <li>Use the platform responsibly and ethically</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Prohibited Activities</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Fraud or misrepresentation</li>
              <li>Impersonation of others</li>
              <li>Harassment or abuse of other users</li>
              <li>Creating false blood requests</li>
              <li>Unauthorized access to accounts or data</li>
              <li>Abuse of donor or recipient information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Suspension & Termination</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Suspend or terminate user accounts</li>
              <li>Reject or remove institutions</li>
              <li>Remove harmful or inappropriate content</li>
            </ul>
            <p className="text-gray-700 mt-4">
              This may be done at our discretion, with or without notice, for violations of these terms or for the safety and well-being of our community.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              iDonate does not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>The availability of specific blood types</li>
              <li>That all donation requests will be fulfilled</li>
              <li>Emergency response times</li>
              <li>The outcomes of any donations</li>
            </ul>
            <p className="text-gray-700 mt-4">
              iDonate is not responsible for medical decisions, outcomes, or any damages arising from the use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Updates to Terms</h2>
            <p className="text-gray-700">
              We may update these Terms of Service from time to time. When we do, we will notify users through the platform or by email. Continued use of the platform after changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
          <p>Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
