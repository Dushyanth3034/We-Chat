const { Call, GroupCall, GroupCallParticipant, User, Group, Chat } = require('../models');
const { Op } = require('sequelize');

const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch 1-to-1 calls
    const calls = await Call.findAll({
      where: {
        [Op.or]: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      include: [
        { model: User, as: 'Caller', attributes: ['id', 'name', 'profileImage'] },
        { model: User, as: 'Receiver', attributes: ['id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    // Fetch user groups
    const userGroups = await req.user.getGroupMemberships();
    const groupIds = userGroups.map(gm => gm.groupId);

    // Fetch group calls in those groups
    const groupCalls = await GroupCall.findAll({
      where: {
        groupId: { [Op.in]: groupIds }
      },
      include: [
        { model: Group, as: 'Group', attributes: ['id', 'groupName', 'groupImage'] },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'profileImage'] },
        {
          model: GroupCallParticipant,
          as: 'Participants',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const history = [];

    calls.forEach(c => {
      history.push({
        id: c.id,
        isGroup: false,
        caller: c.Caller,
        receiver: c.Receiver,
        callType: c.callType,
        status: c.status,
        duration: c.duration,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        timestamp: c.createdAt
      });
    });

    groupCalls.forEach(gc => {
      history.push({
        id: gc.id,
        isGroup: true,
        group: gc.Group,
        creator: gc.Creator,
        callType: gc.callType,
        status: gc.status,
        startedAt: gc.startedAt,
        endedAt: gc.endedAt,
        participants: gc.Participants.map(p => p.User),
        timestamp: gc.createdAt
      });
    });

    // Sort combined history by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json(history);
  } catch (error) {
    console.error('Fetch call history error:', error);
    return res.status(500).json({ message: 'Server error fetching call history.' });
  }
};

const createCall = async (req, res) => {
  try {
    const { receiverId, callType } = req.body;
    const callerId = req.user.id;

    if (!receiverId || !callType) {
      return res.status(400).json({ message: 'Receiver and call type are required.' });
    }

    const call = await Call.create({
      callerId,
      receiverId,
      callType,
      status: 'calling',
      startedAt: new Date()
    });

    const callWithUsers = await Call.findByPk(call.id, {
      include: [
        { model: User, as: 'Caller', attributes: ['id', 'name', 'profileImage'] },
        { model: User, as: 'Receiver', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    return res.status(201).json(callWithUsers);
  } catch (error) {
    console.error('Create call log error:', error);
    return res.status(500).json({ message: 'Server error creating call log.' });
  }
};

const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, duration } = req.body;

    const call = await Call.findByPk(id);
    if (!call) {
      return res.status(404).json({ message: 'Call log not found.' });
    }

    if (status) call.status = status;
    if (duration !== undefined) call.duration = duration;

    const isCallEnding = (duration !== undefined) || (status === 'rejected') || (status === 'missed');

    if (isCallEnding) {
      call.endedAt = new Date();
      if (call.status === 'calling') {
        call.status = 'missed';
      }
    }

    await call.save();

    if (isCallEnding) {
      // Create a message in the chats table to display inline in chat page
      const chatMsg = await Chat.create({
        senderId: call.callerId,
        receiverId: call.receiverId,
        message: `[Call Log]: ${call.callType} call finished | ${call.status} | ${call.duration || 0}`,
        messageType: 'text',
        isSeen: false
      });

      const chatMsgWithDetails = await Chat.findByPk(chatMsg.id, {
        include: [
          { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] },
          { model: User, as: 'Receiver', attributes: ['id', 'name', 'profileImage'] }
        ]
      });

      const io = req.app.get('io');
      if (io) {
        const { onlineUsers } = require('../sockets/socketHandler');
        const callerSocketId = onlineUsers.get(parseInt(call.callerId, 10));
        const receiverSocketId = onlineUsers.get(parseInt(call.receiverId, 10));
        
        if (callerSocketId) io.to(callerSocketId).emit('new_message', chatMsgWithDetails);
        if (receiverSocketId) io.to(receiverSocketId).emit('new_message', chatMsgWithDetails);
      }
    }

    return res.status(200).json(call);
  } catch (error) {
    console.error('Update call log error:', error);
    return res.status(500).json({ message: 'Server error updating call log.' });
  }
};

const createGroupCall = async (req, res) => {
  try {
    const { groupId, callType } = req.body;
    const createdBy = req.user.id;

    if (!groupId || !callType) {
      return res.status(400).json({ message: 'Group and call type are required.' });
    }

    const groupCall = await GroupCall.create({
      groupId,
      createdBy,
      callType,
      status: 'active',
      startedAt: new Date()
    });

    // Add creator as first participant
    await GroupCallParticipant.create({
      groupCallId: groupCall.id,
      userId: createdBy,
      joinedAt: new Date()
    });

    const groupCallWithData = await GroupCall.findByPk(groupCall.id, {
      include: [
        { model: Group, as: 'Group', attributes: ['id', 'groupName', 'groupImage'] },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    // Log in group chat stream
    const chatMsg = await Chat.create({
      senderId: createdBy,
      groupId,
      message: `[Call Log]: Group Call | ${callType} | started | 0`,
      messageType: 'text',
      isSeen: true
    });

    const chatMsgWithDetails = await Chat.findByPk(chatMsg.id, {
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('new_group_message', chatMsgWithDetails);
    }

    return res.status(201).json(groupCallWithData);
  } catch (error) {
    console.error('Create group call error:', error);
    return res.status(500).json({ message: 'Server error creating group call.' });
  }
};

const joinGroupCall = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const groupCall = await GroupCall.findByPk(id);
    if (!groupCall || groupCall.status !== 'active') {
      return res.status(404).json({ message: 'Active group call not found.' });
    }

    // Check if participant already exists in active status
    const existing = await GroupCallParticipant.findOne({
      where: {
        groupCallId: id,
        userId,
        leftAt: null
      }
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const participant = await GroupCallParticipant.create({
      groupCallId: id,
      userId,
      joinedAt: new Date()
    });

    return res.status(201).json(participant);
  } catch (error) {
    console.error('Join group call error:', error);
    return res.status(500).json({ message: 'Server error joining group call.' });
  }
};

const leaveGroupCall = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const participant = await GroupCallParticipant.findOne({
      where: {
        groupCallId: id,
        userId,
        leftAt: null
      }
    });

    if (participant) {
      participant.leftAt = new Date();
      await participant.save();
    }

    // Check if there are any remaining active participants
    const activeCount = await GroupCallParticipant.count({
      where: {
        groupCallId: id,
        leftAt: null
      }
    });

    if (activeCount === 0) {
      const groupCall = await GroupCall.findByPk(id);
      if (groupCall && groupCall.status !== 'completed') {
        groupCall.status = 'completed';
        groupCall.endedAt = new Date();
        await groupCall.save();

        // Log in group chat stream
        const chatMsg = await Chat.create({
          senderId: groupCall.createdBy,
          groupId: groupCall.groupId,
          message: `[Call Log]: Group Call | ${groupCall.callType} | completed | 0`,
          messageType: 'text',
          isSeen: true
        });

        const chatMsgWithDetails = await Chat.findByPk(chatMsg.id, {
          include: [
            { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }
          ]
        });

        const io = req.app.get('io');
        if (io) {
          io.to(`group_${groupCall.groupId}`).emit('new_group_message', chatMsgWithDetails);
        }
      }
    }

    return res.status(200).json({ message: 'Left group call successfully.' });
  } catch (error) {
    console.error('Leave group call error:', error);
    return res.status(500).json({ message: 'Server error leaving group call.' });
  }
};

const endGroupCall = async (req, res) => {
  try {
    const { id } = req.params;

    const groupCall = await GroupCall.findByPk(id);
    if (!groupCall) {
      return res.status(404).json({ message: 'Group call not found.' });
    }

    if (groupCall.status === 'completed') {
      return res.status(200).json({ message: 'Group call already ended.' });
    }

    groupCall.status = 'completed';
    groupCall.endedAt = new Date();
    await groupCall.save();

    // Mark all active participants as left
    await GroupCallParticipant.update(
      { leftAt: new Date() },
      { where: { groupCallId: id, leftAt: null } }
    );

    // Log in group chat stream
    const chatMsg = await Chat.create({
      senderId: groupCall.createdBy,
      groupId: groupCall.groupId,
      message: `[Call Log]: Group Call | ${groupCall.callType} | completed | 0`,
      messageType: 'text',
      isSeen: true
    });

    const chatMsgWithDetails = await Chat.findByPk(chatMsg.id, {
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupCall.groupId}`).emit('new_group_message', chatMsgWithDetails);
    }

    return res.status(200).json({ message: 'Group call ended successfully.' });
  } catch (error) {
    console.error('End group call error:', error);
    return res.status(500).json({ message: 'Server error ending group call.' });
  }
};

module.exports = {
  getCallHistory,
  createCall,
  updateCall,
  createGroupCall,
  joinGroupCall,
  leaveGroupCall,
  endGroupCall
};
