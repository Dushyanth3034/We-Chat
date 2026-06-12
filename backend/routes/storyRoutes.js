const express = require('express');
const {
  createStory,
  getActiveStories,
  deleteStory,
  markStoryViewed,
  addStoryReaction,
  addStoryReply,
  getStoryViewers,
} = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const storyUpload = require('../middleware/storyUploadMiddleware');

const router = express.Router();

router.get('/', protect, getActiveStories);
router.post('/', protect, storyUpload.single('file'), createStory);
router.delete('/:storyId', protect, deleteStory);
router.get('/:storyId/viewers', protect, getStoryViewers);
router.post('/:storyId/view', protect, markStoryViewed);
router.post('/:storyId/react', protect, addStoryReaction);
router.post('/:storyId/reply', protect, addStoryReply);

module.exports = router;
