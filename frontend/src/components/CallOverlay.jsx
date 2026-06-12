import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, 
  Monitor, MonitorOff, Maximize, Minimize, Users, MessageSquare, Send, Smile, X 
} from 'lucide-react';
import axios from 'axios';
import { getAvatarUrl } from '../utils/avatar';
import { MOCK_GROUPS } from '../utils/demoData';

// WebRTC Local/Remote Video Stream Player helper
const StreamPlayer = ({ stream, isLocal, name, isMuted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-neutral-800 text-[10px] text-white flex items-center gap-1.5 font-bold uppercase select-none">
        <span>{name}</span>
        {isLocal && <span className="text-primary">(You)</span>}
        {isMuted && <MicOff size={10} className="text-red-500" />}
      </div>
    </div>
  );
};

// WebRTC Audio Stream Player helper (hidden)
const AudioPlayer = ({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay style={{ display: 'none' }} />;
};

const CallOverlay = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const {
    callState,
    callType,
    isGroup,
    activeCallId,
    groupId,
    remoteUser,
    localStream,
    remoteStream,
    remoteStreams,
    isScreenSharing,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare
  } = useCall();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Group participants state populated from active call metadata
  const [groupParticipants, setGroupParticipants] = useState([]);

  useEffect(() => {
    if (callState === 'ongoing' && isGroup) {
      if (user?.role === 'guest') {
        const mockGroup = MOCK_GROUPS.find(g => g.id === groupId) || MOCK_GROUPS[0];
        setGroupParticipants(mockGroup.Members.map((m, idx) => ({
          id: m.User.id || (idx + 101),
          name: m.User.name,
          profileImage: m.User.profileImage
        })));
        return;
      }
      if (!activeCallId) return;
      const fetchGroupDetails = async () => {
        try {
          // Fetch group call details to get participants lists
          const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${groupId}`);
          setGroupParticipants(res.data.Members.map(m => m.User));
        } catch (err) {
          console.error(err);
        }
      };
      fetchGroupDetails();
    }
  }, [callState, isGroup, activeCallId, groupId, user]);

  // Handle group call chat Socket notifications
  useEffect(() => {
    if (!socket || !isGroup || !groupId) return;

    const handleCallChatMessage = (msg) => {
      if (msg.groupId === parseInt(groupId, 10)) {
        setChatMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('message', handleCallChatMessage);
    return () => {
      socket.off('message', handleCallChatMessage);
    };
  }, [socket, isGroup, groupId]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, chatMessages]);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const formData = new FormData();
      formData.append('groupId', groupId);
      formData.append('text', `[In-Call Message]: ${inputText}`);
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/message`, formData);
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  if (callState === 'idle') return null;

  // Format Duration Timer (MM:SS)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Render Grid items layout based on participant count
  const renderGroupStreams = () => {
    // Collect all active stream nodes
    const activeStreams = [];
    
    // Add local stream
    if (localStream) {
      activeStreams.push({
        userId: user.id,
        name: user.name,
        stream: localStream,
        isLocal: true,
        isMuted
      });
    }

    // Add remote streams
    Object.keys(remoteStreams).forEach((peerId) => {
      const uId = parseInt(peerId, 10);
      const participantMeta = groupParticipants.find(p => p.id === uId) || { name: `Participant ${uId}` };
      activeStreams.push({
        userId: uId,
        name: participantMeta.name,
        stream: remoteStreams[peerId],
        isLocal: false,
        isMuted: false // remote mute state placeholder
      });
    });

    const count = activeStreams.length;
    let gridClass = 'grid-cols-1';
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count >= 3 && count <= 4) gridClass = 'grid-cols-2 grid-rows-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
      <div className={`grid ${gridClass} gap-4 w-full h-full max-h-[70vh] items-center justify-center p-2`}>
        {activeStreams.map((item) => (
          <div key={item.userId} className="w-full h-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
            {callType === 'video' ? (
              <StreamPlayer
                stream={item.stream}
                isLocal={item.isLocal}
                name={item.name}
                isMuted={item.isMuted}
              />
            ) : (
              // Audio Call Participant Card representation
              <div className="w-full h-full bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-center items-center relative gap-3 p-4">
                <img
                  src={getAvatarUrl(null, item.name)}
                  alt={item.name}
                  className="w-16 h-16 rounded-full border-2 border-neutral-800 object-cover"
                />
                <span className="text-white text-xs font-bold uppercase">{item.name} {item.isLocal && '(You)'}</span>
                {item.isMuted && (
                  <span className="absolute top-3 right-3 p-1.5 bg-red-500/10 border border-red-500/25 rounded-full text-red-500">
                    <MicOff size={12} />
                  </span>
                )}
                {/* Mount hidden audio tag to play WebRTC remote audio stream */}
                {!item.isLocal && <AudioPlayer stream={item.stream} />}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md z-50 flex flex-col justify-between items-center w-screen h-screen p-6 overflow-hidden">
      
      {/* 1. INCOMING CALL SCREEN */}
      {callState === 'incoming' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-12 w-full max-w-md animate-scale-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
            <img
              src={getAvatarUrl(remoteUser?.profileImage, remoteUser?.name)}
              alt={remoteUser?.name}
              className="w-32 h-32 rounded-full border-4 border-primary shadow-xl object-cover relative z-10"
            />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-2xl tracking-tight">{remoteUser?.name}</h2>
            <p className="text-primary text-xs font-bold uppercase tracking-wider mt-2.5 animate-pulse">
              Incoming {callType} Call...
            </p>
          </div>

          <div className="flex gap-8 mt-6">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/25 transition-all duration-300 scale-100 hover:scale-105"
              title="Decline Call"
            >
              <PhoneOff size={24} />
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary-light text-secondary flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-300 scale-100 hover:scale-105"
              title="Accept Call"
            >
              <Phone size={24} />
            </button>
          </div>
        </div>
      )}

      {/* 2. OUTGOING CALL SCREEN */}
      {callState === 'outgoing' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-12 w-full max-w-md animate-scale-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse-border"></div>
            <img
              src={getAvatarUrl(remoteUser?.profileImage, remoteUser?.name)}
              alt={remoteUser?.name}
              className="w-32 h-32 rounded-full border-4 border-neutral-800 shadow-xl object-cover relative z-10"
            />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-2xl tracking-tight">{remoteUser?.name}</h2>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-2.5">
              Ringing / Connecting...
            </p>
          </div>

          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/25 transition-all duration-300 scale-100 hover:scale-105 mt-6"
            title="Cancel Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}

      {/* 3. ONGOING CALL SCREEN */}
      {callState === 'ongoing' && (
        <div className="flex-1 flex flex-col lg:flex-row w-full h-full overflow-hidden items-center justify-between gap-6 relative">
          
          <div className="flex-1 h-full flex flex-col justify-between items-center py-6 relative">
            {/* Top Bar Details */}
            <div className="w-full flex justify-between items-center px-4 max-w-4xl z-20">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-primary" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {isGroup ? 'Group Conversation' : 'Secure Connection'}
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-1.5 rounded-full text-white font-mono text-xs shadow-md tracking-wider">
                {formatTime(callDuration)}
              </div>
            </div>

            {/* Core Stream Display Window */}
            <div className="flex-1 w-full flex items-center justify-center max-w-4xl py-6">
              {isGroup ? (
                // Group stream grid view
                renderGroupStreams()
              ) : (
                // 1-to-1 Audio / Video Call Layout
                <div className={`relative w-full h-full max-h-[60vh] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-neutral-900 ${isFullscreen ? 'fixed inset-0 max-h-screen aspect-auto z-40' : ''}`}>
                  {callType === 'video' ? (
                    <>
                      {/* Remote Video Stream */}
                      {remoteStream ? (
                        <StreamPlayer
                          stream={remoteStream}
                          isLocal={false}
                          name={remoteUser?.name || 'Remote Peer'}
                          isMuted={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-950 flex flex-col justify-center items-center gap-3">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-neutral-500 font-bold uppercase">Connecting stream...</span>
                        </div>
                      )}
                      
                      {/* Local Video Stream Preview Overlay */}
                      {localStream && !isCameraOff && (
                        <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-primary shadow-xl z-10 bg-neutral-950">
                          <StreamPlayer
                            stream={localStream}
                            isLocal={true}
                            name="You"
                            isMuted={isMuted}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    // Audio Call 1-to-1 Frame Representation
                    <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center gap-4 relative">
                      <img
                        src={getAvatarUrl(remoteUser?.profileImage, remoteUser?.name)}
                        alt={remoteUser?.name}
                        className="w-28 h-28 rounded-full border-4 border-neutral-800 object-cover shadow-xl"
                      />
                      <h3 className="text-white text-lg font-bold">{remoteUser?.name}</h3>
                      <p className="text-primary text-[10px] uppercase font-bold tracking-wider">Voice Call Connected</p>
                      {/* Hidden tag to play remote audio */}
                      {remoteStream && <AudioPlayer stream={remoteStream} />}
                    </div>
                  )}

                  {/* Remote video fullscreen trigger button */}
                  {callType === 'video' && (
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="absolute bottom-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-xl border border-neutral-800 transition-all z-20 shadow-md"
                    >
                      <Maximize size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls Panel */}
            <div className="w-full max-w-xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-md rounded-3xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4 shadow-xl z-20 px-3 sm:px-6">
              <button
                onClick={toggleMute}
                className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 border ${
                  isMuted 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
                    : 'bg-neutral-800 border-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {callType === 'video' && (
                <>
                  <button
                    onClick={toggleCamera}
                    className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 border ${
                      isCameraOff
                        ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                        : 'bg-neutral-800 border-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                    title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>

                  <button
                    onClick={toggleScreenShare}
                    className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 border ${
                      isScreenSharing
                        ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                        : 'bg-neutral-800 border-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                    title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                  >
                    {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                  </button>
                </>
              )}

              {isGroup && (
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 border ${
                    chatOpen
                      ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                      : 'bg-neutral-800 border-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                  title="In-call chat"
                >
                  <MessageSquare size={20} />
                </button>
              )}

              <button
                onClick={toggleSpeaker}
                className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 border ${
                  isSpeakerOn
                    ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                    : 'bg-neutral-800 border-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Toggle Speaker"
              >
                <Volume2 size={20} />
              </button>

              <button
                onClick={endCall}
                className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-md shadow-red-500/10 scale-100 hover:scale-105"
                title="End Call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>

          {/* Group Call Chat Sidebar Panel Overlay */}
          {chatOpen && isGroup && (
            <div className="absolute lg:relative w-full lg:w-80 h-full inset-0 lg:inset-auto bg-neutral-900 border-l border-neutral-800/80 flex flex-col justify-between p-4 shrink-0 z-30 animate-scale-up rounded-none lg:rounded-l-3xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-3">
                <span className="text-white text-xs font-bold uppercase tracking-wider">Group Call Chat</span>
                <button onClick={() => setChatOpen(false)} className="text-neutral-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Chat history stream */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 py-1">
                {chatMessages.length === 0 ? (
                  <p className="text-neutral-600 text-xs italic text-center py-6 select-none">No messages sent in call yet.</p>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <span className="text-[9px] text-neutral-500 font-bold mb-0.5 leading-tight">{msg.Sender?.name}</span>
                        <div className={`px-3 py-1.5 rounded-2xl text-xs font-medium ${isMe ? 'bg-primary text-secondary' : 'bg-neutral-850 text-white'}`}>
                          {msg.text.replace('[In-Call Message]: ', '')}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input box form */}
              <form onSubmit={sendChatMessage} className="flex gap-2 border-t border-neutral-800 pt-3 mt-3">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button type="submit" className="p-2 bg-primary hover:bg-primary-light text-secondary rounded-xl shadow-md shrink-0">
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default CallOverlay;
