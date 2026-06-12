const { Story, StoryView, StoryReaction, StoryReply, Song, User, Friend } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const createStory = async (req, res) => {
  try {
    const { text, backgroundColor, musicId } = req.body;
    
    let mediaUrl = '';
    let mediaType = 'text';

    if (req.file) {
      mediaUrl = `/uploads/stories/${req.file.filename}`;
      const ext = req.file.filename.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        mediaType = 'image';
        if (req.file.size > 10 * 1024 * 1024) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Image file size exceeds 10MB.' });
        }
      } else if (['mp4'].includes(ext)) {
        mediaType = 'video';
        if (req.file.size > 50 * 1024 * 1024) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Video file size exceeds 50MB.' });
        }
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Unsupported media format.' });
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newStory = await Story.create({
      userId: req.user.id,
      mediaUrl,
      mediaType,
      text,
      backgroundColor: backgroundColor || '#800020',
      musicId: musicId ? parseInt(musicId, 10) : null,
      expiresAt,
    });

    const storyDetails = await Story.findByPk(newStory.id, {
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage'] },
        { model: Song, as: 'Music' },
        { model: StoryView, as: 'Views' },
        { model: StoryReaction, as: 'Reactions' },
        { model: StoryReply, as: 'Replies' }
      ]
    });

    return res.status(201).json(storyDetails);
  } catch (error) {
    console.error('Create story error:', error);
    return res.status(500).json({ message: 'Server error creating story.' });
  }
};

const getActiveStories = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch friend IDs
    const friendships = await Friend.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    const friendIds = friendships.map(f => f.senderId === userId ? f.receiverId : f.senderId);
    const allUserIds = [userId, ...friendIds];

    // 2. Fetch all stories that are active (expiresAt > NOW)
    const stories = await Story.findAll({
      where: {
        userId: { [Op.in]: allUserIds },
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage'] },
        { model: Song, as: 'Music' },
        {
          model: StoryView,
          as: 'Views',
          include: [{ model: User, as: 'Viewer', attributes: ['id', 'name', 'profileImage'] }]
        },
        {
          model: StoryReaction,
          as: 'Reactions',
          include: [{ model: User, as: 'User', attributes: ['id', 'name'] }]
        },
        {
          model: StoryReply,
          as: 'Replies',
          include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }]
        }
      ],
    });

    // Clean up Views in each story to ensure unique viewers and no owner views
    stories.forEach(s => {
      const uniqueViewsMap = new Map();
      s.Views.forEach(v => {
        if (v.viewerId === s.userId) return;
        if (!uniqueViewsMap.has(v.viewerId)) {
          uniqueViewsMap.set(v.viewerId, v);
        }
      });
      s.setDataValue('Views', Array.from(uniqueViewsMap.values()));
    });

    // 3. Group stories by user
    const groupedMap = new Map();
    stories.forEach(s => {
      const authorId = s.userId;
      if (!groupedMap.has(authorId)) {
        groupedMap.set(authorId, {
          user: s.Author,
          stories: [],
        });
      }
      groupedMap.get(authorId).stories.push(s);
    });

    const groupedList = Array.from(groupedMap.values()).map(group => {
      const hasUnread = group.stories.some(s => {
        if (s.userId === userId) return false; // Own stories are never unread to the owner
        return !s.Views.some(v => v.viewerId === userId);
      });
      return {
        ...group,
        hasUnread,
      };
    });

    // Sort: current user story first, then the rest ordered by recent story creation
    const currentUserGroup = groupedList.find(g => g.user.id === userId);
    const otherGroups = groupedList.filter(g => g.user.id !== userId);

    otherGroups.sort((a, b) => {
      const aMax = new Date(Math.max(...a.stories.map(s => new Date(s.createdAt))));
      const bMax = new Date(Math.max(...b.stories.map(s => new Date(s.createdAt))));
      return bMax - aMax;
    });

    const result = [];
    if (currentUserGroup) {
      result.push(currentUserGroup);
    }
    result.push(...otherGroups);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Get active stories error:', error);
    return res.status(500).json({ message: 'Server error retrieving stories.' });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found.' });
    }

    if (story.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own stories.' });
    }

    // Delete file from disk if exists
    if (story.mediaUrl) {
      const filePath = path.join(__dirname, '..', story.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await story.destroy();
    return res.status(200).json({ message: 'Story deleted successfully.', storyId });
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json({ message: 'Server error deleting story.' });
  }
};

const markStoryViewed = async (req, res) => {
  try {
    const { storyId } = req.params;
    const viewerId = req.user.id;

    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found.' });
    }

    // Check if viewer is the story owner
    if (story.userId === viewerId) {
      return res.status(200).json({ message: 'Owner views are ignored.' });
    }

    // Check if view already exists
    const existingView = await StoryView.findOne({
      where: { storyId, viewerId },
    });

    if (existingView) {
      return res.status(200).json(existingView);
    }

    const newView = await StoryView.create({
      storyId,
      viewerId,
      viewedAt: new Date(),
    });

    return res.status(201).json(newView);
  } catch (error) {
    console.error('Mark story viewed error:', error);
    return res.status(500).json({ message: 'Server error marking story viewed.' });
  }
};

const addStoryReaction = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { reactionType } = req.body;

    if (!reactionType) {
      return res.status(400).json({ message: 'Reaction type is required.' });
    }

    const newReaction = await StoryReaction.create({
      storyId,
      userId: req.user.id,
      reactionType,
    });

    const reactionDetails = await StoryReaction.findByPk(newReaction.id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }]
    });

    return res.status(201).json(reactionDetails);
  } catch (error) {
    console.error('Add reaction error:', error);
    return res.status(500).json({ message: 'Server error adding story reaction.' });
  }
};

const addStoryReply = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Reply message is required.' });
    }

    const newReply = await StoryReply.create({
      storyId,
      senderId: req.user.id,
      message,
    });

    const replyDetails = await StoryReply.findByPk(newReply.id, {
      include: [{ model: User, as: 'Sender', attributes: ['id', 'name', 'profileImage'] }]
    });

    return res.status(201).json(replyDetails);
  } catch (error) {
    console.error('Add reply error:', error);
    return res.status(500).json({ message: 'Server error adding story reply.' });
  }
};

const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Story not found.' });
    }

    if (story.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only view the viewer list for your own stories.' });
    }

    const views = await StoryView.findAll({
      where: { storyId },
      include: [
        { model: User, as: 'Viewer', attributes: ['id', 'name', 'profileImage'] }
      ],
      order: [['viewedAt', 'DESC']],
    });

    const uniqueViewsMap = new Map();
    views.forEach(v => {
      if (v.viewerId === story.userId) return; // ignore owner views
      if (!uniqueViewsMap.has(v.viewerId)) {
        uniqueViewsMap.set(v.viewerId, v);
      }
    });

    return res.status(200).json(Array.from(uniqueViewsMap.values()));
  } catch (error) {
    console.error('Get story viewers error:', error);
    return res.status(500).json({ message: 'Server error retrieving viewers.' });
  }
};

module.exports = {
  createStory,
  getActiveStories,
  deleteStory,
  markStoryViewed,
  addStoryReaction,
  addStoryReply,
  getStoryViewers,
};
