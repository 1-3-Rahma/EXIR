const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');

// @desc    Start new hospital visit
// @route   POST /api/v1/visits/start
// @access  Private
const startVisit = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Please provide patientId' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const existingVisit = await Visit.findOne({
      patientId,
      status: 'admitted'
    });

    if (existingVisit) {
      return res.status(400).json({
        message: 'Patient already has an active visit',
        visitId: existingVisit._id
      });
    }

    const visit = await Visit.create({
      patientId,
      hospitalId: req.user.hospitalId || 'default',
      registeredBy: req.user._id
    });

    await Billing.create({
      patientId,
      visitId: visit._id,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0
    });

    res.status(201).json({
      message: 'Visit started',
      visit
    });
  } catch (error) {
    console.error('Start visit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    End hospital visit (discharge)
// @route   PUT /api/v1/visits/:visitId/end
// @access  Private
const endVisit = async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    if (visit.status === 'discharged') {
      return res.status(400).json({ message: 'Visit already ended' });
    }

    const billing = await Billing.findOne({ visitId });
    if (billing && billing.dueAmount > 0) {
      return res.status(400).json({
        message: 'Cannot discharge patient with outstanding balance',
        dueAmount: billing.dueAmount
      });
    }

    visit.status = 'discharged';
    visit.dischargeDate = new Date();
    await visit.save();

    res.json({
      message: 'Visit ended successfully',
      visit
    });
  } catch (error) {
    console.error('End visit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get visit by ID
// @route   GET /api/v1/visits/:visitId
// @access  Private
const getVisit = async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId)
      .populate('patientId', 'fullName nationalID')
      .populate('registeredBy', 'fullName');

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    res.json(visit);
  } catch (error) {
    console.error('Get visit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all active visits
// @route   GET /api/v1/visits/active
// @access  Private
const getActiveVisits = async (req, res) => {
  try {
    const visits = await Visit.find({ status: 'admitted' })
      .populate('patientId', 'fullName nationalID')
      .sort({ admissionDate: -1 });

    res.json(visits);
  } catch (error) {
    console.error('Get active visits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  startVisit,
  endVisit,
  getVisit,
  getActiveVisits
};
