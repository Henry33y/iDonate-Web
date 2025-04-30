import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-red-600">iDonate</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link to="/download-app" className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium">
              Download Mobile App
            </Link>
            <Link to="/institution/login" className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium">
              Institution Login
            </Link>
            <Link to="/user-type" className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-white hover:text-red-600 hover:border-2 hover:border-red-600 transition-all duration-200">
              Join Us
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-red-600 focus:outline-none bg-white"
            >
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              to="/download-app"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
            >
              Download Mobile App
            </Link>
            <Link
              to="/institution/login"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
            >
              Institution Login
            </Link>
            <Link
              to="/user-type"
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Join Us
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 