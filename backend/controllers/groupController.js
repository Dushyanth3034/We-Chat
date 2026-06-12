const { Group, GroupMember, User, Chat, Notification, MessageReaction, MessageReply, MessageForward } = require('../models');
const { Op } = require('sequelize');

const includeModels = [
  { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] },
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

const createGroup = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body;

    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required.' });
    }

    let groupImage = '';
    if (req.file) {
      groupImage = `/uploads/${req.file.filename}`;
    }

    const group = await Group.create({
      groupName,
      groupImage,
      createdBy: req.user.id,
    });

    // Add creator to members
    await GroupMember.create({
      groupId: group.id,
      userId: req.user.id,
    });

    // Process and add other members
    let ids = [];
    if (memberIds) {
      try {
        ids = typeof memberIds === 'string' ? JSON.parse(memberIds) : memberIds;
      } catch (e) {
        ids = [];
      }
    }

    // Filter out duplicates and creator
    const filteredIds = [...new Set(ids)].map(id => parseInt(id, 10)).filter(id => id && id !== req.user.id);

    for (const uId of filteredIds) {
      const user = await User.findByPk(uId);
      if (user) {
        await GroupMember.create({
          groupId: group.id,
          userId: uId,
        });

        // Notify member
        await Notification.create({
          userId: uId,
          type: 'group_invitation',
          message: `You were invited to group "${groupName}" by ${req.user.name}.`,
        });
      }
    }

    // Retrieve group with members
    const groupDetails = await Group.findByPk(group.id, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage', 'bio'] }],
        },
      ],
    });

    return res.status(201).json(groupDetails);
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ message: 'Server error creating group.' });
  }
};

const getUserGroups = async (req, res) => {
  try {
    const memberships = await GroupMember.findAll({
      where: { userId: req.user.id },
      attributes: ['groupId'],
    });

    const groupIds = memberships.map(m => m.groupId);

    const groups = await Group.findAll({
      where: { id: { [Op.in]: groupIds } },
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    return res.status(500).json({ message: 'Server error retrieving groups.' });
  }
};

const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email', 'profileImage', 'bio'] }],
        },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Verify requesting user is member
    const isMember = group.Members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error('Get group details error:', error);
    return res.status(500).json({ message: 'Server error retrieving group details.' });
  }
};

const addGroupMembers = async (req, res) => {
  try {
    const { groupId, memberIds } = req.body;

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Verify user is member of the group
    const requesterMembership = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });
    if (!requesterMembership) {
      return res.status(403).json({ message: 'Only members can add users.' });
    }

    let ids = [];
    if (memberIds) {
      try {
        ids = typeof memberIds === 'string' ? JSON.parse(memberIds) : memberIds;
      } catch (e) {
        ids = [];
      }
    }

    const addedMembers = [];
    for (const uId of ids) {
      // Check if already member
      const existing = await GroupMember.findOne({
        where: { groupId, userId: uId },
      });

      if (!existing) {
        const user = await User.findByPk(uId);
        if (user) {
          const newMember = await GroupMember.create({
            groupId,
            userId: uId,
          });
          addedMembers.push(newMember);

          // Notify member
          await Notification.create({
            userId: uId,
            type: 'group_invitation',
            message: `You were invited to group "${group.groupName}" by ${req.user.name}.`,
          });
        }
      }
    }

    return res.status(200).json({ message: `Successfully added ${addedMembers.length} members.`, addedMembers });
  } catch (error) {
    console.error('Add group members error:', error);
    return res.status(500).json({ message: 'Server error adding group members.' });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Rules: Creator can remove anyone. Anyone can remove themselves (leave). Members cannot remove others.
    const isCreator = group.createdBy === req.user.id;
    const isSelf = parseInt(userId, 10) === req.user.id;

    if (!isCreator && !isSelf) {
      return res.status(403).json({ message: 'Not authorized to remove this member.' });
    }

    const membership = await GroupMember.findOne({
      where: { groupId, userId },
    });

    if (!membership) {
      return res.status(404).json({ message: 'Member not found in group.' });
    }

    // If creator is leaving, delete group entirely or assign new creator?
    // WeChat style: if creator leaves, group remains but admin rights transfer or simply they leave
    await membership.destroy();

    return res.status(200).json({ message: 'Member removed successfully.', groupId, userId });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Server error removing member.' });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check membership
    const membership = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied. You are not a member.' });
    }

    const messages = await Chat.findAll({
      where: { groupId },
      order: [['createdAt', 'ASC']],
      include: includeModels,
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Get group messages error:', error);
    return res.status(500).json({ message: 'Server error loading group messages.' });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const { groupId, message, messageType, repliedToMessageId, isForwarded } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }

    // Verify membership
    const membership = await GroupMember.findOne({
      where: { groupId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied. You are not a member.' });
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
      return res.status(400).json({ message: 'Cannot send empty group message.' });
    }

    const newChat = await Chat.create({
      senderId: req.user.id,
      groupId,
      message,
      fileUrl,
      messageType: type,
      isSeen: true,
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
      io.to(`group_${groupId}`).emit('new_group_message', messageDetails);
    }

    return res.status(201).json(messageDetails);
  } catch (error) {
    console.error('Send group message error:', error);
    return res.status(500).json({ message: 'Server error sending group message.' });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addGroupMembers,
  removeGroupMember,
  getGroupMessages,
  sendGroupMessage,
};
