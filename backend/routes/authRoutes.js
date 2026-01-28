const express = require('express');
const router = express.Router();
const {
  login,
  logout,
  requestOTP,
  verifyOTPAndLogin,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTPAndLogin);
router.get('/me', protect, getMe);

module.exports = router;
