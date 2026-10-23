import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import VendorLayout from '../layouts/VendorLayout';
import AdminLayout from '../layouts/AdminLayout';

// Guard
import RoleRoute from './RoleRoute';

// Public Pages
import Home from '../pages/public/Home';
import Categories from '../pages/public/Categories';
import CategoryDetails from '../pages/public/CategoryDetails';
import Professionals from '../pages/public/Professionals';
import ProfessionalProfile from '../pages/public/ProfessionalProfile';
import Jobs from '../pages/public/Jobs';
import JobDetails from '../pages/public/JobDetails';
import HowItWorks from '../pages/public/HowItWorks';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import EmergencyRequest from '../pages/public/EmergencyRequest';
import Terms from '../pages/public/Terms';
import Privacy from '../pages/public/Privacy';
import RefundPolicy from '../pages/public/RefundPolicy';
import ForgotPassword from '../pages/public/ForgotPassword';
import ResetPassword from '../pages/public/ResetPassword';

// Customer Pages
import CustomerDashboard from '../pages/customer/Dashboard';
import CustomerExplore from '../pages/customer/Explore';
import CustomerBookService from '../pages/customer/BookService';
import CustomerCreateJob from '../pages/customer/CreateJob';
import CustomerMyJobs from '../pages/customer/MyJobs';
import CustomerJobApplications from '../pages/customer/JobApplications';
import CustomerRequestTracking from '../pages/customer/RequestTracking';
import CustomerMessages from '../pages/customer/Messages';
import CustomerSaved from '../pages/customer/Saved';
import CustomerAddresses from '../pages/customer/Addresses';
import CustomerNotifications from '../pages/customer/Notifications';
import CustomerProfile from '../pages/customer/Profile';
import CustomerEditProfile from '../pages/customer/EditProfile';
import CustomerBookings from '../pages/customer/Bookings';
import CustomerPayments from '../pages/customer/Payments';
import CustomerReviews from '../pages/customer/Reviews';
import CustomerSupport from '../pages/customer/Support';

// Vendor Pages
import VendorOnboarding from '../pages/vendor/Onboarding';
import VendorDashboard from '../pages/vendor/Dashboard';
import VendorBrowseJobs from '../pages/vendor/BrowseJobs';
import VendorJobDetails from '../pages/vendor/JobDetails';
import VendorActiveJobs from '../pages/vendor/ActiveJobs';
import VendorManageJob from '../pages/vendor/ManageJob';
import VendorServices from '../pages/vendor/Services';
import VendorNewService from '../pages/vendor/NewService';
import VendorAvailability from '../pages/vendor/Availability';
import VendorCalendar from '../pages/vendor/Calendar';
import VendorEarnings from '../pages/vendor/Earnings';
import VendorTransactions from '../pages/vendor/Transactions';
import VendorReviews from '../pages/vendor/Reviews';
import VendorVerification from '../pages/vendor/Verification';
import VendorMessages from '../pages/vendor/Messages';
import VendorJobResponses from '../pages/vendor/JobResponses';
import VendorBookings from '../pages/vendor/Bookings';
import VendorNotifications from '../pages/vendor/Notifications';
import VendorProfile from '../pages/vendor/Profile';
import VendorSettings from '../pages/vendor/Settings';
import VendorSupport from '../pages/vendor/Support';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminVendors from '../pages/admin/Vendors';
import AdminUsers from '../pages/admin/Users';
import AdminCategories from '../pages/admin/Categories';
import AdminAreas from '../pages/admin/Areas';
import AdminJobs from '../pages/admin/Jobs';
import AdminAnalytics from '../pages/admin/Analytics';
import AdminLogs from '../pages/admin/Logs';
import AdminPayments from '../pages/admin/Payments';
import AdminDisputes from '../pages/admin/Disputes';
import AdminNotifications from '../pages/admin/Notifications';
import AdminSettings from '../pages/admin/Settings';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:slug" element={<CategoryDetails />} />
        <Route path="/services" element={<Categories />} />
        <Route path="/professionals" element={<Professionals />} />
        <Route path="/professionals/:id" element={<ProfessionalProfile />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/emergency" element={<EmergencyRequest />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book" element={<CustomerBookService />} />
      </Route>

      {/* Customer Portal */}
      <Route element={<RoleRoute allowedRoles={['customer', 'admin']} />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="explore" element={<CustomerExplore />} />
          <Route path="book" element={<CustomerBookService />} />
          <Route path="emergency" element={<EmergencyRequest />} />
          <Route path="create-job" element={<CustomerCreateJob />} />
          <Route path="jobs/create" element={<CustomerCreateJob />} />
          <Route path="my-jobs" element={<CustomerMyJobs />} />
          <Route path="applications" element={<CustomerJobApplications />} />
          <Route path="tracking" element={<CustomerRequestTracking />} />
          <Route path="messages" element={<CustomerMessages />} />
          <Route path="saved" element={<CustomerSaved />} />
          <Route path="addresses" element={<CustomerAddresses />} />
          <Route path="bookings" element={<CustomerBookings />} />
          <Route path="payments" element={<CustomerPayments />} />
          <Route path="reviews" element={<CustomerReviews />} />
          <Route path="support" element={<CustomerSupport />} />
          <Route path="notifications" element={<CustomerNotifications />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="edit-profile" element={<CustomerEditProfile />} />
        </Route>
      </Route>

      {/* Vendor Portal */}
      <Route element={<RoleRoute allowedRoles={['vendor', 'admin']} />}>
        <Route path="/vendor" element={<VendorLayout />}>
          <Route index element={<Navigate to="/vendor/dashboard" replace />} />
          <Route path="onboarding" element={<VendorOnboarding />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="browse-jobs" element={<VendorBrowseJobs />} />
          <Route path="nearby-jobs" element={<VendorBrowseJobs />} />
          <Route path="jobs/:id" element={<VendorJobDetails />} />
          <Route path="active-jobs" element={<VendorActiveJobs />} />
          <Route path="manage-job/:id" element={<VendorManageJob />} />
          <Route path="responses" element={<VendorJobResponses />} />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="services" element={<VendorServices />} />
          <Route path="services/new" element={<VendorNewService />} />
          <Route path="availability" element={<VendorAvailability />} />
          <Route path="calendar" element={<VendorCalendar />} />
          <Route path="earnings" element={<VendorEarnings />} />
          <Route path="transactions" element={<VendorTransactions />} />
          <Route path="reviews" element={<VendorReviews />} />
          <Route path="verification" element={<VendorVerification />} />
          <Route path="messages" element={<VendorMessages />} />
          <Route path="notifications" element={<VendorNotifications />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="settings" element={<VendorSettings />} />
          <Route path="support" element={<VendorSupport />} />
        </Route>
      </Route>

      {/* Admin Portal */}
      <Route element={<RoleRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="areas" element={<AdminAreas />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="logs" element={<AdminLogs />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
