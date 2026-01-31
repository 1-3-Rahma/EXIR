const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['doctor', 'nurse', 'patient', 'receptionist'],
    required: true
  },
  hospitalId: {
    type: String,
    required: function() {
      return this.role !== 'patient';
    }
  },
  identifier: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return this.role !== 'patient';
    }
  },
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: function() {
      return this.role === 'patient';
    }
  },
  email: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night', null],
    default: null
  },
  shiftStartTime: {
    type: String,
    default: null
  },
  shiftEndTime: {
    type: String,
    default: null
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specialization: {
    type: String,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  otp: {
    code: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 3) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await this.save();
};

userSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
