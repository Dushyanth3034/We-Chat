const { VoiceMessage, Chat, User } = require('../models');
const { onlineUsers } = require('../sockets/socketHandler');

const sendVoiceMessage = async (req, res) => {
  try {
    const { receiverId, groupId, duration } = req.body;
    const senderId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'Audio recording file is required.' });
    }

    if (!receiverId && !groupId) {
      return res.status(400).json({ message: 'Either receiver ID or group ID is required.' });
    }

    const voiceUrl = `/uploads/${req.file.filename}`;
    const dur = parseInt(duration || '0', 10);

    // 1. Create VoiceMessage record
    const voiceMsg = await VoiceMessage.create({
      senderId,
      receiverId: receiverId ? parseInt(receiverId, 10) : null,
      groupId: groupId ? parseInt(groupId, 10) : null,
      voiceUrl,
      duration: dur,
    });

    // 2. Create Chat record representing this voice note in conversation stream
    const chat = await Chat.create({
      senderId,
      receiverId: receiverId ? parseInt(receiverId, 10) : null,
      groupId: groupId ? parseInt(groupId, 10) : null,
      message: req.body.message || '[Voice Note]',
      fileUrl: voiceUrl,
      messageType: 'file', // Represented as file type for DB compatibility, rendered as VoiceNote on client
      isSeen: false
    });

    const chatDetails = await Chat.findByPk(chat.id, {
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    // 3. Broadcast real-time message
    const io = req.app.get('io');
    if (io) {
      if (groupId) {
        io.to(`group_${groupId}`).emit('new_group_message', chatDetails);
      } else {
        const receiverSocketId = onlineUsers.get(parseInt(receiverId, 10));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', chatDetails);
        }
      }
    }

    return res.status(201).json({ voiceMessage: voiceMsg, chat: chatDetails });
  } catch (error) {
    console.error('Send voice message error:', error);
    return res.status(500).json({ message: 'Server error sending voice message.' });
  }
};

const deleteVoiceMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const voiceMsg = await VoiceMessage.findByPk(id);
    if (!voiceMsg) {
      return res.status(404).json({ message: 'Voice message record not found.' });
    }

    if (voiceMsg.senderId !== userId) {
      return res.status(403).json({ message: 'You can only delete your own voice messages.' });
    }

    // Also delete corresponding chat bubble if found
    const chat = await Chat.findOne({
      where: {
        senderId: userId,
        fileUrl: voiceMsg.voiceUrl
      }
    });

    if (chat) {
      const receiverId = chat.receiverId;
      const groupId = chat.groupId;
      await chat.destroy();

      const io = req.app.get('io');
      if (io) {
        if (groupId) {
          io.to(`group_${groupId}`).emit('message_deleted', { messageId: chat.id });
        } else {
          const receiverSocketId = onlineUsers.get(parseInt(receiverId, 10));
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message_deleted', { messageId: chat.id });
          }
        }
      }
    }

    await voiceMsg.destroy();
    return res.status(200).json({ message: 'Voice message deleted successfully.', id });
  } catch (error) {
    console.error('Delete voice message error:', error);
    return res.status(500).json({ message: 'Server error deleting voice message.' });
  }
};

module.exports = {
  sendVoiceMessage,
  deleteVoiceMessage
};
