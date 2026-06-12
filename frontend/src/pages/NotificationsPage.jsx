import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Heart, MessageSquare, UserPlus, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../utils/demoData';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socket = useSocket();

  const fetchNotifications = async () => {
    if (user?.role === 'guest') {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications`);
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const markAllRead = async () => {
      if (user?.role === 'guest') return;
      try {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read-all`);
        if (socket) {
          socket.emit('reset_unread_count');
        }
      } catch (err) {
        console.error(err);
      }
    };
    markAllRead();
  }, [socket, user]);

  useEffect(() => {
    if (!socket || user?.role === 'guest') return;

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, user]);

  const handleDelete = async (id) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="text-red-500 fill-red-500" size={18} />;
      case 'comment':
        return <MessageSquare className="text-blue-400 fill-blue-400/20" size={18} />;
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="text-green-400" size={18} />;
      default:
        return <CheckCircle2 className="text-burgundy" size={18} />;
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-darkBg px-4 py-8 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-scale-up">
        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Notifications</h2>
            <p className="text-neutral-500 text-sm font-normal">Stay up to date with comments, likes, and requests</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 border border-neutral-800/60 text-center flex flex-col items-center justify-center">
            <CheckCircle2 size={48} className="text-neutral-600 mb-4" />
            <h3 className="text-white text-lg font-bold">All caught up!</h3>
            <p className="text-neutral-500 text-sm mt-1">You don't have any notifications right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`glass-panel rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between gap-4 ${
                  notif.isRead ? 'border-neutral-800/80 bg-neutral-900/20' : 'border-burgundy/20 bg-burgundy/5 shadow-md shadow-burgundy/5'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-neutral-200 text-sm leading-relaxed pr-2">{notif.message}</p>
                    <span className="text-neutral-600 text-xs mt-1 block font-sans">
                      {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-all"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
