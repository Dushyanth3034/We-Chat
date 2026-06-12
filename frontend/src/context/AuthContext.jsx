import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wechat_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('wechat_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('wechat_token');
    }
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`);
        const userData = res.data;
        setUser(userData);

        // Automated E2E key generation for new or existing users
        if (userData && !userData.publicKey) {
          const { deriveKeyFromPassword, generateRSAKeyPair, encryptPrivateKey } = await import('../utils/e2e');
          const keypair = await generateRSAKeyPair();
          const derivedKey = await deriveKeyFromPassword(userData.email);
          const encryptedPrivKey = await encryptPrivateKey(keypair.privateKeyStr, derivedKey);

          await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/setup`, {
            publicKey: keypair.publicKeyStr,
            encryptedPrivateKey: encryptedPrivKey
          });

          localStorage.setItem(`wechat_privkey_${userData.id}`, keypair.privateKeyStr);
        } else if (userData && userData.publicKey) {
          const cached = localStorage.getItem(`wechat_privkey_${userData.id}`);
          if (!cached) {
            const { deriveKeyFromPassword, decryptPrivateKey } = await import('../utils/e2e');
            const derivedKey = await deriveKeyFromPassword(userData.email);
            try {
              const decrypted = await decryptPrivateKey(userData.encryptedPrivateKey, derivedKey);
              localStorage.setItem(`wechat_privkey_${userData.id}`, decrypted);
            } catch (decErr) {
              console.error('Failed to decrypt private key:', decErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
        setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('wechat_token');
  };

  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
