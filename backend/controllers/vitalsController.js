const Vital = require('../models/Vital');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const Case = require('../models/Case');
const { checkCriticalVitals } = require('../utils/criticalDetection');

// @desc    Receive vitals from sensors
// @route   POST /api/v1/vitals/receive
// @access  Public (from sensors)
const receiveVitals = async (req, res) => {
  try {
    const { patientId, heartRate, spo2, temperature, source = 'sensor' } = req.body;

    if (!patientId || heartRate === undefined || spo2 === undefined || temperature === undefined) {
      return res.status(400).json({
        message: 'Please provide patientId, heartRate, spo2, and temperature'
      });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const criticalCheck = checkCriticalVitals({ heartRate, spo2, temperature });

    const vital = await Vital.create({
      patientId,
      heartRate,
      spo2,
      temperature,
      source,
      isCritical: criticalCheck.isCritical
    });

    if (criticalCheck.isCritical) {
      const assignments = await Assignment.find({ patientId, isActive: true })
        .populate('doctorId');

      const criticalMessage = `CRITICAL: Patient ${patient.fullName} - ${criticalCheck.conditions.join('; ')}`;

      for (const assignment of assignments) {
        await Notification.create({
          userId: assignment.nurseId,
          type: 'critical',
          message: criticalMessage,
          relatedPatientId: patientId,
          relatedVitalId: vital._id
        });

        if (assignment.doctorId) {
          await Notification.create({
            userId: assignment.doctorId._id,
            type: 'critical',
            message: criticalMessage,
            relatedPatientId: patientId,
            relatedVitalId: vital._id
          });
        }
      }

      const openCase = await Case.findOne({ patientId, status: 'open' });
      if (openCase) {
        await Notification.create({
          userId: openCase.doctorId,
          type: 'critical',
          message: criticalMessage,
          relatedPatientId: patientId,
          relatedVitalId: vital._id
        });
      }
    }

    res.status(201).json({
      message: 'Vitals recorded',
      vital,
      isCritical: criticalCheck.isCritical,
      criticalConditions: criticalCheck.conditions
    });
  } catch (error) {
    console.error('Receive vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get vitals by patient ID
// @route   GET /api/v1/vitals/patient/:patientId
// @access  Private
const getVitalsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    let query = { patientId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const vitals = await Vital.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(vitals);
  } catch (error) {
    console.error('Get vitals by patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get latest vital for a patient
// @route   GET /api/v1/vitals/patient/:patientId/latest
// @access  Private
const getLatestVital = async (req, res) => {
  try {
    const { patientId } = req.params;

    const vital = await Vital.findOne({ patientId })
      .sort({ createdAt: -1 });

    if (!vital) {
      return res.status(404).json({ message: 'No vitals found for this patient' });
    }

    res.json(vital);
  } catch (error) {
    console.error('Get latest vital error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get critical vitals history
// @route   GET /api/v1/vitals/critical
// @access  Private
const getCriticalVitals = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const vitals = await Vital.find({ isCritical: true })
      .populate('patientId', 'fullName nationalID')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(vitals);
  } catch (error) {
    console.error('Get critical vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  receiveVitals,
  getVitalsByPatient,
  getLatestVital,
  getCriticalVitals
};
