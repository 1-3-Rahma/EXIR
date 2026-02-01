const express = require('express');
const router = express.Router();
const {
  getNursingStaff,
  getNursesOnShift,
  assignPatient,
  updateTreatment,
  closeCase,
  getPatients,
  setPatientStatus,
  getCriticalCases,
  addPrescription
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('doctor'));

router.get('/nursing-staff', getNursingStaff);
router.get('/nurses-on-shift', getNursesOnShift);
router.post('/assign-patient', assignPatient);
router.put('/update-treatment', updateTreatment);
router.post('/close-case', closeCase);
router.get('/patients', getPatients);
router.put('/patient-status', setPatientStatus);
router.get('/critical-cases', getCriticalCases);
router.post('/prescription', addPrescription);

module.exports = router;
