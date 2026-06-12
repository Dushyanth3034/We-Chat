const express = require('express');
const { toggleReaction, getReactions } = require('../controllers/reactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', toggleReaction);
router.post('/toggle', toggleReaction);
router.get('/:messageId', getReactions);

module.exports = router;
