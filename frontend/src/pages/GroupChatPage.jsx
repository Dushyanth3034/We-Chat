import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Send,
  Paperclip,
  Smile,
  Plus,
  Users,
  X,
  FileText,
  Download,
  MoreVertical,
  LogOut,
  UserPlus,
  Trash2,
  ShieldAlert,
  Phone,
  Video,
  Mic,
  Shield,
  Search,
  ArrowRight,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';
import { useCall } from '../context/CallContext';
import { MOCK_GROUPS, MOCK_GROUP_MESSAGES, MOCK_FRIENDS } from '../utils/demoData';

// E2E Utility imports
import {
  decryptConversationKey,
  generateConversationKey,
  encryptConversationKey,
  encryptPayload,
  decryptPayload,
  encryptFile,
  decryptFile
} from '../utils/e2e';

// Feature Components imports
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import ReactionSelector from '../components/ReactionSelector';
import ReactionBadge from '../components/ReactionBadge';
import SearchModal from '../components/SearchModal';

const getGroupImageUrl = (groupImage, groupName) => {
  if (!groupImage) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName || 'Group')}`;
  }
  if (groupImage.startsWith('http://') || groupImage.startsWith('https://')) {
    return groupImage;
  }
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${groupImage}`;
};

const fetchAndDecryptFile = async (fileUrl, conversationKeyStr) => {
  const response = await fetch(fileUrl);
  const encryptedBlob = await response.blob();

  // Guess MIME type from extension
  let mimeType = '';
  const ext = fileUrl.split('.').pop().toLowerCase();
  if (ext === 'webm') {
    mimeType = 'audio/webm';
  } else if (ext === 'wav') {
    mimeType = 'audio/wav';
  } else if (['jpg', 'jpeg'].includes(ext)) {
    mimeType = 'image/jpeg';
  } else if (ext === 'png') {
    mimeType = 'image/png';
  } else if (ext === 'gif') {
    mimeType = 'image/gif';
  } else if (ext === 'pdf') {
    mimeType = 'application/pdf';
  }

  const decryptedBlob = await decryptFile(encryptedBlob, conversationKeyStr, mimeType);
  return URL.createObjectURL(decryptedBlob);
};

const parseCallLog = (text) => {
  if (!text || !text.startsWith('[Call Log]: ')) return null;
  const body = text.replace('[Call Log]: ', '');
  
  if (body.startsWith('Group Call')) {
    const parts = body.split(' | ');
    return {
      isGroup: true,
      type: parts[1], // 'audio' | 'video'
      status: parts[2] // 'started' | 'completed'
    };
  }
  
  const parts = body.split(' | ');
  const callTypePart = parts[0]; // e.g. "audio call finished"
  const type = callTypePart.includes('video') ? 'video' : 'audio';
  return {
    isGroup: false,
    type,
    status: parts[1], // 'completed' | 'rejected' | 'missed' | 'calling'
    duration: parseInt(parts[2] || '0', 10)
  };
};

const formatDuration = (secs) => {
  if (!secs) return '0s';
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  if (mins > 0) {
    return `${mins}m ${remainingSecs}s`;
  }
  return `${remainingSecs}s`;
};

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '😊', '😍', '😘', '😜', '😎', '👍', '👏', '🔥', '🎉'];

