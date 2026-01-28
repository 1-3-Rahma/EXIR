const express = require('express');
const router = express.Router();
const {
  getVitals,
  getMedicalHistory,
  getBilling,
  downloadRecords,
  getProfile
} = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('patient'));

router.get('/vitals', getVitals);
router.get('/medical-history', getMedicalHistory);
router.get('/billing', getBilling);
router.get('/download-records', downloadRecords);
router.get('/profile', getProfile);

module.exports = router;
