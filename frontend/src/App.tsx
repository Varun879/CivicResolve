import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CitizenLayout from './components/CitizenLayout';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import ReportIssue from './pages/ReportIssue';
import ComplaintDetail from './pages/ComplaintDetail';
import Login from './pages/Login';
import DeptHeadDashboard from './pages/DeptHeadDashboard';
import CommissionerDashboard from './pages/CommissionerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard from './pages/Leaderboard';
import NearbyIssues from './pages/NearbyIssues';
import { useAuth } from './context/AuthContext';

/** Normalize Spring Security's ROLE_ prefix into the bare role name */
function normalizeRole(role?: string): string {
  if (!role) return '';
  return role.replace(/^ROLE_/, '');
}

function App() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Citizen Routes */}
        <Route path="/citizen" element={
          role === 'CITIZEN' ? <CitizenLayout /> : <Navigate to="/login" />
        }>
          <Route path="dashboard" element={<CitizenDashboard />} />
          <Route path="report" element={<ReportIssue />} />
          <Route path="complaint/:id" element={<ComplaintDetail />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="map" element={<NearbyIssues />} />
        </Route>

        {/* Protected Officer Routes */}
        <Route path="/officer/dashboard" element={
          role === 'FIELD_OFFICER' ? <OfficerDashboard /> : <Navigate to="/login" />
        } />
        <Route path="/officer/complaint/:id" element={
          role === 'FIELD_OFFICER' ? <ComplaintDetail /> : <Navigate to="/login" />
        } />

        {/* Higher-Level Dashboards */}
        <Route path="/depthead/dashboard" element={
          role === 'DEPT_HEAD' ? <DeptHeadDashboard /> : <Navigate to="/login" />
        } />
        <Route path="/commissioner/dashboard" element={
          role === 'COMMISSIONER' ? <CommissionerDashboard /> : <Navigate to="/login" />
        } />
        <Route path="/admin/dashboard" element={
          role === 'SUPER_ADMIN' ? <AdminDashboard /> : <Navigate to="/login" />
        } />

        {/* Universal Complaint Detail View from Map */}
        <Route path="/complaint/:id" element={
          role ? <ComplaintDetail /> : <Navigate to="/login" />
        } />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
