const express = require('express');
const { sendVoiceMessage, deleteVoiceMessage } = require('../controllers/voiceController');
const { protect } = require('../middleware/authMiddleware');
const voiceUpload = require('../middleware/voiceUploadMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', voiceUpload.single('audio'), sendVoiceMessage);
router.delete('/:id', deleteVoiceMessage);

module.exports = router;
