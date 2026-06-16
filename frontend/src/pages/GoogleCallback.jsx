import React, { useEffect } from 'react';

const GoogleCallback = () => {
  useEffect(() => {
    try {
      // Google OAuth implicit grant returns parameters in the hash fragment, e.g. #access_token=ya29...
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1)); // remove the leading '#'
      const accessToken = params.get('access_token');
      const error = params.get('error');

      if (window.opener) {
        if (accessToken) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_SUCCESS', token: accessToken },
            window.location.origin
          );
        } else {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_FAILURE', error: error || 'Access token not found' },
            window.location.origin
          );
        }
      }
    } catch (err) {
      console.error('Error during Google OAuth callback parsing:', err);
      if (window.opener) {
        window.opener.postMessage(
          { type: 'GOOGLE_AUTH_FAILURE', error: 'Failed to process authentication callback' },
          window.location.origin
        );
      }
    } finally {
      // Auto close this popup window
      window.close();
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-neutral-950 flex flex-col justify-center items-center text-neutral-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide">Authenticating with Google...</p>
        <p className="text-xs text-neutral-600">Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
