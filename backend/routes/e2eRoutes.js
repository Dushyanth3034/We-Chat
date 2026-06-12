const express = require('express');
const {
  setupE2EKeys,
  getPublicKey,
  getGroupPublicKeys,
  getConversationKey,
  storeConversationKey,
} = require('../controllers/e2eController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.put('/setup', setupE2EKeys);
router.get('/public-key/:userId', getPublicKey);
router.get('/group-keys/:groupId', getGroupPublicKeys);
router.get('/conversation-key', getConversationKey);
router.post('/conversation-key', storeConversationKey);

module.exports = router;
