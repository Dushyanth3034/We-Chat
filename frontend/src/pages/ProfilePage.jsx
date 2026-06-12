import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { User, Mail, FileText, Camera, Download, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [stats, setStats] = useState({ friendCount: 0, postCount: 0 });
  const [editMode, setEditMode] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setBio(user.bio);
    }
  }, [user, editMode]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/stats`);
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      }
    };
    fetchStats();
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('bio', bio);
    if (avatarFile) {
      formData.append('profileImage', avatarFile);
    }

    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/profile`, formData);
      updateUser(res.data);
      setSuccess('Profile updated successfully.');
      setEditMode(false);
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!user?.qrCode) return;
    const link = document.createElement('a');
    link.href = user.qrCode;
    link.download = `${user.name}_WeChat_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-darkBg px-4 py-8 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-scale-up">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Profile</h2>
          <p className="text-neutral-500 text-sm">Manage your profile details and WeChat QR Code</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <Check size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card & Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main User Card */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-neutral-800/80 relative flex flex-col justify-between">
            <form onSubmit={handleSave} className="flex flex-col gap-6 flex-1 justify-between">
              <div>
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  {/* Avatar Upload */}
                  <div className="relative group">
                    <img
                      src={avatarPreview || getAvatarUrl(user?.profileImage, user?.name)}
                      alt="Profile Avatar"
                      className="w-24 h-24 rounded-full object-cover border-2 border-neutral-700/80 group-hover:opacity-75 transition-all duration-300"
                    />
                    {editMode && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera size={20} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    {editMode ? (
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full glass-input px-3 py-1.5 rounded-xl text-white font-semibold text-xl"
                        required
                      />
                    ) : (
                      <h3 className="text-2xl font-bold text-white">{user?.name}</h3>
                    )}
                    <p className="text-neutral-500 text-sm mt-1">{user?.email}</p>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-neutral-500 font-medium tracking-wide uppercase">Bio</label>
                    {editMode ? (
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full glass-input px-4 py-3 rounded-xl text-white text-sm min-h-[100px]"
                        placeholder="Write a little about yourself..."
                      />
                    ) : (
                      <p className="glass-card rounded-2xl px-4 py-3 text-neutral-300 text-sm leading-relaxed min-h-[60px]">
                        {user?.bio || 'No bio written yet.'}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-neutral-500 font-medium tracking-wide uppercase">Email Address</label>
                      {editMode ? (
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                            <Mail size={16} />
                          </span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-sm"
                            required
                          />
                        </div>
                      ) : (
                        <div className="glass-card rounded-xl px-4 py-3 text-neutral-300 text-sm flex items-center gap-3">
                          <Mail size={16} className="text-neutral-500" />
                          <span>{user?.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-neutral-500 font-medium tracking-wide uppercase font-sans">Full Name</label>
                      {editMode ? (
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                            <User size={16} />
                          </span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-sm"
                            required
                          />
                        </div>
                      ) : (
                        <div className="glass-card rounded-xl px-4 py-3 text-neutral-300 text-sm flex items-center gap-3">
                          <User size={16} className="text-neutral-500" />
                          <span>{user?.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="glass-card rounded-2xl p-4 text-center">
                    <span className="block text-2xl font-bold text-white">{stats.friendCount}</span>
                    <span className="text-neutral-500 text-xs uppercase tracking-wider">Friends</span>
                  </div>
                  <div className="glass-card rounded-2xl p-4 text-center">
                    <span className="block text-2xl font-bold text-white">{stats.postCount}</span>
                    <span className="text-neutral-500 text-xs uppercase tracking-wider">Posts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t border-neutral-800/40 pt-4">
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        setAvatarPreview('');
                        setAvatarFile(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all text-sm font-medium flex items-center gap-2"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-light text-secondary font-medium shadow-md shadow-burgundy/25 transition-all text-sm flex items-center gap-2"
                    >
                      <Check size={16} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-light text-secondary font-medium shadow-md shadow-burgundy/25 transition-all text-sm flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* QR Code Section */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 flex flex-col items-center justify-between text-center">
            <div className="w-full">
              <h4 className="text-white font-bold text-lg mb-1">My QR Code</h4>
              <p className="text-neutral-500 text-xs mb-6">Scan code to add me instantly</p>
              
              <div className="w-56 h-56 bg-white rounded-2xl p-4 mx-auto shadow-inner flex items-center justify-center">
                {user?.qrCode ? (
                  <img src={user.qrCode} alt="My QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-10 h-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <p className="text-neutral-500 text-xs mt-4 italic">Show this code to other users to let them add you</p>
            </div>

            <button
              onClick={downloadQR}
              className="w-full mt-6 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
