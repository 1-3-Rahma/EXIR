const express = require('express');
const router = express.Router();
const {
  registerPatient,
  getPatient,
  searchPatientByNationalID,
  getPatientVisits,
  getPatientBilling,
  getDischargeStatus,
  updatePatient
} = require('../controllers/receptionistController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('receptionist'));

router.post('/register-patient', registerPatient);
router.get('/patient/search/:nationalID', searchPatientByNationalID);
router.get('/patient/:patientId', getPatient);
router.put('/patient/:patientId', updatePatient);
router.get('/patient/:patientId/visits', getPatientVisits);
router.get('/patient/:patientId/billing', getPatientBilling);
router.get('/patient/:patientId/discharge-status', getDischargeStatus);

module.exports = router;
