const { User, Friend, Post } = require('../models');
const { generateUserQRCode } = require('../utils/qrGenerator');
const { Op } = require('sequelize');

const updateProfile = async (req, res) => {
  try {
    const { name, bio, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    let emailChanged = false;
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use by another user.' });
      }
      user.email = email;
      emailChanged = true;
    }

    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    if (name || emailChanged) {
      const { dataUrl } = await generateUserQRCode(user.id, user.email, user.name);
      user.qrCode = dataUrl;
    }

    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error updating profile.' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(200).json([]);
    }

    const users = await User.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { name: { [Op.like]: `%${query}%` } },
              { email: { [Op.like]: `%${query}%` } },
            ],
          },
          {
            id: { [Op.ne]: req.user.id },
          },
        ],
      },
      attributes: ['id', 'name', 'email', 'profileImage', 'bio'],
      limit: 15,
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ message: 'Server error during search.' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId, 10) : req.user.id;

    const friendCount = await Friend.count({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId },
        ],
        status: 'accepted',
      },
    });

    const postCount = await Post.count({
      where: { userId },
    });

    return res.status(200).json({
      friendCount,
      postCount,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({ message: 'Server error fetching user stats.' });
  }
};

module.exports = {
  updateProfile,
  searchUsers,
  getUserStats,
};
