const express = require('express');
const router = express.Router();
const {
  registerPatient,
  getPatient,
  getAllPatients,
  searchPatientByNationalID,
  searchPatientByName,
  searchPatientByPhone,
  getPatientVisits,
  getPatientBilling,
  getDischargeStatus,
  updatePatient,
  getDashboardStats,
  getTodayArrivals,
  checkInPatient,
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  recordPayment,
  getPaymentHistory,
  getDoctors
} = require('../controllers/receptionistController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('receptionist'));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);
router.get('/today-arrivals', getTodayArrivals);

// Patient management
router.get('/patients', getAllPatients);
router.post('/register-patient', registerPatient);
router.get('/patient/search/:nationalID', searchPatientByNationalID);
router.get('/patient/search/name/:name', searchPatientByName);
router.get('/patient/search/phone/:phone', searchPatientByPhone);
router.get('/patient/:patientId', getPatient);
router.put('/patient/:patientId', updatePatient);
router.post('/patient/:patientId/checkin', checkInPatient);

// Visit history
router.get('/patient/:patientId/visits', getPatientVisits);

// Billing & Payments
router.get('/patient/:patientId/billing', getPatientBilling);
router.get('/patient/:patientId/discharge-status', getDischargeStatus);
router.post('/patient/:patientId/payment', recordPayment);
router.get('/patient/:patientId/payment-history', getPaymentHistory);

// Appointments
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.put('/appointments/:appointmentId', updateAppointment);
router.delete('/appointments/:appointmentId', cancelAppointment);

// Doctors
router.get('/doctors', getDoctors);

module.exports = router;
