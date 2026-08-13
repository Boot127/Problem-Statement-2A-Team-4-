import { Routes, Route } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import ContentPage from '../pages/content/ContentPage';
import RecordFormPage from '../pages/content/RecordFormPage';
import RecordDetailPage from '../pages/content/RecordDetailPage';
import PermitListPage from '../pages/permits/PermitListPage';
import PermitFormPage from '../pages/permits/PermitFormPage';
import PermitDetailPage from '../pages/permits/PermitDetailPage';
import PermitComparePage from '../pages/permits/PermitComparePage';
import PermitGuidePage from '../pages/permits/PermitGuidePage';
import PermitProcessPage from '../pages/permits/PermitProcessPage';
import PermitGroupDetailPage from '../pages/permits/PermitGroupDetailPage';
import PermitReminderCentrePage from '../pages/permits/PermitReminderCentrePage';
import ReviewsPage from '../pages/reviews/ReviewsPage';
import ReviewFormPage from '../pages/reviews/ReviewFormPage';
import ReviewDetailPage from '../pages/reviews/ReviewDetailPage';
import UpdatesPage from '../pages/updates/UpdatesPage';
import SearchPage from '../pages/search/SearchPage';
import AdminPage from '../pages/admin/AdminPage';
import ProfilePage from '../pages/profile/ProfilePage';
import RoleProtectedRoute from './RoleProtectedRoute';

// Work Permit routes (Developer 2) and Review & Approval routes (Developer 3)
// are fully implemented. The remaining feature routes render placeholder
// pages until their owning developer builds them out; all routes share the
// DashboardLayout shell (see App.jsx).
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/content" element={<ContentPage />} />
      <Route path="/content/new" element={<RecordFormPage />} />
      <Route path="/content/:id" element={<RecordDetailPage />} />
      <Route path="/content/:id/edit" element={<RecordFormPage />} />
      <Route path="/permits" element={<PermitListPage />} />
      <Route path="/permits/new" element={<PermitFormPage />} />
      <Route path="/permits/compare" element={<PermitComparePage />} />
      <Route path="/permits/reminders" element={<PermitReminderCentrePage />} />
      <Route path="/permits/groups/:groupId" element={<PermitGroupDetailPage />} />
      <Route path="/permits/:id/guide" element={<PermitGuidePage />} />
      <Route path="/permits/:id/new" element={<PermitProcessPage processType="NEW" />} />
      <Route path="/permits/:id/renewal" element={<PermitProcessPage processType="RENEWAL" />} />
      <Route path="/permits/:id/cancellation" element={<PermitProcessPage processType="CANCELLATION" />} />
      <Route path="/permits/:id" element={<PermitDetailPage />} />
      <Route path="/permits/:id/edit" element={<PermitFormPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/reviews/new" element={<ReviewFormPage />} />
      <Route path="/reviews/:id" element={<ReviewDetailPage />} />
      <Route path="/reviews/:id/edit" element={<ReviewFormPage />} />
      <Route path="/updates" element={<UpdatesPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/admin" element={<RoleProtectedRoute roles={['admin']}><AdminPage /></RoleProtectedRoute>} />
      <Route path="/admin/users" element={<RoleProtectedRoute roles={['admin']}><AdminPage /></RoleProtectedRoute>} />
      <Route path="/admin/archives" element={<RoleProtectedRoute roles={['admin']}><AdminPage /></RoleProtectedRoute>} />
      <Route path="/admin/activity" element={<RoleProtectedRoute roles={['admin']}><AdminPage /></RoleProtectedRoute>} />
      <Route path="/admin/security" element={<RoleProtectedRoute roles={['admin']}><AdminPage /></RoleProtectedRoute>} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
}
