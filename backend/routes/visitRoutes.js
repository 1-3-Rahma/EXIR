const express = require('express');
const router = express.Router();
const {
  startVisit,
  endVisit,
  getVisit,
  getActiveVisits
} = require('../controllers/visitController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/start', startVisit);
router.put('/:visitId/end', endVisit);
router.get('/active', getActiveVisits);
router.get('/:visitId', getVisit);

module.exports = router;
