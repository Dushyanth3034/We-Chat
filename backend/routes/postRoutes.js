const express = require('express');
const {
  createPost,
  editPost,
  deletePost,
  toggleLikePost,
  commentOnPost,
  deleteComment,
  getMomentsFeed,
  getUserPosts,
  getTrendingPosts,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, upload.array('images', 9), createPost);
router.put('/:postId', protect, editPost);
router.delete('/:postId', protect, deletePost);
router.post('/:postId/like', protect, toggleLikePost);
router.post('/:postId/comment', protect, commentOnPost);
router.delete('/comment/:commentId', protect, deleteComment);
router.get('/feed', protect, getMomentsFeed);
router.get('/user/:userId', protect, getUserPosts);
router.get('/trending', protect, getTrendingPosts);

module.exports = router;
