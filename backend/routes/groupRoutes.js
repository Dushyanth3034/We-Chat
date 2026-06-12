const express = require('express');
const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addGroupMembers,
  removeGroupMember,
  getGroupMessages,
  sendGroupMessage,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, upload.single('groupImage'), createGroup);
router.get('/', protect, getUserGroups);
router.get('/:groupId', protect, getGroupDetails);
router.post('/members', protect, addGroupMembers);
router.post('/members/remove', protect, removeGroupMember);
router.get('/:groupId/messages', protect, getGroupMessages);
router.post('/message', protect, upload.single('file'), sendGroupMessage);

module.exports = router;
