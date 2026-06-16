import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Google OAuth implicit grant returns parameters in the hash fragment, e.g. #access_token=ya29...
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1)); // remove the leading '#'
        const accessToken = params.get('access_token');
        const error = params.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!accessToken) {
          throw new Error('Access token not found in Google response.');
        }

        // Authenticate the user directly on the callback page
        const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`, { accessToken });
        
        // Save the authentication state
        login(res.data.token, res.data.user);
        
        // Redirect the user to the chats view
        navigate('/chats');
      } catch (err) {
        console.error('Error during Google OAuth callback processing:', err);
        const errMsg = err.response?.data?.message || err.message || 'Google authentication failed.';
        setErrorMsg(errMsg);
        
        // Redirect back to login after showing the error briefly
        setTimeout(() => {
          navigate('/login', { state: { error: errMsg } });
        }, 3000);
      }
    };

    processCallback();
  }, [login, navigate]);

  return (
    <div className="w-screen h-screen bg-neutral-950 flex flex-col justify-center items-center text-neutral-400">
      <div className="flex flex-col items-center gap-4">
        {errorMsg ? (
          <div className="flex flex-col items-center gap-2 max-w-md text-center px-4">
            <div className="text-red-500 text-sm font-semibold">{errorMsg}</div>
            <p className="text-xs text-neutral-600">Redirecting to login page...</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold tracking-wide">Authenticating with Google...</p>
            <p className="text-xs text-neutral-600">Please wait while we complete your sign in.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
