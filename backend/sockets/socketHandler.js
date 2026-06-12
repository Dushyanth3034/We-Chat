const onlineUsers = new Map(); // Map of userId (int) -> socketId (string)

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register user presence
    socket.on('register', (userId) => {
      if (userId) {
        const uId = parseInt(userId, 10);
        onlineUsers.set(uId, socket.id);
        socket.userId = uId;
        console.log(`User ${uId} registered socket ${socket.id}`);
        
        // Broadcast online presence to other clients
        io.emit('user_status', { userId: uId, status: 'online' });
      }
    });

    // Join room for group chats
    socket.on('join_group', (groupId) => {
      if (groupId) {
        socket.join(`group_${groupId}`);
        console.log(`Socket ${socket.id} joined group room group_${groupId}`);
      }
    });

    // Leave room
    socket.on('leave_group', (groupId) => {
      if (groupId) {
        socket.leave(`group_${groupId}`);
        console.log(`Socket ${socket.id} left group room group_${groupId}`);
      }
    });

    // Typing signal - Direct Chat
    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
      const rId = parseInt(receiverId, 10);
      const receiverSocketId = onlineUsers.get(rId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { senderId: parseInt(senderId, 10), isTyping });
      }
    });

    // Typing signal - Group Chat
    socket.on('group_typing', ({ groupId, senderId, senderName, isTyping }) => {
      socket.to(`group_${groupId}`).emit('group_typing', {
        groupId: parseInt(groupId, 10),
        senderId: parseInt(senderId, 10),
        senderName,
        isTyping,
      });
    });

    // Read Receipt transmission
    socket.on('message_read', ({ messageId, senderId, receiverId }) => {
      const sId = parseInt(senderId, 10);
      const senderSocketId = onlineUsers.get(sId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_read', { messageId, receiverId: parseInt(receiverId, 10) });
      }
    });

    // ==========================================
    // ONE-TO-ONE CALL SIGNALING
    // ==========================================

    socket.on('call-user', ({ userToCall, signalData, from, callType, callerName, callerAvatar, callLogId }) => {
      const targetSocketId = onlineUsers.get(parseInt(userToCall, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          signal: signalData,
          from,
          callType,
          callerName,
          callerAvatar,
          callLogId
        });
      }
    });

    socket.on('accept-call', ({ to, signal }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-accepted', { signal });
      }
    });

    socket.on('reject-call', ({ to }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-rejected');
      }
    });

    socket.on('end-call', ({ to }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended');
      }
    });

    socket.on('call-missed', ({ to }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-missed');
      }
    });

    socket.on('webrtc-offer', ({ to, offer, senderId, isGroup, groupCallId }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-offer', { offer, senderId, isGroup, groupCallId });
      }
    });

    socket.on('webrtc-answer', ({ to, answer, senderId, isGroup, groupCallId }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-answer', { answer, senderId, isGroup, groupCallId });
      }
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate, senderId, isGroup, groupCallId }) => {
      const targetSocketId = onlineUsers.get(parseInt(to, 10));
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, senderId, isGroup, groupCallId });
      }
    });

    // ==========================================
    // GROUP CALL SIGNALING
    // ==========================================

    socket.on('group-call-start', ({ groupId, groupCallId, callType, callerName, callerAvatar }) => {
      socket.to(`group_${groupId}`).emit('group-call-started', {
        groupId,
        groupCallId,
        callType,
        callerName,
        callerAvatar
      });
    });

    socket.on('group-call-join', ({ groupCallId, userId, userName }) => {
      socket.join(`group_call_${groupCallId}`);
      console.log(`Socket ${socket.id} joined group call room group_call_${groupCallId}`);
      socket.to(`group_call_${groupCallId}`).emit('participant-joined', {
        userId: parseInt(userId, 10),
        userName
      });
    });

    socket.on('group-call-leave', ({ groupCallId, userId }) => {
      socket.leave(`group_call_${groupCallId}`);
      console.log(`Socket ${socket.id} left group call room group_call_${groupCallId}`);
      socket.to(`group_call_${groupCallId}`).emit('participant-left', {
        userId: parseInt(userId, 10)
      });
    });

    socket.on('group-call-end', ({ groupCallId }) => {
      io.to(`group_call_${groupCallId}`).emit('group-call-ended');
    });

    socket.on('screen-share-start', ({ groupCallId, userId }) => {
      socket.to(`group_call_${groupCallId}`).emit('screen-share-started', {
        userId: parseInt(userId, 10)
      });
    });

    socket.on('screen-share-stop', ({ groupCallId, userId }) => {
      socket.to(`group_call_${groupCallId}`).emit('screen-share-stopped', {
        userId: parseInt(userId, 10)
      });
    });

    socket.on('add-reaction', (payload) => {
      if (payload.groupId) {
        socket.to(`group_${payload.groupId}`).emit('update_reaction', payload);
      } else if (payload.targetUserId) {
        const targetSocketId = onlineUsers.get(parseInt(payload.targetUserId, 10));
        if (targetSocketId) io.to(targetSocketId).emit('update_reaction', payload);
      }
    });

    socket.on('remove-reaction', (payload) => {
      if (payload.groupId) {
        socket.to(`group_${payload.groupId}`).emit('update_reaction', payload);
      } else if (payload.targetUserId) {
        const targetSocketId = onlineUsers.get(parseInt(payload.targetUserId, 10));
        if (targetSocketId) io.to(targetSocketId).emit('update_reaction', payload);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_status', { userId: socket.userId, status: 'offline' });
      }
    });
  });
};

module.exports = {
  socketHandler,
  onlineUsers,
};
