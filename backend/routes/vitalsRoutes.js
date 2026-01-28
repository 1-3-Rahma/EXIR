const express = require('express');
const router = express.Router();
const {
  receiveVitals,
  getVitalsByPatient,
  getLatestVital,
  getCriticalVitals
} = require('../controllers/vitalsController');
const { protect } = require('../middleware/authMiddleware');

router.post('/receive', receiveVitals);

router.use(protect);

router.get('/patient/:patientId', getVitalsByPatient);
router.get('/patient/:patientId/latest', getLatestVital);
router.get('/critical', getCriticalVitals);

module.exports = router;
