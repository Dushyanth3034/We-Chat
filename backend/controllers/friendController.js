const { User, Friend, Notification } = require('../models');
const { Op } = require('sequelize');

const getFriendsList = async (req, res) => {
  try {
    const friendships = await Friend.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id },
        ],
        status: 'accepted',
      },
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'profileImage', 'bio', 'qrCode'] },
        { model: User, as: 'Receiver', attributes: ['id', 'name', 'email', 'profileImage', 'bio', 'qrCode'] },
      ],
    });

    const friends = friendships.map((f) => (f.senderId === req.user.id ? f.Receiver : f.Sender));

    return res.status(200).json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json({ message: 'Server error retrieving friends list.' });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const requests = await Friend.findAll({
      where: {
        receiverId: req.user.id,
        status: 'pending',
      },
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'profileImage', 'bio'] },
      ],
    });

    return res.status(200).json(requests);
  } catch (error) {
    console.error('Get friend requests error:', error);
    return res.status(500).json({ message: 'Server error retrieving friend requests.' });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver user ID is required.' });
    }

    if (parseInt(receiverId, 10) === req.user.id) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if relation already exists
    const existing = await Friend.findOne({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends.' });
      } else if (existing.status === 'pending') {
        if (existing.senderId === req.user.id) {
          return res.status(400).json({ message: 'Friend request already pending.' });
        } else {
          // The other user already sent a request, auto-accept it!
          existing.status = 'accepted';
          await existing.save();
          await Notification.create({
            userId: receiverId,
            type: 'friend_accepted',
            message: `${req.user.name} accepted your friend request.`,
          });
          return res.status(200).json({ message: 'Friend request auto-accepted as they had a pending request to you.', status: 'accepted' });
        }
      } else {
        // Rejected - reset to pending
        existing.status = 'pending';
        existing.senderId = req.user.id;
        existing.receiverId = receiverId;
        await existing.save();
        
        await Notification.create({
          userId: receiverId,
          type: 'friend_request',
          message: `${req.user.name} sent you a friend request.`,
        });

        return res.status(200).json({ message: 'Friend request sent.', status: 'pending' });
      }
    }

    const request = await Friend.create({
      senderId: req.user.id,
      receiverId,
      status: 'pending',
    });

    await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      message: `${req.user.name} sent you a friend request.`,
    });

    return res.status(201).json({ message: 'Friend request sent.', request });
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(500).json({ message: 'Server error sending friend request.' });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await Friend.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    if (request.receiverId !== req.user.id) {
      return res.status(403).json({ message: 'You cannot accept this request.' });
    }

    request.status = 'accepted';
    await request.save();

    await Notification.create({
      userId: request.senderId,
      type: 'friend_accepted',
      message: `${req.user.name} accepted your friend request.`,
    });

    return res.status(200).json({ message: 'Friend request accepted.', request });
  } catch (error) {
    console.error('Accept friend request error:', error);
    return res.status(500).json({ message: 'Server error accepting friend request.' });
  }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await Friend.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    if (request.receiverId !== req.user.id) {
      return res.status(403).json({ message: 'You cannot reject this request.' });
    }

    request.status = 'rejected';
    await request.save();

    return res.status(200).json({ message: 'Friend request rejected.', request });
  } catch (error) {
    console.error('Reject friend request error:', error);
    return res.status(500).json({ message: 'Server error rejecting friend request.' });
  }
};

const cancelFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;

    const request = await Friend.findOne({
      where: {
        senderId: req.user.id,
        receiverId,
        status: 'pending',
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending request not found.' });
    }

    await request.destroy();
    return res.status(200).json({ message: 'Friend request cancelled successfully.' });
  } catch (error) {
    console.error('Cancel request error:', error);
    return res.status(500).json({ message: 'Server error cancelling request.' });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;

    const friendship = await Friend.findOne({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user.id },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend connection not found.' });
    }

    await friendship.destroy();
    return res.status(200).json({ message: 'Friend removed successfully.' });
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(500).json({ message: 'Server error removing friend.' });
  }
};

const getFriendSuggestions = async (req, res) => {
  try {
    // Get all user IDs involved in friendships with current user
    const existingFriendships = await Friend.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id },
        ],
      },
    });

    const excludedUserIds = [req.user.id];
    existingFriendships.forEach((f) => {
      excludedUserIds.push(f.senderId);
      excludedUserIds.push(f.receiverId);
    });

    // Find users who are NOT in the excluded IDs
    const suggestions = await User.findAll({
      where: {
        id: { [Op.notIn]: excludedUserIds },
      },
      attributes: ['id', 'name', 'email', 'profileImage', 'bio'],
      limit: 10,
    });

    return res.status(200).json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    return res.status(500).json({ message: 'Server error fetching suggestions.' });
  }
};

module.exports = {
  getFriendsList,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendSuggestions,
};
