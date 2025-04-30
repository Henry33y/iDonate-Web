import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  ArrowDownTrayIcon,
  UserPlusIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: 'What is iDonate?',
      answer: 'iDonate is a platform that connects blood donors with those in need, making the process of blood donation more accessible and efficient.'
    },
    {
      question: 'How does it work?',
      answer: 'Institutions can post blood requests, and donors can view and respond to these requests through our platform. We ensure a seamless connection between donors and recipients.'
    },
    {
      question: 'Is it safe to donate blood?',
      answer: 'Yes, blood donation is a safe process. All our partner institutions follow strict safety protocols and guidelines to ensure the well-being of both donors and recipients.'
    }
  ];

  const testimonials = [
    {
      name: 'John Doe',
      role: 'Blood Donor',
      content: 'iDonate made it so easy to find where my blood type was needed. The process was smooth and the staff was very professional.'
    },
    {
      name: 'Jane Smith',
      role: 'Hospital Administrator',
      content: 'This platform has revolutionized how we manage blood donations. We can now efficiently match donors with patients in need.'
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-red-600">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Blood donation"
          />
          <div className="absolute inset-0 bg-red-600 mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Save Lives Through Blood Donation
          </h1>
          <p className="mt-6 text-xl text-red-100 max-w-3xl">
            Join our mission to connect blood donors with those in need. Together, we can make a difference in people's lives.
          </p>
          <div className="mt-10">
            <Link
              to="/user-type"
              className="inline-block bg-white py-3 px-8 border border-transparent rounded-md text-base font-medium text-red-600 hover:bg-red-50"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Pathways Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Individuals Box */}
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
              <div className="flex justify-center mb-6">
                <UserIcon className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Find Help or Give Hope — Instantly</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <HeartIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Find nearby blood donation centers</span>
                </li>
                <li className="flex items-center">
                  <UserPlusIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Quick and easy registration</span>
                </li>
                <li className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Track your donation history</span>
                </li>
              </ul>
              <div className="text-center">
                <Link
                  to="/download"
                  className="inline-block bg-red-600 text-white hover:text-red px-6 py-3 rounded-md text-sm font-medium hover:bg-white-700 hover:border-2 hover:border-red-600 transition-all duration-200"
                >
                  Get the App
                </Link>
              </div>
            </div>

            {/* Institutions Box */}
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
              <div className="flex justify-center mb-6">
                <BuildingOfficeIcon className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Modernize Your Blood Supply Chain</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Efficient blood request management</span>
                </li>
                <li className="flex items-center">
                  <UsersIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Connect with verified donors</span>
                </li>
                <li className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span>Real-time inventory tracking</span>
                </li>
              </ul>
              <div className="text-center">
                <Link
                  to="/register"
                  className="inline-block bg-red-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Register Your Institution
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Simple. Secure. Life-Changing.
          </h2>
          
          {/* Individuals Steps */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">For Individuals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <ArrowDownTrayIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Download the App</h4>
                <p className="text-gray-600">Get started by downloading our mobile application</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <UserPlusIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Sign Up</h4>
                <p className="text-gray-600">Create your account and complete your profile</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <HeartIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Donate/Request</h4>
                <p className="text-gray-600">Start donating blood or request when in need</p>
              </div>
            </div>
          </div>

          {/* Institutions Steps */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">For Institutions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <BuildingOfficeIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Register</h4>
                <p className="text-gray-600">Register your hospital, clinic or blood bank on our platform</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <ClipboardDocumentListIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Manage Requests</h4>
                <p className="text-gray-600">Create and manage blood requests efficiently</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <UserGroupIcon className="h-12 w-12 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Connect</h4>
                <p className="text-gray-600">Connect with donors and manage donations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* App Preview Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Experience iDonate in Action
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src="https://via.placeholder.com/300x600"
                  alt="Mobile App Preview"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
            <div className="flex items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Web Dashboard Preview</h3>
                <p className="text-gray-600 mb-6">
                  Our intuitive dashboard provides hospitals, clinics, and blood banks with powerful tools to manage their blood supply chain efficiently.
                </p>
                <img
                  src="https://via.placeholder.com/600x400"
                  alt="Dashboard Preview"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                <p className="text-gray-600 mb-4">{testimonial.content}</p>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={`https://ui-avatars.com/api/?name=${testimonial.name}&background=random`}
                      alt={testimonial.name}
                    />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div key={index} className="mb-4">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-500 transform transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="p-4 bg-white rounded-lg mt-1">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-16 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Join Ghana's Life-Saving Network Today
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Be part of a community that's making a real difference in people's lives.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/download"
              className="inline-block bg-white text-red-600 px-8 py-3 rounded-md text-lg font-medium hover:bg-red-50"
            >
              Download App
            </Link>
            <Link
              to="/register"
              className="inline-block bg-transparent text-white border-2 border-white px-8 py-3 rounded-md text-lg font-medium hover:bg-white hover:text-red-600"
            >
              Register as Institution
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <img
              src="https://via.placeholder.com/150x50"
              alt="App Store"
              className="h-12"
            />
            <img
              src="https://via.placeholder.com/150x50"
              alt="Google Play"
              className="h-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 