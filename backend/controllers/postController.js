const fs = require('fs');
const { User, Friend, Post, Like, Comment, Notification } = require('../models');
const { Op, fn, col } = require('sequelize');

const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    let imageList = [];
    if (req.files && req.files.length > 0) {
      imageList = req.files.map((file) => {
        const filePath = file.path;
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const base64 = fileBuffer.toString('base64');
          const mimeType = file.mimetype;
          // Delete local file immediately so it doesn't occupy space/leak on ephemeral disk
          fs.unlinkSync(filePath);
          return `data:${mimeType};base64,${base64}`;
        } catch (fileErr) {
          console.error('Error reading/processing file:', file.filename, fileErr);
          return `/uploads/${file.filename}`; // Fallback to normal URL path if base64 conversion fails
        }
      });
    }

    if (!content && imageList.length === 0) {
      return res.status(400).json({ message: 'Cannot create an empty post.' });
    }

    const post = await Post.create({
      userId: req.user.id,
      content: content || '',
      imageUrl: JSON.stringify(imageList),
    });

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage', 'bio'] },
        { model: Like, as: 'Likes', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] },
        { model: Comment, as: 'Comments', include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }] },
      ],
    });

    return res.status(201).json(fullPost);
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ message: 'Server error creating post.' });
  }
};

const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own posts.' });
    }

    post.content = content || post.content;
    await post.save();

    const fullPost = await Post.findByPk(postId, {
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage', 'bio'] },
        { model: Like, as: 'Likes', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] },
        { model: Comment, as: 'Comments', include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }] },
      ],
    });

    return res.status(200).json(fullPost);
  } catch (error) {
    console.error('Edit post error:', error);
    return res.status(500).json({ message: 'Server error editing post.' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }

    // Cascade delete likes and comments
    await Like.destroy({ where: { postId } });
    await Comment.destroy({ where: { postId } });
    await post.destroy();

    return res.status(200).json({ message: 'Post deleted successfully.', postId });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ message: 'Server error deleting post.' });
  }
};

const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const existingLike = await Like.findOne({
      where: { userId: req.user.id, postId },
    });

    if (existingLike) {
      await existingLike.destroy();
      return res.status(200).json({ message: 'Post unliked successfully.', liked: false });
    }

    await Like.create({
      userId: req.user.id,
      postId,
    });

    // Notify post author (if not self)
    if (post.userId !== req.user.id) {
      await Notification.create({
        userId: post.userId,
        type: 'like',
        message: `${req.user.name} liked your post.`,
      });
    }

    return res.status(200).json({ message: 'Post liked successfully.', liked: true });
  } catch (error) {
    console.error('Toggle like error:', error);
    return res.status(500).json({ message: 'Server error toggling like.' });
  }
};

const commentOnPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const newComment = await Comment.create({
      userId: req.user.id,
      postId,
      comment,
    });

    const fullComment = await Comment.findByPk(newComment.id, {
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }],
    });

    // Notify author (if not self)
    if (post.userId !== req.user.id) {
      await Notification.create({
        userId: post.userId,
        type: 'comment',
        message: `${req.user.name} commented on your post: "${comment.substring(0, 30)}..."`,
      });
    }

    return res.status(201).json(fullComment);
  } catch (error) {
    console.error('Comment on post error:', error);
    return res.status(500).json({ message: 'Server error creating comment.' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const record = await Comment.findByPk(commentId, {
      include: [{ model: Post }],
    });

    if (!record) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // A comment can be deleted by its author, or the post's author
    const isCommentAuthor = record.userId === req.user.id;
    const isPostAuthor = record.Post.userId === req.user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this comment.' });
    }

    await record.destroy();
    return res.status(200).json({ message: 'Comment deleted successfully.', commentId });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ message: 'Server error deleting comment.' });
  }
};

const getMomentsFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Get list of friends (accepted)
    const friendships = await Friend.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id },
        ],
        status: 'accepted',
      },
    });

    const friendIds = friendships.map((f) => (f.senderId === req.user.id ? f.receiverId : f.senderId));
    friendIds.push(req.user.id); // Include user's own posts in moments feed

    const posts = await Post.findAll({
      where: {
        userId: { [Op.in]: friendIds },
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage', 'bio'] },
        { model: Like, as: 'Likes', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] },
        {
          model: Comment,
          as: 'Comments',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }],
        },
      ],
    });

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Get moments feed error:', error);
    return res.status(500).json({ message: 'Server error fetching feed.' });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId, 10) : req.user.id;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const posts = await Post.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage', 'bio'] },
        { model: Like, as: 'Likes', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] },
        {
          model: Comment,
          as: 'Comments',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }],
        },
      ],
    });

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    return res.status(500).json({ message: 'Server error retrieving posts.' });
  }
};

const getTrendingPosts = async (req, res) => {
  try {
    // Basic implementation: order by date, or count comments/likes.
    // For simplicity, retrieve recent posts order by date, limit 5.
    const posts = await Post.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        { model: User, as: 'Author', attributes: ['id', 'name', 'profileImage'] },
        { model: Like, as: 'Likes', include: [{ model: User, as: 'User', attributes: ['id', 'name'] }] },
        {
          model: Comment,
          as: 'Comments',
          include: [{ model: User, as: 'User', attributes: ['id', 'name', 'profileImage'] }],
        },
      ],
    });
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Get trending posts error:', error);
    return res.status(500).json({ message: 'Server error retrieving trending posts.' });
  }
};

module.exports = {
  createPost,
  editPost,
  deletePost,
  toggleLikePost,
  commentOnPost,
  deleteComment,
  getMomentsFeed,
  getUserPosts,
  getTrendingPosts,
};
