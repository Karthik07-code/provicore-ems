import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Leaves from './pages/Leaves';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import Analytics from './pages/Analytics';

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />

                {/* Admin-only */}
                <Route path="/employees" element={
                  <RoleRoute roles={['Admin']}><Employees /></RoleRoute>
                } />

                {/* Manager: team view (reuses Employees with scoped data) */}
                <Route path="/team" element={
                  <RoleRoute roles={['Manager']}><Employees /></RoleRoute>
                } />

                {/* Admin: all leaves */}
                <Route path="/leaves" element={
                  <RoleRoute roles={['Admin']}><Leaves /></RoleRoute>
                } />

                {/* Manager: leave requests view */}
                <Route path="/leave-requests" element={
                  <RoleRoute roles={['Manager']}><Leaves /></RoleRoute>
                } />

                {/* Employee: my leaves */}
                <Route path="/my-leaves" element={
                  <RoleRoute roles={['Employee']}><Leaves /></RoleRoute>
                } />

                {/* Admin + Manager: all tasks */}
                <Route path="/tasks" element={
                  <RoleRoute roles={['Admin', 'Manager']}><Tasks /></RoleRoute>
                } />

                {/* Employee: my tasks */}
                <Route path="/my-tasks" element={
                  <RoleRoute roles={['Employee']}><Tasks /></RoleRoute>
                } />

                {/* Attendance: Admin + Employee */}
                <Route path="/attendance" element={
                  <RoleRoute roles={['Admin', 'Employee']}><Attendance /></RoleRoute>
                } />

                {/* Analytics: Admin */}
                <Route path="/analytics" element={
                  <RoleRoute roles={['Admin']}><Analytics /></RoleRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
