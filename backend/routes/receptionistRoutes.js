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
  getPaymentHistory,
  getDoctors,
  getPatientsWithBilling,
  getPatientBillingDetails,
  checkoutPatient,
  uploadPatientDocument,
  getPatientDocuments,
  downloadPatientDocument,
  deletePatientDocument,
  getAllPatientsWithDocuments
} = require('../controllers/receptionistController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const documentUpload = require('../middleware/documentUploadMiddleware');

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

// Billing (View Only - Payments handled by Financial Management)
router.get('/patient/:patientId/billing', getPatientBilling);
router.get('/patient/:patientId/discharge-status', getDischargeStatus);
router.get('/patient/:patientId/payment-history', getPaymentHistory);

// Billing Management (View & Checkout Only)
router.get('/billing/patients', getPatientsWithBilling);
router.get('/billing/patient/:patientId', getPatientBillingDetails);
router.post('/billing/checkout/:patientId', checkoutPatient);

// Appointments
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.put('/appointments/:appointmentId', updateAppointment);
router.delete('/appointments/:appointmentId', cancelAppointment);

// Doctors
router.get('/doctors', getDoctors);

// Document Management
router.get('/documents/patients', getAllPatientsWithDocuments);
router.post('/patient/:patientId/document', documentUpload.single('file'), uploadPatientDocument);
router.get('/patient/:patientId/documents', getPatientDocuments);
router.get('/patient/:patientId/document/:documentType', downloadPatientDocument);
router.delete('/patient/:patientId/document/:documentType', deletePatientDocument);

module.exports = router;
