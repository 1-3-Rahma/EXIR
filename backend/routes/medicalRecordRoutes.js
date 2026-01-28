const express = require('express');
const router = express.Router();
const {
  uploadRecord,
  getPatientRecords,
  downloadFile,
  deleteRecord
} = require('../controllers/medicalRecordController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/upload', upload.single('file'), uploadRecord);
router.get('/patient/:patientId', getPatientRecords);
router.delete('/:recordId', deleteRecord);

module.exports = router;
