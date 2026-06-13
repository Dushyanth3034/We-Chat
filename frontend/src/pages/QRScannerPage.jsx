import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, Camera, Image, Check, ShieldAlert, ArrowRight, UserPlus, Smile } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const QRScannerPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [scannedUser, setScannedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const qrCodeScannerRef = useRef(null);

  // Sample users list for the mock scanner helper
  const [seedUsers, setSeedUsers] = useState([]);

  useEffect(() => {
    // Fetch suggestions to populate mock testers
    const fetchMockUsers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/suggestions`);
        setSeedUsers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMockUsers();
  }, []);

  const handleScanSuccess = async (decodedText) => {
    setError('');
    setSuccess('');
    stopCamera();

    try {
      // Decode QR JSON structure: { userId, email, name }
      const data = JSON.parse(decodedText);
      if (!data.userId) throw new Error('Invalid code');
      
      setScanResult(data);
      fetchScannedUserProfile(data.userId);
    } catch (err) {
      console.error(err);
      setError('Decoded QR data is invalid or not a DushuChat QR Code.');
    }
  };

  const fetchScannedUserProfile = async (userId) => {
    setLoading(true);
    try {
      // Fetch user stats or minimal user profile
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/search?query=${userId}`);
      // Find the specific user from the query results
      const userMatch = res.data.find(u => u.id === parseInt(userId, 10));
      if (userMatch) {
        setScannedUser(userMatch);
      } else {
        setError('User matching scanned QR code not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch profile details of scanned user.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!scanResult) return;
    setError('');
    setSuccess('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends/request`, { receiverId: scanResult.userId });
      setSuccess(`Friend request sent to ${scanResult.name || 'user'} successfully.`);
      setScannedUser(null);
      setScanResult(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send request.');
    }
  };

  // HTML5 Camera controls
  const startCamera = async () => {
    setScanResult(null);
    setScannedUser(null);
    setError('');
    setSuccess('');
    setCameraActive(true);

    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode('qr-reader-container');
        qrCodeScannerRef.current = scanner;

        scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Silence silent scanning noise logs
          }
        ).catch(err => {
          console.error(err);
          setError('Camera initialization failed. Please verify permissions.');
          setCameraActive(false);
        });
      } catch (err) {
        console.error(err);
        setError('Camera setup error.');
        setCameraActive(false);
      }
    }, 200);
  };

  const stopCamera = () => {
    if (qrCodeScannerRef.current && qrCodeScannerRef.current.isScanning) {
      qrCodeScannerRef.current.stop().then(() => {
        qrCodeScannerRef.current = null;
        setCameraActive(false);
      }).catch(err => console.error(err));
    } else {
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup scanner on exit
      if (qrCodeScannerRef.current) {
        qrCodeScannerRef.current.stop().catch(err => console.error(err));
      }
    };
  }, []);

  // Image Upload Scanner Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setScanResult(null);
    setScannedUser(null);

    const html5QrCode = new Html5Qrcode('qr-file-dummy');
    html5QrCode.scanFile(file, true)
      .then(decodedText => {
        handleScanSuccess(decodedText);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to scan file. Ensure the image has a clear, scannable QR Code.');
      });
  };

  // Mock Scan Simulation Helper
  const triggerMockScan = (user) => {
    const mockQRData = JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    setSuccess(`Mock Scan Simulated successfully for ${user.name}.`);
    handleScanSuccess(mockQRData);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-darkBg px-4 py-8 md:p-8">
      {/* Target canvas hidden element required by html5-qrcode file scan */}
      <div id="qr-file-dummy" className="hidden"></div>

      <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-scale-up">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">QR Scanner</h2>
          <p className="text-neutral-500 text-sm">Scan a friend's WeChat QR code via camera, file upload, or mock simulator</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Scanning Card */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-neutral-800/80 flex flex-col items-center justify-center min-h-[400px]">
            {cameraActive ? (
              <div className="w-full flex flex-col items-center">
                <div id="qr-reader-container" className="w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border border-neutral-850 shadow-inner"></div>
                <button
                  onClick={stopCamera}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition-all text-sm"
                >
                  Stop Camera Scan
                </button>
              </div>
            ) : scannedUser ? (
              /* Decoded Scanned User Details Card */
              <div className="w-full max-w-md text-center flex flex-col items-center gap-6 animate-scale-up">
                <div className="w-16 h-16 bg-burgundy/10 rounded-full flex items-center justify-center animate-pulse-border text-burgundy">
                  <Scan size={32} />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">QR Code Decoded!</h3>
                  <p className="text-neutral-500 text-xs mt-0.5">Found matching user profile</p>
                </div>

                <div className="glass-card rounded-2xl p-6 w-full flex flex-col items-center border border-burgundy/20">
                  <img
                    src={getAvatarUrl(scannedUser.profileImage, scannedUser.name)}
                    alt={scannedUser.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-neutral-750 mb-3"
                  />
                  <h4 className="text-white font-semibold text-lg">{scannedUser.name}</h4>
                  <p className="text-neutral-500 text-xs">{scannedUser.email}</p>
                  <p className="text-neutral-400 text-sm mt-3 italic">"{scannedUser.bio}"</p>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => { setScannedUser(null); setScanResult(null); }}
                    className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-medium transition-all text-sm"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={handleSendRequest}
                    className="flex-1 py-3 rounded-xl bg-burgundy hover:bg-burgundy-light text-secondary font-medium shadow-md shadow-burgundy/25 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} />
                    Add Friend
                  </button>
                </div>
              </div>
            ) : (
              /* Options when camera is inactive and no user scanned */
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
                <button
                  onClick={startCamera}
                  className="flex-1 glass-card border border-neutral-800/80 hover:border-burgundy/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-burgundy/10 group-hover:bg-burgundy/20 rounded-2xl flex items-center justify-center text-burgundy transition-colors">
                    <Camera size={26} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Use Device Camera</h4>
                    <p className="text-neutral-500 text-xs mt-1">Scan directly using your device's video stream</p>
                  </div>
                </button>

                <label className="flex-1 glass-card border border-neutral-800/80 hover:border-burgundy/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 group cursor-pointer">
                  <div className="w-14 h-14 bg-neutral-800 group-hover:bg-neutral-700 rounded-2xl flex items-center justify-center text-neutral-400 transition-colors">
                    <Image size={26} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Upload QR Image</h4>
                    <p className="text-neutral-500 text-xs mt-1">Drop a WeChat QR photo or browse local files</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Right Column: Mock Simulator Panel (Thoughtful UX fallback) */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800/80 flex flex-col gap-4">
            <div>
              <h3 className="text-white font-bold text-sm">Mock Scan Simulator</h3>
              <p className="text-neutral-500 text-xs mt-0.5">Quickly test QR logic without camera or image files</p>
            </div>

            {seedUsers.length === 0 ? (
              <p className="text-neutral-600 text-xs italic py-4">No users available to mock scan (try creating other accounts first).</p>
            ) : (
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px]">
                {seedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => triggerMockScan(user)}
                    className="w-full glass-card hover:bg-neutral-850 p-3 rounded-xl border border-neutral-800/60 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getAvatarUrl(user.profileImage, user.name)}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                      />
                      <div className="min-w-0">
                        <h4 className="text-white text-xs font-semibold truncate group-hover:text-burgundy transition-colors">{user.name}</h4>
                        <p className="text-neutral-500 text-[10px] truncate">{user.email}</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-neutral-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            )}
            <div className="text-neutral-500 text-[11px] leading-relaxed border-t border-neutral-800/60 pt-4 flex gap-2">
              <Smile size={16} className="shrink-0 text-burgundy" />
              <span>Simulates scanner parsing the QR token string from the target user.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;
