const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  items: [{
    description: String,
    amount: Number,
    date: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

billingSchema.pre('save', function(next) {
  this.dueAmount = this.totalAmount - this.paidAmount;
  if (this.dueAmount <= 0) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'pending';
  }
  next();
});

billingSchema.index({ patientId: 1 });

module.exports = mongoose.model('Billing', billingSchema);
