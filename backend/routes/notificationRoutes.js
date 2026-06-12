const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:notificationId/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:notificationId', protect, deleteNotification);

module.exports = router;
