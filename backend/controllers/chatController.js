const { Chat, User, MessageReaction, MessageReply, MessageForward } = require('../models');
const { Op } = require('sequelize');

const includeModels = [
  { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] },
  { model: User, as: 'Receiver', attributes: ['id', 'name', 'profileImage'] },
  {
    model: MessageReaction,
    as: 'Reactions',
    include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }]
  },
  {
    model: MessageReply,
    as: 'ReplyLink',
    include: [
      {
        model: Chat,
        as: 'ParentMessage',
        include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }]
      }
    ]
  },
  {
    model: MessageForward,
    as: 'ForwardLink',
    include: [{ model: User, as: 'Forwarder', attributes: ['id', 'name', 'profileImage'] }]
  }
];
const { onlineUsers } = require('../sockets/socketHandler');

const getChatMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required.' });
    }

    await Chat.update(
      { isSeen: true },
      {
        where: {
          senderId: receiverId,
          receiverId: req.user.id,
          isSeen: false,
        },
      }
    );

    const messages = await Chat.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
      order: [['createdAt', 'ASC']],
      include: includeModels,
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ message: 'Server error retrieving messages.' });
  }
};

const sendChatMessage = async (req, res) => {
  try {
    const { receiverId, message, messageType, repliedToMessageId, isForwarded } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required.' });
    }

    let fileUrl = '';
    let type = messageType || 'text';

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      if (!messageType) {
        const ext = req.file.filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          type = 'image';
        } else {
          type = 'file';
        }
      }
    }

    if (!message && !fileUrl) {
      return res.status(400).json({ message: 'Cannot send an empty message.' });
    }

    const newChat = await Chat.create({
      senderId: req.user.id,
      receiverId,
      message,
      fileUrl,
      messageType: type,
      isSeen: false,
    });

    // Handle replies
    if (repliedToMessageId) {
      await MessageReply.create({
        messageId: newChat.id,
        repliedToMessageId: parseInt(repliedToMessageId, 10),
      });
    }

    // Handle forwards
    if (isForwarded) {
      await MessageForward.create({
        messageId: newChat.id,
        forwardedBy: req.user.id,
      });
    }

    const messageDetails = await Chat.findByPk(newChat.id, {
      include: includeModels,
    });

    const io = req.app.get('io');
    if (io) {
      const receiverSocketId = onlineUsers.get(parseInt(receiverId, 10));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', messageDetails);
      }
    }

    return res.status(201).json(messageDetails);
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error sending message.' });
  }
};

const editChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    const chat = await Chat.findByPk(messageId);
    if (!chat) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (chat.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    chat.message = message;
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      const receiverSocketId = onlineUsers.get(parseInt(chat.receiverId, 10));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_edited', chat);
      }
    }

    return res.status(200).json(chat);
  } catch (error) {
    console.error('Edit message error:', error);
    return res.status(500).json({ message: 'Server error editing message.' });
  }
};

const deleteChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const chat = await Chat.findByPk(messageId);
    if (!chat) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (chat.senderId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    const receiverId = chat.receiverId;
    await chat.destroy();

    const io = req.app.get('io');
    if (io) {
      const receiverSocketId = onlineUsers.get(parseInt(receiverId, 10));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_deleted', { messageId });
      }
    }

    return res.status(200).json({ message: 'Message deleted successfully.', messageId });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Server error deleting message.' });
  }
};

const searchChatMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required.' });
    }

    const messages = await Chat.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { senderId: req.user.id, receiverId },
              { senderId: receiverId, receiverId: req.user.id },
            ],
          },
          {
            message: { [Op.like]: `%${query}%` },
          },
        ],
      },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] },
      ],
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Search chat messages error:', error);
    return res.status(500).json({ message: 'Server error searching messages.' });
  }
};

const advancedSearch = async (req, res) => {
  try {
    const { query, filter, type, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      whereClause.createdAt = { [Op.gte]: startOfDay };
    } else if (filter === 'last7') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      whereClause.createdAt = { [Op.gte]: date };
    } else if (filter === 'last30') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      whereClause.createdAt = { [Op.gte]: date };
    }

    if (type === 'image') {
      whereClause.messageType = 'image';
    } else if (type === 'video') {
      whereClause.messageType = 'file';
      whereClause.fileUrl = { [Op.like]: '%.mp4' };
    } else if (type === 'voice') {
      whereClause.messageType = 'file';
      whereClause.message = '[Voice Note]';
    } else if (type === 'document') {
      whereClause.messageType = 'file';
      whereClause.message = { [Op.not]: '[Voice Note]' };
      whereClause.fileUrl = { [Op.notLike]: '%.mp4' };
    }

    if (query) {
      whereClause.message = { [Op.like]: `%${query}%` };
    }

    const userGroups = await req.user.getGroupMemberships();
    const groupIds = userGroups.map(gm => gm.groupId);

    whereClause[Op.or] = [
      { senderId: userId },
      { receiverId: userId },
      { groupId: { [Op.in]: groupIds } }
    ];

    const messages = await Chat.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      include: includeModels,
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Advanced search error:', error);
    return res.status(500).json({ message: 'Server error performing search.' });
  }
};

module.exports = {
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  searchChatMessages,
  advancedSearch,
};
