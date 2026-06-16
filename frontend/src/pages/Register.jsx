import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ShieldAlert } from 'lucide-react';

const validateEmail = (email) => {
  if (!email) return false;
  
  // 1. Must contain exactly one "@"
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;
  
  // 2. Reject if the domain part contains digits
  if (/\d/.test(domainPart)) return false;
  
  // 3. Must follow standard format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  // 4. Domain part must not contain consecutive dots or start/end with dot/hyphen
  if (domainPart.includes('..') || domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-')) {
    return false;
  }
  
  // Let's check each label of the domain
  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) return false;
  
  for (const label of domainLabels) {
    if (!label) return false;
    if (!/^[a-zA-Z-]+$/.test(label)) return false;
  }
  
  const tld = domainLabels[domainLabels.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  
  return true;
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const emailInputRef = useRef(null);
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/chats');
  };

  const handleGoogleLogin = () => {
    setError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'google-client-id-placeholder';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('[Google OAuth Audit] Client ID:', clientId);
    console.log('[Google OAuth Audit] API URL:', apiUrl);
    const redirectUri = encodeURIComponent(`${window.location.origin}/google-callback`);
    const scope = encodeURIComponent('openid profile email');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

    window.location.href = authUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/register`, { name, email, password });
      login(res.data.token, res.data.user);
      navigate('/chats');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-neutral-950 via-deepBg to-neutral-900 flex justify-center items-center px-4 overflow-auto py-8">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-neutral-800/80 animate-scale-up">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-burgundy/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-burgundy/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-burgundy mx-auto flex items-center justify-center shadow-lg shadow-burgundy/30 mb-4 animate-pulse-border">
            <span className="font-bold text-secondary text-3xl select-none">W</span>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-neutral-500 text-sm mt-2">Get started and join the moments wall</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3 mb-6 animate-slide-up">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
              <User size={18} />
            </span>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60"
              required
            />
          </div>

          <div className="relative flex flex-col gap-1.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
                <Mail size={18} />
              </span>
              <input
                ref={emailInputRef}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60 transition-all ${
                  submitAttempted && !validateEmail(email) ? 'border-red-500 ring-2 ring-red-500/20' : 'border-neutral-850'
                }`}
                required
              />
            </div>
            {email.length > 0 && (
              <div className="text-[11px] px-1 font-semibold flex items-center gap-1.5 transition-all">
                {validateEmail(email) ? (
                  <span className="text-lime-400 flex items-center gap-1">
                    ✓ Valid Email
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    ✗ Invalid Email Address
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
              <Lock size={18} />
            </span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60"
              required
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-500">
              <Lock size={18} />
            </span>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-burgundy/25 text-sm mt-3"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-800/80"></div>
            <span className="flex-shrink mx-4 text-neutral-500 text-xs uppercase font-semibold">Or</span>
            <div className="flex-grow border-t border-neutral-800/80"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-800 font-semibold py-3 rounded-xl transition-all duration-300 shadow-md text-sm flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4c0,-0.67 -0.06,-1.32 -0.17,-1.98z" fill="#4285F4" />
              <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.9,0.6 -2.07,0.98 -3.3,0.98c-2.34,0 -4.32,-1.58 -5.03,-3.7H3v2.66c1.49,2.96 4.54,4.84 8,4.84z" fill="#34A853" />
              <path d="M6.97,13.1c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7H3v2.66c-0.64,1.28 -1,2.72 -1,4.24c0,1.52 0.36,2.96 1,4.24l3.97,-3.1z" fill="#FBBC05" />
              <path d="M12,6.12c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.43,2.6 12,2.6c-3.46,0 -6.51,1.88 -8,4.84l3.97,3.1c0.71,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-[#A3E635] hover:opacity-90 disabled:opacity-50 text-[#0A0A0A] font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-md text-sm flex items-center justify-center gap-2"
          >
            <span>🚀 Log in as Guest</span>
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-burgundy hover:text-burgundy-light font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
