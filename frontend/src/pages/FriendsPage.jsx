import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Search, UserPlus, UserCheck, UserMinus, MessageSquare, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';
import { MOCK_FRIENDS, MOCK_FRIEND_REQUESTS, MOCK_SUGGESTIONS } from '../utils/demoData';

const FriendsPage = () => {
  const { user } = useAuth();
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socket = useSocket();

  const fetchData = async () => {
    if (user?.role === 'guest') {
      setFriendsList(MOCK_FRIENDS);
      setFriendRequests(MOCK_FRIEND_REQUESTS);
      setSuggestions(MOCK_SUGGESTIONS);
      setLoading(false);
      return;
    }
    try {
      const friendsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends`);
      setFriendsList(friendsRes.data);

      const requestsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/requests`);
      setFriendRequests(requestsRes.data);

      const suggestionsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/suggestions`);
      setSuggestions(suggestionsRes.data);
    } catch (err) {
      console.error('Failed to load friends data:', err);
      setError('Failed to load friends page data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Listen for socket events to update requests in real-time
  useEffect(() => {
    if (!socket || user?.role === 'guest') return;

    const handleFriendRequestUpdate = () => {
      fetchData();
    };

    socket.on('new_notification', handleFriendRequestUpdate);

    return () => {
      socket.off('new_notification', handleFriendRequestUpdate);
    };
  }, [socket, user]);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    if (user?.role === 'guest') {
      // Return matching users from mock friends
      const matches = MOCK_FRIENDS.filter(f => f.name.toLowerCase().includes(val.toLowerCase()) || f.email.toLowerCase().includes(val.toLowerCase()));
      setSearchResults(matches);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/search?query=${val}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendRequest = async (receiverId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/request`, { receiverId });
      fetchData();
      setSearchResults((prev) => prev.filter((u) => u.id !== receiverId));
      setSuggestions((prev) => prev.filter((u) => u.id !== receiverId));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send friend request.');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/accept`, { requestId });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/reject`, { requestId });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/remove`, { friendId });
      setSelectedFriend(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChat = (friendId) => {
    navigate('/chats', { state: { startChatWith: friendId } });
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-darkBg flex flex-col md:flex-row relative">
      {/* Left Column: User lists and Search */}
      <div className="flex-1 h-full overflow-y-auto px-4 py-8 md:p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Friends</h2>
          <p className="text-neutral-500 text-sm">Add users, manage requests, and browse your contacts</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search users */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500 pointer-events-none">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 animate-slide-up">
            <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-4">Search Results</h3>
            {searchResults.length === 0 ? (
              <p className="text-neutral-500 text-sm">No users found matching "{searchQuery}"</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((user) => (
                  <div key={user.id} className="glass-card rounded-2xl p-4 flex items-center justify-between border border-neutral-800/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getAvatarUrl(user.profileImage, user.name)}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                      />
                      <div className="min-w-0">
                        <h4 className="text-white text-sm font-semibold truncate">{user.name}</h4>
                        <p className="text-neutral-500 text-xs truncate">{user.bio}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="p-2 bg-burgundy hover:bg-burgundy-light text-secondary rounded-xl shadow-md shadow-burgundy/10 transition-all shrink-0"
                      title="Add Friend"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friend Requests (Pending received) */}
        {friendRequests.length > 0 && (
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 animate-slide-up">
            <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-4">Friend Requests</h3>
            <div className="flex flex-col gap-3">
              {friendRequests.map((req) => (
                <div key={req.id} className="glass-card rounded-2xl p-4 flex items-center justify-between border border-neutral-800/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getAvatarUrl(req.Sender.profileImage, req.Sender.name)}
                      alt={req.Sender.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                    />
                    <div className="min-w-0">
                      <h4 className="text-white text-sm font-semibold truncate">{req.Sender.name}</h4>
                      <p className="text-neutral-500 text-xs truncate">{req.Sender.bio}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-medium transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                       className="px-3 py-1.5 bg-burgundy hover:bg-burgundy-light text-secondary rounded-xl text-xs font-medium shadow-md shadow-burgundy/10 transition-all"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 flex-1 flex flex-col min-h-[300px]">
          <h3 className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-4">Contacts ({friendsList.length})</h3>
          {loading ? (
            <div className="flex justify-center items-center flex-1">
              <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : friendsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
              <AlertCircle size={36} className="text-neutral-600 mb-3" />
              <p className="text-neutral-500 text-sm">No friends added yet.</p>
              <p className="text-neutral-600 text-xs mt-1">Use the search bar above or check suggestions to add friends.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[450px] pr-1">
              {friendsList.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`glass-card rounded-2xl p-4 flex items-center gap-4 border cursor-pointer hover:border-burgundy/40 transition-all duration-300 ${
                    selectedFriend?.id === friend.id ? 'border-burgundy bg-burgundy/5' : 'border-neutral-800/40'
                  }`}
                >
                  <img
                    src={getAvatarUrl(friend.profileImage, friend.name)}
                    alt={friend.name}
                    className="w-12 h-12 rounded-full object-cover border border-neutral-700/80 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white text-sm font-semibold truncate">{friend.name}</h4>
                    <p className="text-neutral-500 text-xs truncate">{friend.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column / Panel: Friend Detail Slide-over */}
      {selectedFriend ? (
        <div className="w-full md:w-80 h-full border-t md:border-t-0 md:border-l border-neutral-850/80 bg-deepBg p-6 flex flex-col justify-between shrink-0 animate-slide-left z-10 absolute md:relative inset-0 md:inset-auto">
          <div className="flex flex-col gap-6">
            {/* Detail Close */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Friend Profile</span>
              <button onClick={() => setSelectedFriend(null)} className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Friend Details */}
            <div className="flex flex-col items-center text-center gap-4">
              <img
                src={getAvatarUrl(selectedFriend.profileImage, selectedFriend.name)}
                alt={selectedFriend.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-neutral-700/80"
              />
              <div>
                <h3 className="text-white font-bold text-lg">{selectedFriend.name}</h3>
                <p className="text-neutral-500 text-xs mt-0.5">{selectedFriend.email}</p>
              </div>
              <p className="glass-card rounded-xl px-4 py-2.5 text-neutral-300 text-xs leading-relaxed max-w-xs">{selectedFriend.bio}</p>
            </div>

            {/* QR Code thumbnail if any */}
            {selectedFriend.qrCode && (
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-xs mb-2">User QR Code</span>
                <div className="w-24 h-24 bg-white p-1 rounded-xl shadow-md">
                  <img src={selectedFriend.qrCode} alt="User QR Code" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 mt-6 border-t border-neutral-800/60 pt-6">
            <button
              onClick={() => handleStartChat(selectedFriend.id)}
               className="w-full bg-burgundy hover:bg-burgundy-light text-secondary font-semibold py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 shadow-lg shadow-burgundy/15"
            >
              <MessageSquare size={16} />
              Send Message
            </button>
            <button
              onClick={() => handleRemoveFriend(selectedFriend.id)}
              className="w-full border border-neutral-850 hover:bg-red-500/10 hover:text-red-400 text-neutral-500 py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2"
            >
              <UserMinus size={16} />
              Remove Contact
            </button>
          </div>
        </div>
      ) : (
        /* Display suggestions when no friend is selected */
        <div className="hidden lg:flex w-80 h-full border-l border-neutral-800/80 bg-deepBg p-6 flex-col gap-6 shrink-0">
          <div>
            <h3 className="text-white font-bold text-sm">Suggestions</h3>
            <p className="text-neutral-500 text-xs mt-0.5">People you might know</p>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-neutral-600 text-xs italic">No suggestions right now.</p>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto">
              {suggestions.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getAvatarUrl(user.profileImage, user.name)}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                    />
                    <div className="min-w-0">
                      <h4 className="text-white text-xs font-semibold truncate">{user.name}</h4>
                      <p className="text-neutral-500 text-[10px] truncate">{user.bio}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.id)}
                     className="p-1.5 bg-burgundy hover:bg-burgundy-light text-secondary rounded-lg transition-all shrink-0"
                    title="Add Friend"
                  >
                    <UserPlus size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
