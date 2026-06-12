import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ChatPage from './pages/ChatPage';
import GroupChatPage from './pages/GroupChatPage';
import FriendsPage from './pages/FriendsPage';
import FeedPage from './pages/FeedPage';
import QRScannerPage from './pages/QRScannerPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import GoogleCallback from './pages/GoogleCallback';
import { CallProvider } from './context/CallContext';
import CallHistoryPage from './pages/CallHistoryPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/google-callback" element={<GoogleCallback />} />

            {/* Protected Routes Wrapper */}
            <Route element={<ProtectedRoute />}>
              <Route path="/chats" element={<ChatPage />} />
              <Route path="/groups" element={<GroupChatPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/moments" element={<FeedPage />} />
              <Route path="/scanner" element={<QRScannerPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/calls" element={<CallHistoryPage />} />
              
              <Route path="*" element={<Navigate to="/chats" replace />} />
            </Route>

            {/* Default Redirect to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
