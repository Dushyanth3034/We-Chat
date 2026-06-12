const express = require('express');
const {
  getCallHistory,
  createCall,
  updateCall,
  createGroupCall,
  joinGroupCall,
  leaveGroupCall,
  endGroupCall
} = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getCallHistory);
router.post('/', createCall);
router.put('/:id', updateCall);

router.post('/group', createGroupCall);
router.post('/group/:id/join', joinGroupCall);
router.post('/group/:id/leave', leaveGroupCall);
router.post('/group/:id/end', endGroupCall);

module.exports = router;
