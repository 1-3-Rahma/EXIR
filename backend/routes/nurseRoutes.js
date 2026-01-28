const express = require('express');
const router = express.Router();
const {
  getAssignedPatients,
  getCriticalEvents,
  getPatientVitals,
  getVitalsOverview
} = require('../controllers/nurseController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('nurse'));

router.get('/assigned-patients', getAssignedPatients);
router.get('/critical-events', getCriticalEvents);
router.get('/patient/:patientId/vitals', getPatientVitals);
router.get('/vitals-overview', getVitalsOverview);

module.exports = router;
