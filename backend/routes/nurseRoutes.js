const express = require('express');
const router = express.Router();
const {
  getAssignedPatients,
  getCriticalEvents,
  getUrgentCases,
  getPatientVitals,
  getVitalsOverview,
  getDashboardStats,
  getMedications,
  getFormattedVitalsOverview,
  recordVitals,
  getVitalRanges,
  markMedicationAsGiven,
  updatePatientRoom,
  updatePatientBloodPressure,
  addPatientComment,
  getPatientComments
} = require('../controllers/nurseController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('nurse'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Patients
router.get('/assigned-patients', getAssignedPatients);
router.put('/patient/:patientId/room', updatePatientRoom);
router.put('/patient/:patientId/blood-pressure', updatePatientBloodPressure);
router.post('/patient/:patientId/comments', addPatientComment);
router.get('/patient/:patientId/comments', getPatientComments);

// Vitals
router.get('/vitals-overview', getVitalsOverview);
router.get('/vitals-formatted', getFormattedVitalsOverview);
router.get('/vital-ranges', getVitalRanges);
router.get('/patient/:patientId/vitals', getPatientVitals);
router.post('/vitals', recordVitals);

// Medications
router.get('/medications', getMedications);
router.put('/medication/:medicationId/given', markMedicationAsGiven);

// Events/Notifications
router.get('/critical-events', getCriticalEvents);
router.get('/urgent-cases', getUrgentCases);

module.exports = router;
