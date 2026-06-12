import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Mail, CheckCircle, ShieldAlert, LogOut, ArrowRight, RefreshCw } from 'lucide-react';

const VerifyEmail = () => {
  const { user, token: authHeadersToken, updateUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-verify if token is in URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      autoVerify(urlToken);
    }
  }, [searchParams]);

  const autoVerify = async (tokenVal) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify`, { token: tokenVal });
      setSuccessMessage(res.data.message || 'Email verified successfully!');
      
      // Update local auth context
      updateUser({ isVerified: true });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/chats');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Verification failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setError('Please enter a verification token.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify`, { token: inputToken });
      setSuccessMessage(res.data.message || 'Email verified successfully!');
      
      // Update local auth context
      updateUser({ isVerified: true });
      
      setTimeout(() => {
        navigate('/chats');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Verification failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const emailToUse = user?.email;
    if (!emailToUse) {
      setError('Cannot resend: user email not found. Please log in again.');
      return;
    }
    setResendLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/resend-verification`, { email: emailToUse });
      setSuccessMessage(res.data.message || 'Verification email resent! Please check your inbox (and console/logs).');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-neutral-950 via-deepBg to-neutral-900 flex justify-center items-center px-4 overflow-auto py-8 text-white select-none">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-neutral-800/80 animate-scale-up">
        
        {/* Decorative ambient blobs */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-burgundy/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-burgundy/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-burgundy mx-auto flex items-center justify-center shadow-lg shadow-burgundy/30 mb-4 animate-pulse-border">
            <Mail size={30} className="text-secondary" />
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Verify Your Email</h2>
          <p className="text-neutral-500 text-sm mt-2">
            {user ? `Verification email sent to: ${user.email}` : 'Please verify your account to continue.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3 mb-6 animate-slide-up">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-lime-500/10 border border-lime-500/20 text-lime-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3 mb-6 animate-slide-up">
            <CheckCircle size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
              <Mail size={18} />
            </span>
            <input
              type="text"
              placeholder="Enter 64-character verification token"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60 border border-neutral-800"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || resendLoading}
            className="w-full bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-burgundy/25 text-sm mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Token
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-neutral-850">
          <div className="flex justify-between items-center text-xs">
            <button
              onClick={handleResend}
              disabled={loading || resendLoading}
              className="text-burgundy hover:text-burgundy-light font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {resendLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </button>
            <button
              onClick={handleLogout}
              className="text-neutral-500 hover:text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 text-center leading-normal">
            For testing: check the backend console logs or view the <code>backend/uploads/verification_emails.log</code> file to retrieve your verification link/token.
          </p>
        </div>

      </div>
    </div>
  );
};

export default VerifyEmail;
