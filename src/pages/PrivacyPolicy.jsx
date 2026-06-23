import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
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
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to iDonate! Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
            <p className="text-gray-700">
              iDonate is a digital blood coordination and emergency response platform that connects donors, recipients, hospitals, and blood banks. We are committed to protecting your personal information and your right to privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Full Name</li>
              <li>Email Address</li>
              <li>Phone Number</li>
              <li>Blood Type</li>
              <li>Genotype (optional)</li>
              <li>Date of Birth</li>
              <li>Address (optional)</li>
              <li>Weight (optional)</li>
              <li>Profile Photo (optional)</li>
            </ul>
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Usage Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Donation History</li>
              <li>Request History</li>
              <li>Location Data (for matching nearby donors/institutions)</li>
              <li>Device Information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>To manage your account</li>
              <li>To match donors with recipients</li>
              <li>To coordinate blood requests and donations</li>
              <li>To send notifications about urgent blood needs</li>
              <li>To improve our platform</li>
              <li>To ensure platform security and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Location Data</h2>
            <p className="text-gray-700">
              Location data is used to match nearby donors and institutions. Your exact location is not publicly displayed. We use approximate distance calculations to facilitate matches.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your data. Your information may be shared in the following cases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>With institutions/hospitals for coordination purposes</li>
              <li>With matched donors/recipients (if you're not donating anonymously</li>
              <li>With administrators for moderation and support</li>
              <li>When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Security Measures</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Secure authentication</li>
              <li>Encrypted data transmission</li>
              <li>Role-based access control</li>
              <li>Secure cloud infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. User Rights</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Update your personal information</li>
              <li>Request deletion of your account</li>
              <li>Manage your privacy settings</li>
              <li>Control notification preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Anonymous Donations</h2>
            <p className="text-gray-700">
              Users may choose to donate anonymously. When anonymous, your identity is hidden from recipients and other users, but remains visible to platform administrators for safety, moderation, and accountability purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-700">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. If you delete your account, we will remove your personal information while retaining necessary records for audit and security purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Information</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy, please contact us at: support@idonate.com
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

export default PrivacyPolicy;
