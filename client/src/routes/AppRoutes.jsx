import { Routes, Route } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import ContentPage from '../pages/content/ContentPage';
import PermitListPage from '../pages/permits/PermitListPage';
import PermitFormPage from '../pages/permits/PermitFormPage';
import PermitDetailPage from '../pages/permits/PermitDetailPage';
import ReviewsPage from '../pages/reviews/ReviewsPage';
import ReviewFormPage from '../pages/reviews/ReviewFormPage';
import ReviewDetailPage from '../pages/reviews/ReviewDetailPage';
import UpdatesPage from '../pages/updates/UpdatesPage';
import SearchPage from '../pages/search/SearchPage';
import AdminPage from '../pages/admin/AdminPage';

// Work Permit routes (Developer 2) and Review & Approval routes (Developer 3)
// are fully implemented. The remaining feature routes render placeholder
// pages until their owning developer builds them out; all routes share the
// DashboardLayout shell (see App.jsx).
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/content" element={<ContentPage />} />
      <Route path="/permits" element={<PermitListPage />} />
      <Route path="/permits/new" element={<PermitFormPage />} />
      <Route path="/permits/:id" element={<PermitDetailPage />} />
      <Route path="/permits/:id/edit" element={<PermitFormPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/reviews/new" element={<ReviewFormPage />} />
      <Route path="/reviews/:id" element={<ReviewDetailPage />} />
      <Route path="/reviews/:id/edit" element={<ReviewFormPage />} />
      <Route path="/updates" element={<UpdatesPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
}
