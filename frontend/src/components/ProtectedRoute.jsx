import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import CallOverlay from './CallOverlay';

const ProtectedRoute = () => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-screen h-screen bg-deepBg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-burgundy border-t-transparent animate-spin"></div>
          <p className="text-neutral-500 text-sm">Loading WeChat...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.isVerified === false) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <div className="w-screen h-screen bg-darkBg text-white flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full flex flex-col relative overflow-hidden pb-16 md:pb-0">
        {user?.role === 'guest' && (
          <div className="bg-[#A3E635] text-[#0A0A0A] px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 z-[40] shrink-0 select-none shadow-md">
            <span>Demo Mode: Sign in to access all features.</span>
          </div>
        )}
        <Outlet />
        <CallOverlay />
      </div>
    </div>
  );
};

export default ProtectedRoute;
