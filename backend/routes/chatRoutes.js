const express = require('express');
const {
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  searchChatMessages,
  advancedSearch,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/search/advanced', protect, advancedSearch);
router.get('/messages/:receiverId', protect, getChatMessages);
router.post('/message', protect, upload.single('file'), sendChatMessage);
router.put('/message/:messageId', protect, editChatMessage);
router.delete('/message/:messageId', protect, deleteChatMessage);
router.get('/messages/:receiverId/search', protect, searchChatMessages);

module.exports = router;
