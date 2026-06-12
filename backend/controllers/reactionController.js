const { MessageReaction, Chat, User } = require('../models');
const { onlineUsers } = require('../sockets/socketHandler');

const toggleReaction = async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    const userId = req.user.id;

    if (!messageId || !reaction) {
      return res.status(400).json({ message: 'Message ID and reaction emoji are required.' });
    }

    const chat = await Chat.findByPk(messageId);
    if (!chat) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Check if user already reacted with this emoji
    const existing = await MessageReaction.findOne({
      where: { messageId, userId }
    });

    let action = 'add';
    let result = null;

    if (existing) {
      if (existing.reaction === reaction) {
        // Toggle off if same emoji
        await existing.destroy();
        action = 'remove';
      } else {
        // Update to new emoji
        existing.reaction = reaction;
        await existing.save();
        action = 'update';
        result = existing;
      }
    } else {
      // Create new reaction
      result = await MessageReaction.create({
        messageId,
        userId,
        reaction
      });
    }

    // Prepare reaction payload with user info
    const reactions = await MessageReaction.findAll({
      where: { messageId },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }]
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        messageId,
        reactions,
        action,
        userId,
        reaction
      };

      if (chat.groupId) {
        io.to(`group_${chat.groupId}`).emit('update_reaction', payload);
      } else {
        // Send to both sender and receiver
        const senderSocket = onlineUsers.get(parseInt(chat.senderId, 10));
        const receiverSocket = onlineUsers.get(parseInt(chat.receiverId, 10));
        if (senderSocket) io.to(senderSocket).emit('update_reaction', payload);
        if (receiverSocket) io.to(receiverSocket).emit('update_reaction', payload);
      }
    }

    return res.status(200).json({ action, reactions });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    return res.status(500).json({ message: 'Server error toggling reaction.' });
  }
};

const getReactions = async (req, res) => {
  try {
    const { messageId } = req.params;
    const reactions = await MessageReaction.findAll({
      where: { messageId },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }]
    });
    return res.status(200).json(reactions);
  } catch (error) {
    console.error('Get reactions error:', error);
    return res.status(500).json({ message: 'Server error retrieving reactions.' });
  }
};

module.exports = {
  toggleReaction,
  getReactions
};
