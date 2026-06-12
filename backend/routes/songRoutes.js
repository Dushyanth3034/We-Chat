const express = require('express');
const { searchSongs, getTrendingSongs, getRecentlyUsedSongs, selectSong } = require('../controllers/songController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/search', protect, searchSongs);
router.get('/trending', protect, getTrendingSongs);
router.get('/recent', protect, getRecentlyUsedSongs);
router.post('/select', protect, selectSong);

module.exports = router;
