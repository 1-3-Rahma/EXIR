const express = require('express');
const router = express.Router();
const { downloadFile } = require('../controllers/medicalRecordController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:recordId', downloadFile);

module.exports = router;
