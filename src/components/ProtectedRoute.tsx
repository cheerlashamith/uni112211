import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ROLE_TO_PATH: Record<string, string> = {
  'student': 'student',
  'volunteer': 'volunteer',
  'coordinator': 'eventcoordinator',
  'head_coordinator': 'headcoordinator',
  'evaluator': 'evaluator',
  'super_admin': 'superadmin',
  'institution': 'student',
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser.isDemo && currentUser.profileCompleted === false && currentUser.role === 'student') {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentUser.role)) {
      const redirectPath = ROLE_TO_PATH[currentUser.role] || 'student';
      return <Navigate to={`/dashboard/${redirectPath}`} replace />;
    }
  }

  return <>{children}</>;
}
