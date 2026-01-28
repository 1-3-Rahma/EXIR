const User = require('../models/User');
const Patient = require('../models/Patient');
const generateToken = require('../utils/generateToken');
const { generateOTP, verifyOTP } = require('../utils/generateOTP');

// @desc    Login for all roles (doctor, nurse, receptionist)
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { role, identifier, password, hospitalId } = req.body;

    if (!role || !identifier || !password) {
      return res.status(400).json({ message: 'Please provide role, identifier, and password' });
    }

    if (role === 'patient') {
      return res.status(400).json({ message: 'Patients must use OTP login' });
    }

    const user = await User.findOne({ identifier, role });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account is locked. Try again in ${lockTime} minutes.`
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await user.incrementFailedAttempts();
      const attemptsLeft = 3 - user.failedLoginAttempts;
      return res.status(401).json({
        message: `Invalid credentials. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : 'Account locked.'}`
      });
    }

    await user.resetFailedAttempts();
    user.isLoggedIn = true;
    await user.save();

    res.json({
      token: generateToken(user._id, user.role),
      role: user.role,
      userId: user._id,
      fullName: user.fullName
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.isLoggedIn = false;
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Request OTP for patient login
// @route   POST /api/v1/auth/request-otp
// @access  Public
const requestOTP = async (req, res) => {
  try {
    const { nationalID, phone } = req.body;

    if (!nationalID || !phone) {
      return res.status(400).json({ message: 'Please provide nationalID and phone number' });
    }

    const patient = await Patient.findOne({ nationalID, phone });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found with this National ID and phone' });
    }

    let user = await User.findOne({ identifier: nationalID, role: 'patient' });
    if (!user) {
      user = await User.create({
        role: 'patient',
        identifier: nationalID,
        fullName: patient.fullName,
        phone: phone
      });
      patient.userId = user._id;
      await patient.save();
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account is locked. Try again in ${lockTime} minutes.`
      });
    }

    const otp = generateOTP();
    user.otp = otp;
    await user.save();

    console.log('========================================');
    console.log(`OTP for ${nationalID}: ${otp.code}`);
    console.log(`Expires at: ${otp.expiresAt}`);
    console.log('========================================');

    res.json({
      message: 'OTP sent successfully',
      expiresIn: '5 minutes'
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify OTP and login patient
// @route   POST /api/v1/auth/verify-otp
// @access  Public
const verifyOTPAndLogin = async (req, res) => {
  try {
    const { nationalID, otp } = req.body;

    if (!nationalID || !otp) {
      return res.status(400).json({ message: 'Please provide nationalID and OTP' });
    }

    const user = await User.findOne({ identifier: nationalID, role: 'patient' });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account is locked. Try again in ${lockTime} minutes.`
      });
    }

    const verification = verifyOTP(user.otp, otp);
    if (!verification.valid) {
      await user.incrementFailedAttempts();
      return res.status(401).json({ message: verification.message });
    }

    await user.resetFailedAttempts();
    user.otp = undefined;
    user.isLoggedIn = true;
    await user.save();

    const patient = await Patient.findOne({ nationalID });

    res.json({
      token: generateToken(user._id, user.role),
      role: user.role,
      userId: user._id,
      patientId: patient?._id,
      fullName: user.fullName
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp');
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  logout,
  requestOTP,
  verifyOTPAndLogin,
  getMe
};
