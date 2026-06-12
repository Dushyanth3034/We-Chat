import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { getAvatarUrl } from '../utils/avatar';
import {
  MessageSquare,
  Users,
  Globe,
  User,
  Settings,
  Bell,
  LogOut,
  ScanLine,
  Phone,
  Menu,
  X,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const fetchNotificationsCount = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications`);
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadNotifications(unread);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotificationsCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      setUnreadNotifications((prev) => prev + 1);
    };

    const handleNotificationCountReset = () => {
      setUnreadNotifications(0);
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('reset_unread_count', handleNotificationCountReset);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('reset_unread_count', handleNotificationCountReset);
    };
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on medium screens and up) */}
      <div className="hidden md:flex w-20 md:w-64 h-screen bg-deepBg border-r border-neutral-800/80 flex-col justify-between items-center md:items-stretch py-6 px-3 md:px-4 text-neutral-400">
        <div className="flex items-center gap-3 px-2 mb-8 select-none">
          <div className="w-10 h-10 rounded-xl bg-burgundy flex items-center justify-center shadow-lg shadow-burgundy/30">
            <span className="font-bold text-secondary text-xl">W</span>
          </div>
          <h1 className="hidden md:block text-white font-semibold text-lg tracking-wider">WeChat</h1>
        </div>

        <div className="flex-1 flex flex-col gap-2 w-full">
          <NavLink
            to="/chats"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <MessageSquare size={22} />
            <span className="hidden md:inline text-sm">Chats</span>
          </NavLink>

          <NavLink
            to="/groups"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <Users size={22} />
            <span className="hidden md:inline text-sm">Group Chats</span>
          </NavLink>

          <NavLink
            to="/friends"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <Users size={22} />
            <span className="hidden md:inline text-sm">Friends</span>
          </NavLink>

          <NavLink
            to="/moments"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <Globe size={22} />
            <span className="hidden md:inline text-sm">Moments</span>
          </NavLink>

          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <ScanLine size={22} />
            <span className="hidden md:inline text-sm">Scan QR</span>
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <div className="flex items-center gap-4">
              <Bell size={22} />
              <span className="hidden md:inline text-sm">Notifications</span>
            </div>
            {unreadNotifications > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {unreadNotifications}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/calls"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <Phone size={22} />
            <span className="hidden md:inline text-sm">Call History</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <User size={22} />
            <span className="hidden md:inline text-sm">Profile</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-burgundy text-secondary font-medium shadow-md shadow-burgundy/20'
                  : 'hover:bg-neutral-800/50 hover:text-neutral-200'
              }`
            }
          >
            <Settings size={22} />
            <span className="hidden md:inline text-sm">Settings</span>
          </NavLink>
        </div>

        <div className="w-full flex flex-col gap-4 border-t border-neutral-800/60 pt-6">
          <div className="hidden md:flex items-center gap-3 px-2">
            <img
              src={getAvatarUrl(user?.profileImage, user?.name)}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover border border-neutral-700"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-white text-sm font-semibold truncate">{user?.name}</h4>
              <p className="text-neutral-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center md:justify-start gap-4 px-3 py-3 w-full rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
          >
            <LogOut size={22} />
            <span className="hidden md:inline text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-deepBg border-t border-neutral-800/85 flex items-center justify-around z-50 px-2 text-neutral-400">
        <NavLink
          to="/chats"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all duration-300 relative ${
              isActive ? 'text-primary' : 'hover:text-neutral-200'
            }`
          }
        >
          <MessageSquare size={20} />
          <span className="text-[10px] font-medium">Chats</span>
        </NavLink>

        <NavLink
          to="/groups"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all duration-300 relative ${
              isActive ? 'text-primary' : 'hover:text-neutral-200'
            }`
          }
        >
          <Users size={20} />
          <span className="text-[10px] font-medium">Groups</span>
        </NavLink>

        <NavLink
          to="/friends"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all duration-300 relative ${
              isActive ? 'text-primary' : 'hover:text-neutral-200'
            }`
          }
        >
          <Users size={20} />
          <span className="text-[10px] font-medium">Friends</span>
        </NavLink>

        <NavLink
          to="/moments"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all duration-300 relative ${
              isActive ? 'text-primary' : 'hover:text-neutral-200'
            }`
          }
        >
          <Globe size={20} />
          <span className="text-[10px] font-medium">Moments</span>
        </NavLink>

        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all duration-300 relative ${
            showMoreMenu ? 'text-primary' : 'hover:text-neutral-200'
          }`}
        >
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-3 bg-red-500 text-white text-[8px] px-1 py-0.2 rounded-full font-bold">
              {unreadNotifications}
            </span>
          )}
          <Menu size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* Mobile More Slide-up Drawer */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
            onClick={() => setShowMoreMenu(false)}
          />
          {/* Drawer Content */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 max-h-[85vh] bg-deepBg border-t border-neutral-850 rounded-t-3xl p-6 z-[101] flex flex-col animate-slide-up shadow-2xl overflow-y-auto">
            {/* Handle/Close Header */}
            <div className="flex items-center justify-between mb-6 border-b border-neutral-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-white font-semibold text-lg">Menu</h3>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Card */}
            <div 
              onClick={() => {
                navigate('/profile');
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-3 p-3.5 bg-neutral-800/30 border border-neutral-800/60 hover:bg-neutral-800/50 rounded-2xl mb-6 cursor-pointer transition-colors duration-200"
            >
              <img
                src={getAvatarUrl(user?.profileImage, user?.name)}
                alt="avatar"
                className="w-12 h-12 rounded-full object-cover border border-neutral-700"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-semibold truncate">{user?.name}</h4>
                <p className="text-neutral-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>

            {/* Action List Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <NavLink
                to="/calls"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800/60 transition-all text-neutral-300 hover:text-white"
              >
                <Phone size={18} className="text-primary" />
                <span className="text-sm font-medium">Calls</span>
              </NavLink>

              <NavLink
                to="/scanner"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800/60 transition-all text-neutral-300 hover:text-white"
              >
                <ScanLine size={18} className="text-primary" />
                <span className="text-sm font-medium">Scan QR</span>
              </NavLink>

              <NavLink
                to="/notifications"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800/60 transition-all text-neutral-300 hover:text-white col-span-2"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-primary" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
                {unreadNotifications > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {unreadNotifications} new
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/profile"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800/60 transition-all text-neutral-300 hover:text-white"
              >
                <User size={18} className="text-primary" />
                <span className="text-sm font-medium">Profile</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800/60 transition-all text-neutral-300 hover:text-white"
              >
                <Settings size={18} className="text-primary" />
                <span className="text-sm font-medium">Settings</span>
              </NavLink>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                handleLogout();
              }}
              className="flex items-center justify-center gap-3 p-4 w-full rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all duration-300 font-semibold text-sm mt-auto"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
