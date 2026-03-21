/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import PublicEventPage from './pages/PublicEventPage';
import StudentDashboard from './pages/StudentDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import HeadCoordinatorDashboard from './pages/HeadCoordinatorDashboard';
import EventCoordinatorDashboard from './pages/EventCoordinatorDashboard';
import EvaluatorDashboard from './pages/EvaluatorDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import ProfileCompletionPage from './pages/ProfileCompletionPage';

const ROLE_TO_PATH: Record<string, string> = {
  'student': 'student',
  'volunteer': 'volunteer',
  'coordinator': 'eventcoordinator',
  'head_coordinator': 'headcoordinator',
  'evaluator': 'evaluator',
  'super_admin': 'superadmin',
  'institution': 'student',
};

function DashboardRouter() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'student';
  const path = ROLE_TO_PATH[role] || 'student';
  return <Navigate to={`/dashboard/${path}`} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/event/:id" element={<PublicEventPage />} />

        {/* Profile Completion Route */}
        <Route path="/complete-profile" element={<ProfileCompletionPage />} />

        {/* Dashboard Routes */}
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/superadmin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/headcoordinator"
          element={
            <ProtectedRoute allowedRoles={['head_coordinator']}>
              <HeadCoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/eventcoordinator"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <EventCoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/evaluator"
          element={
            <ProtectedRoute allowedRoles={['evaluator']}>
              <EvaluatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/volunteer"
          element={
            <ProtectedRoute allowedRoles={['volunteer']}>
              <VolunteerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Dashboard redirect */}
        <Route path="/dashboard" element={<DashboardRouter />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
