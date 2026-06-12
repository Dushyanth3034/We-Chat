import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();

  // Call States: 'idle', 'incoming', 'outgoing', 'ongoing'
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio'); // 'audio', 'video'
  const [isGroup, setIsGroup] = useState(false);
  const [activeCallId, setActiveCallId] = useState(null); // Database record ID (1-to-1 or group call)
  const [groupId, setGroupId] = useState(null);

  // Participant Metadata
  const [remoteUser, setRemoteUser] = useState(null); // For 1-to-1 { id, name, profileImage }
  const [participants, setParticipants] = useState([]); // Array of { id, name, profileImage, isSpeaking, isMuted, isCameraOff }
  
  // Media streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); // For 1-to-1
  const [remoteStreams, setRemoteStreams] = useState({}); // For group: userId -> MediaStream
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Hardware states
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // WebRTC Connections References
  const peerConnectionRef = useRef(null); // 1-to-1 connection
  const peerConnectionsRef = useRef({}); // Group connections: userId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callTimerRef = useRef(null);

  // Ringtone Players
  const ringtoneRef = useRef(null);
  const dialtoneRef = useRef(null);

  // Sync references
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Clean streams and timers on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      stopSounds();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  // Timer counter
  useEffect(() => {
    if (callState === 'ongoing') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
  }, [callState]);

  // Play/Stop Audio Sounds helper
  const playSound = (type) => {
    stopSounds();
    if (type === 'ringtone') {
      // Incoming call ringtone (simulated using standard oscillators or web audio API if no mp3, but we can load a royalty free link)
      ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => console.log('Audio play blocked:', e));
    } else if (type === 'dialtone') {
      // Outgoing call ringtone
      dialtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1657/1657-84.wav');
      dialtoneRef.current.loop = true;
      dialtoneRef.current.play().catch(e => console.log('Audio play blocked:', e));
    }
  };

  const stopSounds = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
    if (dialtoneRef.current) {
      dialtoneRef.current.pause();
      dialtoneRef.current = null;
    }
  };

  const stopAllTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
    setRemoteStream(null);
    setRemoteStreams({});
  };

  // Socket listener bindings
  useEffect(() => {
    if (!socket || !user) return;

    // 1-to-1 CALLS SIGNALING LISTENERS
    const handleIncomingCall = async ({ signal, from, callType, callerName, callerAvatar, callLogId }) => {
      if (callState !== 'idle') {
        // Busy, auto-reject
        socket.emit('reject-call', { to: from.id });
        return;
      }

      setCallState('incoming');
      setCallType(callType);
      setIsGroup(false);
      setActiveCallId(callLogId);
      setRemoteUser({ id: from.id, name: callerName, profileImage: callerAvatar });
      
      // Store the initial offer signal
      peerConnectionRef.current = signal;

      playSound('ringtone');
    };

    const handleCallAccepted = async ({ signal }) => {
      stopSounds();
      setCallState('ongoing');

      try {
        if (peerConnectionRef.current && signal) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } catch (err) {
        console.error('Accept signal setRemoteDescription error:', err);
      }
    };

    const handleCallRejected = () => {
      stopSounds();
      stopAllTracks();
      setCallState('idle');
      alert('Call rejected.');
    };

    const handleCallEnded = () => {
      stopSounds();
      stopAllTracks();
      setCallState('idle');
    };

    const handleCallMissed = () => {
      stopSounds();
      stopAllTracks();
      setCallState('idle');
      alert('Call missed.');
    };

    const handleWebRTCOffer = async ({ offer, senderId }) => {
      try {
        const pc = peerConnectionsRef.current[senderId] || peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-answer', { to: senderId, answer, senderId: user.id });
        }
      } catch (err) {
        console.error('handleWebRTCOffer error:', err);
      }
    };

    const handleWebRTCAnswer = async ({ answer, senderId }) => {
      try {
        const pc = peerConnectionsRef.current[senderId] || peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('handleWebRTCAnswer error:', err);
      }
    };

    const handleWebRTCIceCandidate = async ({ candidate, senderId }) => {
      try {
        const pc = peerConnectionsRef.current[senderId] || peerConnectionRef.current;
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('handleWebRTCIceCandidate error:', err);
      }
    };

    // GROUP CALL SIGNALING LISTENERS
    const handleGroupCallStarted = ({ groupId: callGroupId, groupCallId, callType: groupCallType, callerName }) => {
      // Notify active client they have an active incoming group call banner to join
      setGroupId(callGroupId);
      setActiveCallId(groupCallId);
      // Optional display notification
      console.log(`Group call ${groupCallType} started in group ${callGroupId} by ${callerName}`);
    };

    const handleParticipantJoined = async ({ userId: joinedUserId, userName }) => {
      if (!isGroup || !activeCallId) return;

      console.log(`Participant joined group call: ${userName} (${joinedUserId})`);
      
      // Initialize peer connection to the newly joined user
      const pc = createGroupPeerConnection(joinedUserId);
      peerConnectionsRef.current[joinedUserId] = pc;

      // Create offer to send to the newly joined user
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          to: joinedUserId,
          offer,
          senderId: user.id,
          isGroup: true,
          groupCallId: activeCallId
        });
      } catch (err) {
        console.error('Failed to create offer to new participant:', err);
      }
    };

    const handleParticipantLeft = ({ userId: leftUserId }) => {
      console.log(`Participant left group call: ${leftUserId}`);
      
      // Close peer connection
      if (peerConnectionsRef.current[leftUserId]) {
        peerConnectionsRef.current[leftUserId].close();
        delete peerConnectionsRef.current[leftUserId];
      }

      // Remove stream
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[leftUserId];
        return copy;
      });
    };

    const handleGroupCallEnded = () => {
      stopSounds();
      stopAllTracks();
      setCallState('idle');
      alert('Group call ended.');
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-missed', handleCallMissed);
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate);
    socket.on('group-call-started', handleGroupCallStarted);
    socket.on('participant-joined', handleParticipantJoined);
    socket.on('participant-left', handleParticipantLeft);
    socket.on('group-call-ended', handleGroupCallEnded);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-missed', handleCallMissed);
      socket.off('webrtc-offer', handleWebRTCOffer);
      socket.off('webrtc-answer', handleWebRTCAnswer);
      socket.off('webrtc-ice-candidate', handleWebRTCIceCandidate);
      socket.off('group-call-started', handleGroupCallStarted);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('group-call-ended', handleGroupCallEnded);
    };
  }, [socket, user, callState, isGroup, activeCallId]);

  // 1-to-1 Peer Connection Creator
  const createPeerConnection = (targetUserId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
          senderId: user.id
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  // Group Peer Connection Creator
  const createGroupPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
          senderId: user.id,
          isGroup: true,
          groupCallId: activeCallId
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    return pc;
  };

  // ==========================================
  // CLIENT TRIGGER HANDLERS
  // ==========================================

  // 1. Initiate 1-to-1 Audio/Video Call
  const startCall = async (targetUser, type) => {
    setErrorState(null);
    setCallState('outgoing');
    setCallType(type);
    setIsGroup(false);
    setRemoteUser(targetUser);

    playSound('dialtone');

    try {
      // Create Database log record first
      const logRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls`, {
        receiverId: targetUser.id,
        callType: type
      });
      const callLogId = logRes.data.id;
      setActiveCallId(callLogId);

      // Grab local user media tracks
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Create WebRTC peer connection
      const pc = createPeerConnection(targetUser.id, stream);
      peerConnectionRef.current = pc;

      // Create WebRTC offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit calling signal to target
      socket.emit('call-user', {
        userToCall: targetUser.id,
        signalData: offer,
        from: { id: user.id, name: user.name, profileImage: user.profileImage },
        callType: type,
        callerName: user.name,
        callerAvatar: user.profileImage,
        callLogId
      });
    } catch (err) {
      console.error('Failed to start call:', err);
      stopSounds();
      stopAllTracks();
      setCallState('idle');
      alert('Could not start call. Check microphone/camera access.');
    }
  };

  // 2. Accept Incoming Call
  const acceptCall = async () => {
    stopSounds();
    if (callState !== 'incoming' || !remoteUser || !activeCallId) return;

    setCallState('ongoing');

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Get stored offer signal
      const offerSignal = peerConnectionRef.current;

      // Create local peer connection
      const pc = createPeerConnection(remoteUser.id, stream);
      peerConnectionRef.current = pc;

      // Initialize connection descriptors
      await pc.setRemoteDescription(new RTCSessionDescription(offerSignal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit accepted answer signal
      socket.emit('accept-call', {
        to: remoteUser.id,
        signal: answer
      });

      // Update call DB status
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/${activeCallId}`, {
        status: 'completed'
      });
    } catch (err) {
      console.error('Accept call error:', err);
      stopAllTracks();
      setCallState('idle');
      alert('Could not accept call. Media hardware failed.');
    }
  };

  // 3. Reject Incoming Call
  const rejectCall = async () => {
    stopSounds();
    if (callState !== 'incoming' || !remoteUser || !activeCallId) return;

    socket.emit('reject-call', { to: remoteUser.id });

    // Update DB status to rejected
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/${activeCallId}`, {
        status: 'rejected'
      });
    } catch (err) {
      console.error(err);
    }

    setCallState('idle');
    stopAllTracks();
  };

  // 4. End Ongoing Call
  const endCall = async () => {
    stopSounds();
    if (callState === 'idle') return;

    if (isGroup) {
      // Leave group call
      if (activeCallId) {
        socket.emit('group-call-leave', { groupCallId: activeCallId, userId: user.id });
        try {
          await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/group/${activeCallId}/leave`);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      // End 1-to-1 call
      if (remoteUser) {
        socket.emit('end-call', { to: remoteUser.id });
      }
      // Update DB record with call duration
      if (activeCallId) {
        try {
          await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/${activeCallId}`, {
            duration: callDuration
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Terminate local RTCPeerConnections
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((key) => {
      peerConnectionsRef.current[key].close();
    });
    peerConnectionsRef.current = {};

    setCallState('idle');
    stopAllTracks();
  };

  // 5. Start Group Call
  const startGroupCall = async (groupCallGroupId, type) => {
    setErrorState(null);
    setCallState('ongoing');
    setCallType(type);
    setIsGroup(true);
    setGroupId(groupCallGroupId);

    try {
      // Create group call record in DB
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/group`, {
        groupId: groupCallGroupId,
        callType: type
      });
      const groupCallId = res.data.id;
      setActiveCallId(groupCallId);

      // Acquire media tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);

      // Join group call socket room and notify group members
      socket.emit('group-call-join', {
        groupCallId,
        userId: user.id,
        userName: user.name
      });

      socket.emit('group-call-start', {
        groupId: groupCallGroupId,
        groupCallId,
        callType: type,
        callerName: user.name,
        callerAvatar: user.profileImage
      });
    } catch (err) {
      console.error('Start group call error:', err);
      stopAllTracks();
      setCallState('idle');
      alert('Could not start group call. Check media access.');
    }
  };

  // 6. Join Existing Group Call
  const joinGroupCall = async (groupCallId, type, groupCallGroupId) => {
    setErrorState(null);
    setCallState('ongoing');
    setCallType(type);
    setIsGroup(true);
    setGroupId(groupCallGroupId);
    setActiveCallId(groupCallId);

    try {
      // Create participant join record in DB
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calls/group/${groupCallId}/join`);

      // Acquire media tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);

      // Join group call socket room
      socket.emit('group-call-join', {
        groupCallId,
        userId: user.id,
        userName: user.name
      });
    } catch (err) {
      console.error('Join group call error:', err);
      stopAllTracks();
      setCallState('idle');
      alert('Could not join group call. Check media access.');
    }
  };

  // ==========================================
  // HARDWARE TOGGLES
  // ==========================================

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  // ==========================================
  // SCREEN SHARING IMPLEMENTATION
  // ==========================================

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and switch back to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        const videoTrack = stream.getVideoTracks()[0];
        
        // Update local stream state
        setLocalStream((prev) => {
          const oldVideoTrack = prev.getVideoTracks()[0];
          if (oldVideoTrack) oldVideoTrack.stop();
          return new MediaStream([prev.getAudioTracks()[0], videoTrack]);
        });

        // Replace track in peer connections
        replaceTrackInConnections(videoTrack);

        setIsScreenSharing(false);
        if (socket && activeCallId) {
          socket.emit('screen-share-stop', { groupCallId: activeCallId, userId: user.id });
        }
      } catch (err) {
        console.error('Failed to restore camera stream:', err);
      }
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        // Handle user stopping screen share from browser system dialog
        screenTrack.onended = () => {
          toggleScreenShare(); // revert back to camera
        };

        // Update local stream state
        setLocalStream((prev) => {
          const oldVideoTrack = prev.getVideoTracks()[0];
          if (oldVideoTrack) oldVideoTrack.stop();
          return new MediaStream([prev.getAudioTracks()[0], screenTrack]);
        });

        // Replace track in peer connections
        replaceTrackInConnections(screenTrack);

        setIsScreenSharing(true);
        if (socket && activeCallId) {
          socket.emit('screen-share-start', { groupCallId: activeCallId, userId: user.id });
        }
      } catch (err) {
        console.error('Display media request rejected:', err);
      }
    }
  };

  const replaceTrackInConnections = (newTrack) => {
    if (isGroup) {
      Object.keys(peerConnectionsRef.current).forEach((key) => {
        const pc = peerConnectionsRef.current[key];
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      });
    } else {
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      }
    }
  };

  const [errorState, setErrorState] = useState(null);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        isGroup,
        activeCallId,
        groupId,
        remoteUser,
        participants,
        localStream,
        remoteStream,
        remoteStreams,
        isScreenSharing,
        isMuted,
        isCameraOff,
        isSpeakerOn,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        startGroupCall,
        joinGroupCall,
        toggleMute,
        toggleCamera,
        toggleSpeaker,
        toggleScreenShare,
        errorState
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
