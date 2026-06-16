const express = require('express');
const {
  register,
  login,
  getMe,
  changePassword,
  googleLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.put('/password', protect, changePassword);

module.exports = router;