const GroupChatPage = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const { startGroupCall } = useCall();

  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [fileAttachment, setFileAttachment] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  // Group members details side-drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [friends, setFriends] = useState([]); // Used to add members

  // Create Group Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupImageFile, setGroupImageFile] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState('');

  // Add Member Modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [friendsToAdd, setFriendsToAdd] = useState([]);

  // Sockets real-time
  const [typingStatus, setTypingStatus] = useState({}); // userId -> { senderName, isTyping }

  // Feature specific states
  const [conversationKeys, setConversationKeys] = useState({}); // cacheKey -> keyStr
  const [activeKey, setActiveKey] = useState(null);
  const [decryptedMessages, setDecryptedMessages] = useState({}); // msg.id -> decryptedText
  const [decryptedFiles, setDecryptedFiles] = useState({}); // msg.id -> objectUrl
  
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargets, setForwardTargets] = useState([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showReactionPickerId, setShowReactionPickerId] = useState(null);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState('above');
  const [reactionDirection, setReactionDirection] = useState('above');

  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const groupImageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Intercept back button on mobile
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    if (!activeGroup) return;

    // Push a dummy state to browser history
    window.history.pushState({ isGroupChatOpen: true }, '');

    const handlePopState = (event) => {
      setActiveGroup(null);
      setDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeGroup]);

  // Fetch groups
  const fetchGroups = async () => {
    if (user?.role === 'guest') {
      setGroups(MOCK_GROUPS);
      if (MOCK_GROUPS.length > 0 && !activeGroup && window.innerWidth >= 768) {
        setActiveGroup(MOCK_GROUPS[0]);
      }
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups`);
      setGroups(res.data);
      if (res.data.length > 0 && !activeGroup && window.innerWidth >= 768) {
        setActiveGroup(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroups();
    
    // Fetch friends list for member additions
    const fetchFriends = async () => {
      if (user?.role === 'guest') {
        setFriends(MOCK_FRIENDS);
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends`);
        setFriends(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFriends();
  }, [user]);

  // Load E2E conversation key
  useEffect(() => {
    if (!activeGroup || !user || user?.role === 'guest') return;

    const loadConversationKey = async () => {
      const cacheKey = `group_${activeGroup.id}`;
      if (conversationKeys[cacheKey]) {
        setActiveKey(conversationKeys[cacheKey]);
        return;
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key?groupId=${activeGroup.id}`);
        const myPrivKey = localStorage.getItem(`wechat_privkey_${user.id}`);
        if (myPrivKey) {
          const decryptedKey = await decryptConversationKey(res.data.encryptedKey, myPrivKey);
          setActiveKey(decryptedKey);
          setConversationKeys(prev => ({ ...prev, [cacheKey]: decryptedKey }));
          return;
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Key doesn't exist yet, we need to negotiate one
          try {
            const keysRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/group-keys/${activeGroup.id}`);
            const members = keysRes.data;
            const { keyStr } = await generateConversationKey();
            
            const keysToStore = [];
            for (const m of members) {
              if (m.publicKey) {
                const encrypted = await encryptConversationKey(keyStr, m.publicKey);
                keysToStore.push({ userId: m.id, groupId: activeGroup.id, encryptedKey: encrypted });
              }
            }

            if (keysToStore.length > 0) {
              await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key`, { keys: keysToStore });
              setActiveKey(keyStr);
              setConversationKeys(prev => ({ ...prev, [cacheKey]: keyStr }));
            }
          } catch (negotiateErr) {
            console.error('Failed to negotiate group key:', negotiateErr);
          }
        } else {
          console.error('Failed to load group conversation key:', err);
        }
      }
    };

    loadConversationKey();
  }, [activeGroup, user]);

  // Decrypt group message texts
  useEffect(() => {
    const decryptAll = async () => {
      const decrypted = { ...decryptedMessages };
      let changed = false;
      const cacheKey = activeGroup ? `group_${activeGroup.id}` : null;
      const key = cacheKey ? conversationKeys[cacheKey] : null;

      for (const msg of messages) {
        if (!decrypted[msg.id]) {
          if (msg.message && msg.message.startsWith('[E2E]:')) {
            if (key) {
              try {
                const text = await decryptPayload(msg.message, key);
                decrypted[msg.id] = text;
                changed = true;
              } catch (err) {
                console.error('Error decrypting group message:', msg.id, err);
                decrypted[msg.id] = '[Decryption failed]';
                changed = true;
              }
            } else {
              decrypted[msg.id] = '[Encrypted message - Key not loaded]';
              changed = true;
            }
          } else {
            decrypted[msg.id] = msg.message;
          }
        }
        // Decrypt parent message if replying
        if (msg.ReplyLink?.ParentMessage) {
          const parent = msg.ReplyLink.ParentMessage;
          if (!decrypted[parent.id]) {
            if (parent.message && parent.message.startsWith('[E2E]:')) {
              if (key) {
                try {
                  const text = await decryptPayload(parent.message, key);
                  decrypted[parent.id] = text;
                  changed = true;
                } catch (err) {
                  console.error('Error decrypting parent message:', parent.id, err);
                  decrypted[parent.id] = '[Decryption failed]';
                  changed = true;
                }
              } else {
                decrypted[parent.id] = '[Encrypted message - Key not loaded]';
                changed = true;
              }
            } else {
              decrypted[parent.id] = parent.message;
            }
          }
        }
      }

      if (changed) {
        setDecryptedMessages(decrypted);
      }
    };
    if (messages.length > 0) {
      decryptAll();
    }
  }, [messages, activeGroup, conversationKeys]);

  // Decrypt group message files
  useEffect(() => {
    const decryptAllFiles = async () => {
      const newDecrypted = { ...decryptedFiles };
      let changed = false;
      const cacheKey = activeGroup ? `group_${activeGroup.id}` : null;
      const key = cacheKey ? conversationKeys[cacheKey] : null;

      for (const msg of messages) {
        if (msg.fileUrl && !newDecrypted[msg.id]) {
          const isEncrypted = msg.message && msg.message.startsWith('[E2E]:');
          if (isEncrypted && key) {
            try {
              const url = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.fileUrl}`;
              const decryptedUrl = await fetchAndDecryptFile(url, key);
              newDecrypted[msg.id] = decryptedUrl;
              changed = true;
            } catch (err) {
              console.error('Failed to decrypt group file:', msg.id, err);
            }
          }
        }
      }
      if (changed) {
        setDecryptedFiles(newDecrypted);
      }
    };
    if (messages.length > 0 && activeGroup) {
      decryptAllFiles();
    }
  }, [messages, activeGroup, conversationKeys]);


  // Fetch group messages when active group changes
  useEffect(() => {
    if (!activeGroup) return;

    const fetchMessages = async () => {
      if (user?.role === 'guest') {
        setMessages(MOCK_GROUP_MESSAGES[activeGroup.id] || []);
        scrollToBottom();
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${activeGroup.id}/messages`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();

    // Fetch full group details (with creator details)
    const fetchDetails = async () => {
      if (user?.role === 'guest') {
        setGroupDetails(activeGroup);
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${activeGroup.id}`);
        setGroupDetails(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();

    // Subscribe to group socket room
    if (socket && user?.role !== 'guest') {
      socket.emit('join_group', activeGroup.id);
    }

    return () => {
      if (socket && activeGroup && user?.role !== 'guest') {
        socket.emit('leave_group', activeGroup.id);
      }
    };
  }, [activeGroup, socket, user]);

  // Listen to Socket.IO group events
  useEffect(() => {
    if (!socket) return;

    const handleNewGroupMessage = (msg) => {
      if (activeGroup && msg.groupId === activeGroup.id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    const handleGroupTyping = ({ groupId, senderId, senderName, isTyping }) => {
      if (activeGroup && groupId === activeGroup.id && senderId !== user.id) {
        setTypingStatus((prev) => ({
          ...prev,
          [senderId]: isTyping ? senderName : null,
        }));
      }
    };

    const handleUpdateReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, Reactions: reactions } : msg))
      );
    };

    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_typing', handleGroupTyping);
    socket.on('update_reaction', handleUpdateReaction);

    return () => {
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_typing', handleGroupTyping);
      socket.off('update_reaction', handleUpdateReaction);
    };
  }, [socket, activeGroup]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeGroup) return;

    socket.emit('group_typing', { groupId: activeGroup.id, senderId: user.id, senderName: user.name, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('group_typing', { groupId: activeGroup.id, senderId: user.id, senderName: user.name, isTyping: false });
    }, 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileAttachment(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  // Toggle reactions
  const handleToggleReaction = async (messageId, emoji) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reactions/toggle`, { messageId, reaction: emoji });
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, Reactions: res.data.reactions } : msg))
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Forward message logic
  const handleForwardMessage = async () => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (!forwardingMessage || forwardTargets.length === 0) return;

    const isEncrypted = forwardingMessage.message && forwardingMessage.message.startsWith('[E2E]:');
    let plainText = decryptedMessages[forwardingMessage.id] || forwardingMessage.message;
    let fileUrl = forwardingMessage.fileUrl;
    let type = forwardingMessage.messageType;

    for (const targetId of forwardTargets) {
      const isGroup = targetId.startsWith('group_');
      const realId = parseInt(targetId.replace('group_', '').replace('friend_', ''), 10);

      const cacheKey = isGroup ? `group_${realId}` : `dm_${realId}`;
      let targetKey = conversationKeys[cacheKey];
      
      if (!targetKey) {
        try {
          if (isGroup) {
            const keyRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key?groupId=${realId}`);
            const myPrivKey = localStorage.getItem(`wechat_privkey_${user.id}`);
            if (myPrivKey) {
              targetKey = await decryptConversationKey(keyRes.data.encryptedKey, myPrivKey);
              setConversationKeys(prev => ({ ...prev, [cacheKey]: targetKey }));
            }
          } else {
            const keyRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key?friendId=${realId}`);
            const myPrivKey = localStorage.getItem(`wechat_privkey_${user.id}`);
            if (myPrivKey) {
              targetKey = await decryptConversationKey(keyRes.data.encryptedKey, myPrivKey);
              setConversationKeys(prev => ({ ...prev, [cacheKey]: targetKey }));
            }
          }
        } catch (err) {
          // Key negotiation
          try {
            if (isGroup) {
              const keysRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/group-keys/${realId}`);
              const members = keysRes.data;
              const { keyStr } = await generateConversationKey();
              const keysToStore = [];
              for (const m of members) {
                if (m.publicKey) {
                  const encrypted = await encryptConversationKey(keyStr, m.publicKey);
                  keysToStore.push({ userId: m.id, groupId: realId, encryptedKey: encrypted });
                }
              }
              if (keysToStore.length > 0) {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key`, { keys: keysToStore });
                targetKey = keyStr;
                setConversationKeys(prev => ({ ...prev, [cacheKey]: keyStr }));
              }
            } else {
              const friendRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/public-key/${realId}`);
              const friendPubKey = friendRes.data.publicKey;
              if (friendPubKey) {
                const myPubKey = user.publicKey;
                const { keyStr } = await generateConversationKey();
                const encryptedForMe = await encryptConversationKey(keyStr, myPubKey);
                const encryptedForFriend = await encryptConversationKey(keyStr, friendPubKey);
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/e2e/conversation-key`, {
                  keys: [
                    { userId: user.id, friendId: realId, encryptedKey: encryptedForMe },
                    { userId: realId, friendId: user.id, encryptedKey: encryptedForFriend }
                  ]
                });
                targetKey = keyStr;
                setConversationKeys(prev => ({ ...prev, [cacheKey]: keyStr }));
              }
            }
          } catch (negErr) {
            console.error('Failed key negotiation during forward:', negErr);
          }
        }
      }

      let encryptedMessage = plainText;
      if (targetKey && plainText) {
        encryptedMessage = await encryptPayload(plainText, targetKey);
      }

      let finalBlob = null;
      if (fileUrl && isEncrypted && targetKey) {
        try {
          const decryptedUrl = decryptedFiles[forwardingMessage.id];
          if (decryptedUrl) {
            const response = await fetch(decryptedUrl);
            const blob = await response.blob();
            finalBlob = await encryptFile(blob, targetKey);
          }
        } catch (err) {
          console.error('Failed to encrypt file for forwarding:', err);
        }
      }

      const formData = new FormData();
      if (isGroup) {
        formData.append('groupId', realId);
      } else {
        formData.append('receiverId', realId);
      }
      formData.append('message', encryptedMessage);
      formData.append('messageType', type);
      formData.append('isForwarded', 'true');

      if (finalBlob) {
        const originalName = fileUrl.split('/').pop();
        formData.append('file', finalBlob, originalName);
      } else if (fileUrl && !isEncrypted) {
        try {
          const response = await fetch(fileUrl.startsWith('http') ? fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fileUrl}`);
          const blob = await response.blob();
          const uploadBlob = targetKey ? await encryptFile(blob, targetKey) : blob;
          formData.append('file', uploadBlob, fileUrl.split('/').pop());
        } catch (err) {
          console.error('Failed to re-upload unencrypted file during forward:', err);
        }
      }

      const url = isGroup ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/message` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chats/message`;
      await axios.post(url, formData);
    }

    setForwardingMessage(null);
    setForwardTargets([]);
    setShowForwardModal(false);

    if (activeGroup) {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${activeGroup.id}/messages`);
      setMessages(res.data);
      scrollToBottom();
    }
  };

  // Send voice note in group
  const handleSendVoiceNote = async (audioBlob, duration) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      const cacheKey = `group_${activeGroup.id}`;
      const key = conversationKeys[cacheKey];

      let uploadBlob = audioBlob;
      let textPayload = `[Voice Note]||${duration}`;

      if (key) {
        uploadBlob = await encryptFile(audioBlob, key);
        textPayload = await encryptPayload(`[Voice Note]||${duration}`, key);
      }

      const formData = new FormData();
      formData.append('groupId', activeGroup.id);
      formData.append('duration', duration);
      formData.append('audio', uploadBlob, 'voice-note.webm');
      formData.append('message', textPayload);

      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/voice`, formData);
      setShowVoiceRecorder(false);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send voice note in group:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to send messages.");
      return;
    }
    if (!inputText.trim() && !fileAttachment) return;

    let messageToSend = inputText;
    let uploadFile = fileAttachment;

    if (activeKey) {
      if (inputText.trim()) {
        messageToSend = await encryptPayload(inputText, activeKey);
      } else if (fileAttachment) {
        messageToSend = await encryptPayload(fileAttachment.name, activeKey);
      }
      if (fileAttachment) {
        uploadFile = await encryptFile(fileAttachment, activeKey);
      }
    }

    const formData = new FormData();
    formData.append('groupId', activeGroup.id);
    formData.append('message', messageToSend);
    if (uploadFile) {
      formData.append('file', uploadFile, fileAttachment.name);
    }
    if (replyingToMessage) {
      formData.append('repliedToMessageId', replyingToMessage.id);
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/message`, formData);

      setInputText('');
      setFileAttachment(null);
      setFilePreview(null);
      setEmojiOpen(false);
      setReplyingToMessage(null);
      scrollToBottom();

      if (socket) {
        socket.emit('group_typing', { groupId: activeGroup.id, senderId: user.id, senderName: user.name, isTyping: false });
      }
    } catch (err) {
      console.error('Failed to send group message:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chats/message/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setMessageMenuOpen(null);
    } catch (err) {
      console.error(err);
    }
  };

  const addEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  // UI state for menus
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);

  // Group creation modal submission
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (!newGroupName.trim()) return;

    const formData = new FormData();
    formData.append('groupName', newGroupName);
    formData.append('memberIds', JSON.stringify(selectedFriends));
    if (groupImageFile) {
      formData.append('groupImage', groupImageFile);
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups`, formData);

      setGroups((prev) => [res.data, ...prev]);
      setActiveGroup(res.data);
      
      // Reset state
      setNewGroupName('');
      setSelectedFriends([]);
      setGroupImageFile(null);
      setGroupImagePreview('');
      setCreateModalOpen(false);
    } catch (err) {
      console.error('Group creation failed:', err);
    }
  };

  const toggleSelectFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  // Group Member additions
  const handleAddMembersSubmit = async (e) => {
    e.preventDefault();
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (friendsToAdd.length === 0 || !activeGroup) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/members`, {
        groupId: activeGroup.id,
        memberIds: friendsToAdd,
      });

      // Refresh details
      const detailsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${activeGroup.id}`);
      setGroupDetails(detailsRes.data);

      setFriendsToAdd([]);
      setAddMemberModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveGroup = async () => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (!window.confirm('Are you sure you want to leave this group chat?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/members/remove`, {
        groupId: activeGroup.id,
        userId: user.id,
      });
      
      // Update sidebar
      const updatedGroups = groups.filter((g) => g.id !== activeGroup.id);
      setGroups(updatedGroups);
      setActiveGroup(updatedGroups.length > 0 ? updatedGroups[0] : null);
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMemberByAdmin = async (memberUserId) => {
    if (user?.role === 'guest') {
      alert("Demo Mode: Sign in to unlock this feature.");
      return;
    }
    if (!window.confirm('Remove this user from the group?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/members/remove`, {
        groupId: activeGroup.id,
        userId: memberUserId,
      });

      // Refresh details
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${activeGroup.id}`);
      setGroupDetails(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const isUserAdmin = () => {
    return groupDetails?.createdBy === user?.id;
  };

  const activeTypingNames = Object.values(typingStatus).filter(Boolean);

  return (
    <div className="flex-1 flex bg-darkBg overflow-hidden relative">
      
      {/* Left Groups Panel */}
      <div className={`w-full md:w-80 h-full border-r border-neutral-800/80 bg-deepBg flex flex-col shrink-0 ${activeGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-800/60 flex justify-between items-center">
          <div>
            <h2 className="text-white font-bold text-lg">Group Chats</h2>
            <p className="text-neutral-500 text-xs mt-0.5">Joined discussions</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="p-2 bg-burgundy hover:bg-burgundy-light text-secondary rounded-xl transition-all shadow-md shadow-burgundy/15"
            title="Create Group"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-neutral-600 text-xs italic">
              You haven't joined any groups yet. Click + to create one.
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setActiveGroup(g);
                  setDrawerOpen(false);
                }}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all duration-300 ${
                  activeGroup?.id === g.id
                    ? 'bg-burgundy/10 border border-burgundy/30 text-white shadow-inner'
                    : 'border border-transparent hover:bg-neutral-800/40 text-neutral-400'
                }`}
              >
                <img
                  src={getGroupImageUrl(g.groupImage, g.groupName)}
                  alt={g.groupName}
                  className="w-12 h-12 rounded-full object-cover border border-neutral-855"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-white text-sm font-semibold truncate">{g.groupName}</h4>
                  <p className="text-neutral-500 text-xs truncate mt-0.5">
                    {g.Members?.length || 0} members
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Messaging Window */}
      {activeGroup ? (
        <div className="flex-1 h-full flex flex-col justify-between bg-neutral-900/10 relative animate-slide-right md:animate-none">
          
          {/* Header */}
          <div className="bg-burgundy/95 px-6 py-4 flex items-center justify-between border-b border-burgundy-dark/25 shadow-md z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    window.history.back();
                  } else {
                    setActiveGroup(null);
                    setDrawerOpen(false);
                  }
                }}
                className="md:hidden p-1.5 -ml-2 text-secondary hover:bg-black/10 rounded-lg transition-colors shrink-0"
                aria-label="Back to groups list"
              >
                <ArrowLeft size={20} />
              </button>
              <img
                src={getGroupImageUrl(activeGroup.groupImage, activeGroup.groupName)}
                alt={activeGroup.groupName}
                className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-secondary text-sm font-semibold truncate flex-1">{activeGroup.groupName}</h3>
                  {activeKey && (
                    <span className="flex items-center gap-0.5 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold shrink-0">
                      <Shield size={10} /> Encrypted
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-secondary/80 block mt-0.5 truncate">
                  {groupDetails?.Members?.length || 0} members
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startGroupCall(activeGroup.id, 'audio')}
                className="p-2 bg-black/10 hover:bg-black/20 text-secondary rounded-xl transition-all"
                title="Start Group Audio Call"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => startGroupCall(activeGroup.id, 'video')}
                className="p-2 bg-black/10 hover:bg-black/20 text-secondary rounded-xl transition-all"
                title="Start Group Video Call"
              >
                <Video size={18} />
              </button>
              <button
                onClick={() => setAdvancedSearchOpen(true)}
                className="p-2 bg-black/10 hover:bg-black/20 text-secondary rounded-xl transition-all"
                title="Advanced Search"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="p-2 bg-black/10 hover:bg-black/20 text-secondary rounded-xl transition-all"
                title="Group settings"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Group Messages Stream */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 flex flex-col gap-4 bg-neutral-900/20">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-8 flex-col gap-2">
                <Users size={32} className="text-neutral-600" />
                <p className="text-neutral-500 text-xs italic">No messages in group yet.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const callLog = parseCallLog(msg.message);
                if (callLog && callLog.isGroup) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3 w-full animate-slide-up">
                      <span className="bg-neutral-855 border border-neutral-800 text-[10px] text-neutral-400 px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 uppercase select-none font-sans">
                        {callLog.type === 'video' ? <Video size={12} className="text-primary" /> : <Phone size={12} className="text-primary" />}
                        {callLog.status === 'started' ? 'Group Call Started' : 'Group Call Ended'}
                      </span>
                    </div>
                  );
                }
                const isMe = msg.senderId === user.id;
                const decMsg = decryptedMessages[msg.id] || msg.message || '';
                const isVoiceNote = msg.messageType === 'file' && (decMsg.startsWith('[Voice Note]') || msg.message?.startsWith('[Voice Note]'));
                const voiceDuration = isVoiceNote ? parseInt(decMsg.split('||')[1] || '0', 10) : 0;

                return (
                  <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-start gap-3 w-full max-w-full group ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    {!isMe && (
                      <img
                        src={getAvatarUrl(msg.Sender?.profileImage, msg.Sender?.name)}
                        alt={msg.Sender?.name}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0"
                      />
                    )}

                    <div className={`flex flex-col max-w-[70%] min-w-0 shrink ${isMe ? 'items-end' : ''}`}>
                      <div className="flex items-center justify-between gap-1.5 mb-1 w-full min-w-0">
                        <span className="text-[10px] text-neutral-500 font-semibold flex-1 truncate">{msg.Sender?.name}</span>
                        <span className="text-[9px] text-neutral-600 font-sans shrink-0">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={`flex items-center gap-2 relative ${isMe ? 'flex-row-reverse' : ''}`}>
                        {/* Standard Chat Bubble */}
                        <div
                          id={`bubble-${msg.id}`}
                          className={`rounded-2xl px-4 py-2.5 shadow-md flex flex-col gap-1 relative min-w-0 ${
                            isMe
                              ? 'bg-burgundy text-secondary rounded-tr-none'
                              : 'bg-charcoal text-neutral-200 border border-neutral-800/80 rounded-tl-none'
                          }`}
                        >
                          {/* Forward Indicator Tag */}
                          {msg.ForwardLink && (
                            <span className="text-[8px] text-primary font-bold uppercase tracking-wide flex items-center gap-0.5 mb-1 select-none">
                              <Share2 size={8} /> Forwarded
                            </span>
                          )}

                          {/* Reply Indicator Preview Link */}
                          {msg.ReplyLink?.ParentMessage && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const element = document.getElementById(`msg-${msg.ReplyLink.ParentMessage.id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  element.classList.add('bg-primary/20');
                                  setTimeout(() => {
                                    element.classList.remove('bg-primary/20');
                                  }, 2000);
                                }
                              }}
                              className="mb-1.5 p-2 rounded-xl bg-black/30 border-l-2 border-primary text-left cursor-pointer hover:bg-black/45 transition-colors"
                            >
                              <p className="text-[8px] text-primary font-bold uppercase tracking-wider">
                                Replying to @{msg.ReplyLink.ParentMessage.Sender?.name || 'User'}
                              </p>
                              <p className="text-[10px] text-neutral-300 truncate mt-0.5">
                                {decryptedMessages[msg.ReplyLink.ParentMessage.id] || msg.ReplyLink.ParentMessage.message}
                              </p>
                            </div>
                          )}

                          {/* Message Types */}
                          {isVoiceNote ? (
                            <VoicePlayer
                              voiceUrl={decryptedFiles[msg.id] || msg.fileUrl}
                              duration={voiceDuration}
                              isMe={isMe}
                              onDelete={() => handleDeleteMessage(msg.id)}
                            />
                          ) : msg.messageType === 'image' ? (
                            <div className="flex flex-col gap-1">
                              <img
                                src={decryptedFiles[msg.id] || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.fileUrl}`}
                                alt="Shared"
                                className="max-w-xs max-h-60 rounded-xl object-contain border border-neutral-800 cursor-pointer"
                                onClick={() => window.open(decryptedFiles[msg.id] || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.fileUrl}`, '_blank')}
                              />
                              {decMsg && !decMsg.startsWith('[E2E]:') && <p className="text-sm leading-relaxed whitespace-pre-wrap">{decMsg}</p>}
                            </div>
                          ) : msg.messageType === 'file' ? (
                            <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl max-w-xs border border-neutral-800">
                              <div className="w-10 h-10 bg-neutral-850 rounded-lg flex items-center justify-center shrink-0 text-primary">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-white font-medium truncate">{decMsg || (msg.fileUrl || '').split('/').pop()}</p>
                                <p className="text-[10px] text-neutral-500">Shared attachment</p>
                              </div>
                              <a
                                href={decryptedFiles[msg.id] || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.fileUrl}`}
                                download={decMsg || (msg.fileUrl || '').split('/').pop()}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-all"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          ) : callLog ? (
                            <div className="flex items-center gap-2 py-0.5 select-none font-medium">
                              {callLog.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                              <span className="text-xs font-semibold">
                                {callLog.status === 'completed'
                                  ? `${callLog.type === 'video' ? 'Video' : 'Voice'} Call (${formatDuration(callLog.duration)})`
                                  : (isMe
                                      ? (callLog.status === 'rejected' ? 'Declined / Busy' : 'No Answer')
                                      : (callLog.status === 'rejected' ? 'Declined' : 'Missed Call')
                                    )
                                }
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{decMsg}</p>
                          )}
                          
                          {/* Message Operations Overlay */}
                          {messageMenuOpen === msg.id && (
                            <div 
                              className={`absolute ${menuDirection === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} ${isMe ? 'right-0' : 'left-0'} bg-[#18181B] border border-[#27272A] rounded-xl p-1.5 shadow-xl z-30 flex flex-col gap-0.5 min-w-[110px] animate-scale-up`}
                              role="menu"
                              aria-label="Message options"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setReplyingToMessage(msg);
                                  setMessageMenuOpen(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all text-left w-full focus:bg-neutral-800 focus:outline-none focus:text-white"
                              >
                                Reply
                              </button>
                              
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setForwardingMessage(msg);
                                  setForwardTargets([]);
                                  setShowForwardModal(true);
                                  setMessageMenuOpen(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all text-left w-full focus:bg-neutral-800 focus:outline-none focus:text-white"
                              >
                                Forward
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const bubbleElement = document.getElementById(`bubble-${msg.id}`);
                                  if (bubbleElement) {
                                    const rect = bubbleElement.getBoundingClientRect();
                                    if (rect.top < 180) {
                                      setReactionDirection('below');
                                    } else {
                                      setReactionDirection('above');
                                    }
                                  }
                                  setShowReactionPickerId(showReactionPickerId === msg.id ? null : msg.id);
                                  setMessageMenuOpen(null);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all text-left w-full focus:bg-neutral-800 focus:outline-none focus:text-white"
                              >
                                React
                              </button>

                              {isMe && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left w-full focus:bg-red-500/10 focus:outline-none"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}

                          {/* Floating Reaction Selector */}
                          {showReactionPickerId === msg.id && (
                            <ReactionSelector
                              onSelect={(emoji) => {
                                handleToggleReaction(msg.id, emoji);
                                setShowReactionPickerId(null);
                              }}
                              onClose={() => setShowReactionPickerId(null)}
                              direction={reactionDirection}
                              isMe={isMe}
                            />
                          )}
                        </div>

                        {/* Message Operations button (Outside of the Bubble) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const bubbleElement = document.getElementById(`bubble-${msg.id}`);
                            if (bubbleElement) {
                              const rect = bubbleElement.getBoundingClientRect();
                              if (rect.top < 200) {
                                setMenuDirection('below');
                              } else {
                                setMenuDirection('above');
                              }
                            }
                            setMessageMenuOpen(messageMenuOpen === msg.id ? null : msg.id);
                          }}
                          className="md:opacity-0 group-hover:opacity-100 opacity-100 p-1 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 text-neutral-500 hover:text-white hover:bg-white/10 shrink-0"
                          aria-label="More message options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {/* Reactions Badges */}
                      <ReactionBadge
                        reactions={msg.Reactions}
                        onToggle={(emoji) => handleToggleReaction(msg.id, emoji)}
                      />
                    </div>

                    {isMe && (
                      <img
                        src={getAvatarUrl(msg.Sender?.profileImage, msg.Sender?.name)}
                        alt={msg.Sender?.name}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0"
                      />
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef}></div>
          </div>

          {/* Group Typing status display */}
          {activeTypingNames.length > 0 && (
            <div className="px-6 py-2 bg-neutral-950/20 text-neutral-500 text-xs flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </span>
              <span>{activeTypingNames.join(', ')} typing...</span>
            </div>
          )}

          {/* Replying message preview bar */}
          {replyingToMessage && (
            <div className="px-6 py-3 bg-neutral-900 border-t border-neutral-800/60 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  Replying to @{replyingToMessage.Sender?.name || 'User'}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {decryptedMessages[replyingToMessage.id] || replyingToMessage.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Attachments preview */}
          {filePreview && (
            <div className="px-6 py-3 bg-neutral-900 border-t border-neutral-800/60 flex items-center gap-4">
              <div className="relative">
                <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-neutral-750" />
                <button
                  type="button"
                  onClick={() => { setFileAttachment(null); setFilePreview(null); }}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X size={10} />
                </button>
              </div>
              <span className="text-neutral-400 text-xs truncate">{fileAttachment.name}</span>
            </div>
          )}

          {fileAttachment && !filePreview && (
            <div className="px-6 py-3 bg-neutral-900 border-t border-neutral-800/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-neutral-300 text-xs">
                <FileText size={18} className="text-primary" />
                <span className="truncate">{fileAttachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setFileAttachment(null)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Chat Inputs Footer */}
          <form onSubmit={handleSendMessage} className="bg-deepBg border-t border-neutral-800/80 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 relative w-full max-w-full min-w-0">
            <div className="flex items-center justify-between border-b border-neutral-800/40 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
                  title="Upload file"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />

                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setEmojiOpen(!emojiOpen)}
                  className={`p-2 rounded-xl transition-all ${emojiOpen ? 'bg-primary/10 text-primary' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                  title="Insert emoji"
                >
                  <Smile size={18} />
                </button>

                {/* Voice note button */}
                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`p-2 rounded-xl transition-all ${showVoiceRecorder ? 'bg-primary/20 text-primary' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                  title="Voice Note"
                >
                  <Mic size={18} />
                </button>
              </div>
            </div>

            {/* Emoji Selector Panel */}
            {emojiOpen && (
              <div className="absolute bottom-20 left-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-3 shadow-xl max-h-40 overflow-y-auto grid grid-cols-8 gap-2 w-72 z-20">
                {EMOJIS.map((emo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addEmoji(emo)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emo}
                  </button>
                ))}
              </div>
            )}

            {/* Composer Input Area or Voice Recorder */}
            {showVoiceRecorder ? (
              <div className="flex justify-center w-full">
                <VoiceRecorder
                  onSend={handleSendVoiceNote}
                  onClose={() => setShowVoiceRecorder(false)}
                />
              </div>
            ) : (
              <div className="flex gap-3 w-full max-w-full min-w-0">
                <input
                  type="text"
                  placeholder="Send a message in group..."
                  value={inputText}
                  onChange={handleInputChange}
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl glass-input text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !fileAttachment}
                  className="p-3 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary rounded-xl shadow-md shadow-burgundy/25 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </form>

          {/* Group details Drawer panel */}
          {drawerOpen && groupDetails && (
            <div className="absolute top-0 right-0 w-full sm:w-80 h-full bg-deepBg border-l border-neutral-800/80 p-6 flex flex-col justify-between shadow-2xl animate-slide-left z-20">
              <div className="flex flex-col gap-6 overflow-y-auto max-h-[75%]">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Group Info</span>
                  <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <img
                    src={getGroupImageUrl(groupDetails.groupImage, groupDetails.groupName)}
                    alt={groupDetails.groupName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-neutral-750"
                  />
                  <h4 className="text-white font-bold text-lg">{groupDetails.groupName}</h4>
                  <p className="text-neutral-500 text-xs">Created by {isUserAdmin() ? 'You' : groupDetails.Creator?.name}</p>
                </div>

                {/* Add Member Shortcut */}
                <button
                  onClick={() => setAddMemberModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-neutral-800 hover:border-burgundy/50 hover:text-white rounded-xl text-xs text-neutral-400 transition-all"
                >
                  <UserPlus size={14} />
                  Invite Members
                </button>

                {/* Members List */}
                <div className="flex flex-col gap-3">
                  <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider block">Members ({groupDetails.Members?.length})</span>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                    {groupDetails.Members?.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 p-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getAvatarUrl(member.User.profileImage, member.User.name)}
                            alt={member.User.name}
                            className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                          />
                          <div className="min-w-0">
                            <h5 className="text-white text-xs font-semibold truncate">
                              {member.User.name} {member.User.id === user.id && '(You)'}
                            </h5>
                          </div>
                        </div>

                        {/* Admin Delete buttons */}
                        {isUserAdmin() && member.User.id !== user.id && (
                          <button
                            onClick={() => handleRemoveMemberByAdmin(member.User.id)}
                            className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded-lg"
                            title="Remove Member"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leave Group */}
              <div className="border-t border-neutral-850 pt-4">
                <button
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 text-sm font-semibold transition-all"
                >
                  <LogOut size={16} />
                  Leave Group Chat
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty state */
        <div className="hidden md:flex flex-1 h-full flex flex-col items-center justify-center text-center p-8 bg-neutral-900/10">
          <Users size={64} className="text-neutral-700 animate-pulse" />
          <h3 className="text-white text-lg font-bold mt-4">Group Chats</h3>
          <p className="text-neutral-500 text-sm mt-1 max-w-sm leading-relaxed">
            Create or select a group conversation from the list to message multiple friends at once. You can upload custom group avatars.
          </p>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-neutral-800 shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh]">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl"
            >
              <X size={18} />
            </button>

            <h3 className="text-white font-bold text-lg mb-1">Create Group Chat</h3>
            <p className="text-neutral-500 text-xs mb-6">Create a room to chat with multiple contacts</p>

            <form onSubmit={handleCreateGroupSubmit} className="flex flex-col gap-5 overflow-y-auto pr-1">
              
              {/* Image upload preview */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={groupImagePreview || `https://api.dicebear.com/7.x/initials/svg?seed=G`}
                    alt="Group Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-neutral-750 group-hover:opacity-75 transition-all"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      ref={groupImageInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setGroupImageFile(file);
                          setGroupImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 font-semibold mb-1 uppercase tracking-wide">Group Photo</label>
                  <button
                    type="button"
                    onClick={() => groupImageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-neutral-850 text-neutral-300 text-xs hover:bg-neutral-800 transition-all"
                  >
                    Select Photo
                  </button>
                </div>
              </div>

              {/* Group Name input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-400 font-medium">Group Name</label>
                <input
                  type="text"
                  placeholder="E.g., Project Sync, Weekend Hangout"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm bg-neutral-900/60"
                  required
                />
              </div>

              {/* Checkbox contacts list */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-neutral-400 font-medium">Invite Friends</label>
                <div className="border border-neutral-850 rounded-2xl p-3 max-h-40 overflow-y-auto flex flex-col gap-2">
                  {friends.length === 0 ? (
                    <p className="text-neutral-600 text-xs italic text-center py-4">Add friends to add them to groups.</p>
                  ) : (
                    friends.map((friend) => (
                      <label key={friend.id} className="flex items-center justify-between p-1 hover:bg-neutral-850/40 rounded-xl cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getAvatarUrl(friend.profileImage, friend.name)}
                            alt={friend.name}
                            className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                          />
                          <span className="text-white text-xs font-semibold truncate">{friend.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.id)}
                          onChange={() => toggleSelectFriend(friend.id)}
                          className="w-4 h-4 accent-burgundy"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="w-full py-3 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold rounded-xl shadow-lg shadow-burgundy/25 transition-all text-sm mt-3"
              >
                Create Group Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBERS MODAL */}
      {addMemberModalOpen && groupDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-neutral-800 shadow-2xl relative animate-scale-up flex flex-col">
            <button
              onClick={() => { setAddMemberModalOpen(false); setFriendsToAdd([]); }}
              className="absolute top-4 right-4 p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl"
            >
              <X size={18} />
            </button>

            <h3 className="text-white font-bold text-lg mb-1">Invite Friends</h3>
            <p className="text-neutral-500 text-xs mb-6">Select friends to add to "{groupDetails.groupName}"</p>

            <form onSubmit={handleAddMembersSubmit} className="flex flex-col gap-4">
              <div className="border border-neutral-850 rounded-2xl p-3 max-h-48 overflow-y-auto flex flex-col gap-2">
                {friends.filter(f => !groupDetails.Members.some(m => m.userId === f.id)).length === 0 ? (
                  <p className="text-neutral-600 text-xs italic text-center py-4">All your friends are already in this group.</p>
                ) : (
                  friends
                    .filter(f => !groupDetails.Members.some(m => m.userId === f.id))
                    .map((friend) => (
                      <label key={friend.id} className="flex items-center justify-between p-1 hover:bg-neutral-850/40 rounded-xl cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getAvatarUrl(friend.profileImage, friend.name)}
                            alt={friend.name}
                            className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                          />
                          <span className="text-white text-xs font-semibold truncate">{friend.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={friendsToAdd.includes(friend.id)}
                          onChange={() => {
                            setFriendsToAdd(prev =>
                              prev.includes(friend.id) ? prev.filter(id => id !== friend.id) : [...prev, friend.id]
                            );
                          }}
                          className="w-4 h-4 accent-burgundy"
                        />
                      </label>
                    ))
                )}
              </div>

              <button
                type="submit"
                disabled={friendsToAdd.length === 0}
                className="w-full py-3 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold rounded-xl shadow-lg shadow-burgundy/25 transition-all text-sm mt-3"
              >
                Send Group Invites ({friendsToAdd.length})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Search Modal overlay */}
      {advancedSearchOpen && (
        <SearchModal
          onClose={() => setAdvancedSearchOpen(false)}
          onJumpToMessage={(msg) => {
            setAdvancedSearchOpen(false);
            const element = document.getElementById(`msg-${msg.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('bg-primary/20');
              setTimeout(() => {
                element.classList.remove('bg-primary/20');
              }, 2000);
            }
          }}
          decryptMessage={async (text, senderId) => {
            const cacheKey = `group_${activeGroup?.id}`;
            const key = conversationKeys[cacheKey];
            if (key) return await decryptPayload(text, key);
            return text;
          }}
        />
      )}

      {/* Forward Modal overlay */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative animate-scale-up flex flex-col max-h-[80vh]">
            <button
              onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}
              className="absolute top-4 right-4 p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl"
            >
              <X size={18} />
            </button>

            <h3 className="text-white font-bold text-base mb-1">Forward Message</h3>
            <p className="text-neutral-500 text-xs mb-4">Select contacts or group chats to forward this message</p>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 max-h-[50vh]">
              {/* Friends list */}
              <div>
                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider block mb-2">Friends</span>
                <div className="flex flex-col gap-2">
                  {friends.map(friend => (
                    <label key={friend.id} className="flex items-center justify-between p-2 hover:bg-neutral-850 rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getAvatarUrl(friend.profileImage, friend.name)}
                          alt={friend.name}
                          className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                        />
                        <span className="text-white text-xs font-semibold truncate">{friend.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={forwardTargets.includes(`friend_${friend.id}`)}
                        onChange={() => {
                          setForwardTargets(prev =>
                            prev.includes(`friend_${friend.id}`)
                              ? prev.filter(t => t !== `friend_${friend.id}`)
                              : [...prev, `friend_${friend.id}`]
                          );
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Groups list */}
              <div>
                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider block mb-2">Groups</span>
                <div className="flex flex-col gap-2">
                  {groups.map(group => (
                    <label key={group.id} className="flex items-center justify-between p-2 hover:bg-neutral-850 rounded-xl cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getGroupImageUrl(group.groupImage, group.groupName)}
                          alt={group.groupName}
                          className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                        />
                        <span className="text-white text-xs font-semibold truncate">{group.groupName}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={forwardTargets.includes(`group_${group.id}`)}
                        onChange={() => {
                          setForwardTargets(prev =>
                            prev.includes(`group_${group.id}`)
                              ? prev.filter(t => t !== `group_${group.id}`)
                              : [...prev, `group_${group.id}`]
                          );
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-4 mt-4 flex gap-3 justify-end">
              <button
                onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleForwardMessage}
                disabled={forwardTargets.length === 0}
                className="px-5 py-2 bg-primary hover:bg-primary-light disabled:opacity-50 text-secondary text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10"
              >
                Forward ({forwardTargets.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GroupChatPage;
