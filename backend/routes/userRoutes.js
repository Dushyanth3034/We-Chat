const express = require('express');
const { updateProfile, searchUsers, getUserStats } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.get('/search', protect, searchUsers);
router.get('/stats', protect, getUserStats);
router.get('/stats/:userId', protect, getUserStats);

module.exports = router;
