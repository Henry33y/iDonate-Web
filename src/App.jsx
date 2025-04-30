import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import UserTypeSelection from './pages/UserTypeSelection';
import MobileAppDownload from './pages/MobileAppDownload';
import InstitutionRegistration from './pages/InstitutionRegistration';
import InstitutionLogin from './pages/InstitutionLogin';
import UnderReview from './pages/UnderReview';
import PrivateRoute from './components/PrivateRoute';
import ProtectedRoute from './components/ProtectedRoute';
import InstitutionUnderReview from './pages/InstitutionUnderReview';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/institution/login" element={<InstitutionLogin />} />
            <Route path="/institution/under-review" element={<InstitutionUnderReview />} />
            <Route path="/user-type" element={<UserTypeSelection />} />
            <Route path="/download-app" element={<MobileAppDownload />} />
            <Route path="/register/institution" element={<InstitutionRegistration />} />
            <Route path="/under-review" element={<UnderReview />} />
            <Route
              path="/institution/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
