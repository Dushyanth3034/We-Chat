import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { 
  Phone, PhoneOff, Video, ArrowUpRight, ArrowDownLeft, 
  Users, Clock, Calendar, ShieldAlert 
} from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const CallHistoryPage = () => {
  const { user } = useAuth();
  const { startCall, startGroupCall } = useCall();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCallHistory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load call history:', err);
      setError('Failed to load call history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallHistory();
  }, []);

  // Format Duration Timer (e.g. 5m 23s or 45s)
  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}m ${remainingSecs}s`;
    }
    return `${remainingSecs}s`;
  };

  const handleCallBack = (log) => {
    if (log.isGroup) {
      if (log.group) {
        startGroupCall(log.group.id, log.callType);
      }
    } else {
      const otherUser = log.caller.id === user.id ? log.receiver : log.caller;
      startCall(otherUser, log.callType);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-darkBg px-4 py-8 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Call History</h2>
            <p className="text-neutral-500 text-sm font-normal">Review your voice and video call logs</p>
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
        ) : history.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 border border-neutral-800/60 text-center flex flex-col items-center justify-center">
            <PhoneOff size={48} className="text-neutral-600 mb-4" />
            <h3 className="text-white text-lg font-bold">No calls yet</h3>
            <p className="text-neutral-500 text-sm mt-1">All your incoming, outgoing, and group calls will be listed here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((log) => {
              const isOutgoing = !log.isGroup && log.caller.id === user.id;
              const otherParty = log.isGroup 
                ? null 
                : (isOutgoing ? log.receiver : log.caller);
              
              const displayName = log.isGroup 
                ? log.group?.groupName || 'Deleted Group'
                : otherParty?.name || 'Unknown User';
              
              const displayAvatar = log.isGroup
                ? (log.group?.groupImage ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${log.group.groupImage}` : `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`)
                : getAvatarUrl(otherParty?.profileImage, displayName);

              const isMissed = log.status === 'missed' || (log.status === 'rejected' && !isOutgoing);
              
              return (
                <div
                  key={`${log.isGroup ? 'g' : 'd'}-${log.id}`}
                  className="glass-panel rounded-2xl p-4 border border-neutral-800/80 bg-neutral-900/20 hover:bg-neutral-900/40 transition-all duration-300 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover border border-neutral-800 shrink-0"
                    />
                    
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold truncate">
                          {displayName}
                        </span>
                        {log.isGroup && (
                          <span className="bg-neutral-850 border border-neutral-800 text-[10px] text-neutral-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Users size={10} />
                            Group
                          </span>
                        )}
                      </div>

                      {/* Direction and status indicators */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-sans">
                        {!log.isGroup && (
                          isOutgoing ? (
                            <ArrowUpRight size={14} className="text-neutral-500" />
                          ) : (
                            <ArrowDownLeft size={14} className={isMissed ? 'text-red-500' : 'text-neutral-500'} />
                          )
                        )}
                        
                        {log.isGroup ? (
                          <span>Started by {log.creator?.name || 'Unknown'}</span>
                        ) : (
                          <span className={isMissed ? 'text-red-500 font-medium' : ''}>
                            {isOutgoing 
                              ? (log.status === 'completed' ? 'Outgoing call' : `Outgoing call (${log.status})`) 
                              : (isMissed ? 'Missed call' : 'Incoming call')}
                          </span>
                        )}

                        {log.status === 'completed' && log.duration > 0 && (
                          <>
                            <span className="text-neutral-700 font-bold">•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDuration(log.duration)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-neutral-600 mt-1 block font-sans">
                        <Calendar size={10} className="inline mr-1 -mt-0.5" />
                        {new Date(log.timestamp).toLocaleDateString()} at{' '}
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCallBack(log)}
                      disabled={log.isGroup && !log.group}
                      className="p-3 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 disabled:cursor-not-allowed text-secondary rounded-2xl shadow-md shadow-burgundy/10 transition-all duration-300 scale-100 hover:scale-105"
                      title={log.callType === 'video' ? 'Video Call Back' : 'Audio Call Back'}
                    >
                      {log.callType === 'video' ? <Video size={18} /> : <Phone size={18} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistoryPage;
