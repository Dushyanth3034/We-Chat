const { User, ConversationKey, Group, GroupMember } = require('../models');

const setupE2EKeys = async (req, res) => {
  try {
    const { publicKey, encryptedPrivateKey } = req.body;
    const userId = req.user.id;

    if (!publicKey || !encryptedPrivateKey) {
      return res.status(400).json({ message: 'Public key and encrypted private key are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.publicKey = publicKey;
    user.encryptedPrivateKey = encryptedPrivateKey;
    await user.save();

    return res.status(200).json({ message: 'E2E Encryption keys saved successfully.' });
  } catch (error) {
    console.error('Setup E2E keys error:', error);
    return res.status(500).json({ message: 'Server error setting up E2E keys.' });
  }
};

const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'publicKey']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get public key error:', error);
    return res.status(500).json({ message: 'Server error fetching public key.' });
  }
};

const getGroupPublicKeys = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findByPk(groupId, {
      include: [
        {
          model: GroupMember,
          as: 'Members',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'publicKey'] }]
        }
      ]
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    const keys = group.Members.map(m => m.User).filter(u => u && u.publicKey);
    return res.status(200).json(keys);
  } catch (error) {
    console.error('Get group public keys error:', error);
    return res.status(500).json({ message: 'Server error fetching group public keys.' });
  }
};

const getConversationKey = async (req, res) => {
  try {
    const { friendId, groupId } = req.query;
    const userId = req.user.id;

    let whereClause = { userId };
    if (friendId) {
      whereClause.friendId = parseInt(friendId, 10);
    } else if (groupId) {
      whereClause.groupId = parseInt(groupId, 10);
    } else {
      return res.status(400).json({ message: 'Either friendId or groupId is required.' });
    }

    const key = await ConversationKey.findOne({ where: whereClause });
    if (!key) {
      return res.status(404).json({ message: 'Conversation key not found.' });
    }

    return res.status(200).json(key);
  } catch (error) {
    console.error('Get conversation key error:', error);
    return res.status(500).json({ message: 'Server error retrieving conversation key.' });
  }
};

const storeConversationKey = async (req, res) => {
  try {
    const { keys } = req.body; // Array of { userId, friendId, groupId, encryptedKey }

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: 'Keys list is required.' });
    }

    const savedKeys = [];
    for (const item of keys) {
      const { userId, friendId, groupId, encryptedKey } = item;

      let whereClause = { userId };
      if (friendId) {
        whereClause.friendId = parseInt(friendId, 10);
      } else if (groupId) {
        whereClause.groupId = parseInt(groupId, 10);
      }

      // Upsert ConversationKey
      let convKey = await ConversationKey.findOne({ where: whereClause });
      if (convKey) {
        convKey.encryptedKey = encryptedKey;
        await convKey.save();
      } else {
        convKey = await ConversationKey.create({
          userId: parseInt(userId, 10),
          friendId: friendId ? parseInt(friendId, 10) : null,
          groupId: groupId ? parseInt(groupId, 10) : null,
          encryptedKey,
        });
      }
      savedKeys.push(convKey);
    }

    return res.status(201).json(savedKeys);
  } catch (error) {
    console.error('Store conversation key error:', error);
    return res.status(500).json({ message: 'Server error storing conversation key.' });
  }
};

module.exports = {
  setupE2EKeys,
  getPublicKey,
  getGroupPublicKeys,
  getConversationKey,
  storeConversationKey,
};
