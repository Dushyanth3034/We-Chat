import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Bell, Lock, UserX, Check, ShieldAlert } from 'lucide-react';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(false);
  const [privacyPublicScan, setPrivacyPublicScan] = useState(true);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/password`, {
        currentPassword,
        newPassword,
      });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-darkBg px-4 py-8 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-scale-up">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-neutral-500 text-sm">Customize your WeChat experience and manage your security</p>
        </div>

        {user?.role === 'guest' && (
          <div className="bg-[#A3E635]/10 border border-[#A3E635]/20 text-[#A3E635] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-[#A3E635]/5 animate-slide-up">
            <div>
              <h4 className="font-bold text-sm">You are currently exploring Demo Mode.</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Explore WeChat's features like chats, stories, feed, calls and friends with mock demo data.</p>
            </div>
            <button
              onClick={() => logout()}
              className="bg-[#A3E635] hover:opacity-95 text-[#0A0A0A] font-bold text-xs px-4 py-2 rounded-xl transition-all self-start sm:self-auto shrink-0"
            >
              Sign In
            </button>
          </div>
        )}

        {/* User Card */}
        <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#A3E635]/10 flex items-center justify-center border border-[#A3E635]/25 text-[#A3E635] font-bold text-xl">
              {user?.role === 'guest' ? 'GU' : user?.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{user?.role === 'guest' ? 'Guest User' : user?.name}</h3>
              <p className="text-[#A3E635] text-xs font-semibold mt-0.5">
                {user?.role === 'guest' ? 'Demo Account' : 'Standard Account'}
              </p>
            </div>
          </div>
          {user?.role === 'guest' && (
            <span className="text-[9px] uppercase tracking-wider font-bold bg-[#A3E635]/10 text-[#A3E635] px-3 py-1 rounded-full border border-[#A3E635]/20">
              Demo Active
            </span>
          )}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80">
              <div className="flex items-center gap-3 mb-6 border-b border-neutral-800/60 pb-3">
                <Lock className="text-burgundy" size={20} />
                <h3 className="text-white font-bold text-lg">Change Password</h3>
              </div>

              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm bg-neutral-900/40"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400 font-medium">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm bg-neutral-900/40"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm bg-neutral-900/40"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-burgundy/25 text-sm mt-2"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80">
              <div className="flex items-center gap-3 mb-6 border-b border-neutral-800/60 pb-3">
                <Shield className="text-burgundy" size={20} />
                <h3 className="text-white font-bold text-lg">Privacy Settings</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-2 border-b border-neutral-800/40">
                  <div>
                    <h4 className="text-white text-sm font-semibold">Allow QR Code Friend Addition</h4>
                    <p className="text-neutral-500 text-xs mt-0.5">Let users add you by scanning your profile QR Code</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyPublicScan}
                    onChange={(e) => setPrivacyPublicScan(e.target.checked)}
                    className="w-4 h-4 accent-burgundy"
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-white text-sm font-semibold">Show Moments on Profile</h4>
                    <p className="text-neutral-500 text-xs mt-0.5">Allow friends to view your moments feed on your profile card</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 accent-burgundy"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80">
              <div className="flex items-center gap-3 mb-6 border-b border-neutral-800/60 pb-3">
                <Bell className="text-burgundy" size={20} />
                <h3 className="text-white font-bold text-lg">Notifications</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-2 border-b border-neutral-800/40">
                  <div>
                    <h4 className="text-white text-sm font-semibold">Sound Alerts</h4>
                    <p className="text-neutral-500 text-xs mt-0.5">Play a sound on new messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 accent-burgundy"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-white text-sm font-semibold">Desktop Alerts</h4>
                    <p className="text-neutral-500 text-xs mt-0.5">Show native browser banner alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={desktopNotifs}
                    onChange={(e) => setDesktopNotifs(e.target.checked)}
                    className="w-4 h-4 accent-burgundy"
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-red-950/40 bg-red-950/5">
              <div className="flex items-center gap-3 mb-6 border-b border-red-950/20 pb-3">
                <UserX className="text-red-500" size={20} />
                <h3 className="text-red-400 font-bold text-lg">Danger Zone</h3>
              </div>

              <div>
                <p className="text-neutral-400 text-xs mb-4 leading-relaxed">
                  Deleting your account will permanently wipe all messages, friendships, and Moments posts. This action is irreversible.
                </p>
                <button
                  onClick={() => alert('Account deletion is not supported in this environment.')}
                  className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:text-white hover:bg-red-500/20 font-medium transition-all text-xs"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
