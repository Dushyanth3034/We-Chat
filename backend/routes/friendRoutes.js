const express = require('express');
const {
  getFriendsList,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendSuggestions,
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getFriendsList);
router.get('/requests', protect, getFriendRequests);
router.post('/request', protect, sendFriendRequest);
router.post('/accept', protect, acceptFriendRequest);
router.post('/reject', protect, rejectFriendRequest);
router.post('/cancel', protect, cancelFriendRequest);
router.post('/remove', protect, removeFriend);
router.get('/suggestions', protect, getFriendSuggestions);

module.exports = router;
