const User = require('../models/User');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const Case = require('../models/Case');
const Notification = require('../models/Notification');

// @desc    Get logged-in nurses on current shifts
// @route   GET /api/v1/doctor/nurses-on-shift
// @access  Private (Doctor)
const getNursesOnShift = async (req, res) => {
  try {
    const nurses = await User.find({
      role: 'nurse',
      isLoggedIn: true,
      isActive: true
    }).select('_id identifier fullName shift');

    const formattedNurses = nurses.map(nurse => ({
      nurseId: nurse._id,
      name: nurse.fullName,
      shift: nurse.shift
    }));

    res.json(formattedNurses);
  } catch (error) {
    console.error('Get nurses on shift error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Assign patient to a nurse
// @route   POST /api/v1/doctor/assign-patient
// @access  Private (Doctor)
const assignPatient = async (req, res) => {
  try {
    const { patientId, nurseId, shift } = req.body;
    const doctorId = req.user._id;

    if (!patientId || !nurseId || !shift) {
      return res.status(400).json({ message: 'Please provide patientId, nurseId, and shift' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const nurse = await User.findOne({ _id: nurseId, role: 'nurse' });
    if (!nurse) {
      return res.status(404).json({ message: 'Nurse not found' });
    }

    if (!nurse.isActive || !nurse.isLoggedIn) {
      return res.status(400).json({ message: 'Nurse is not available' });
    }

    await Assignment.updateMany(
      { patientId, isActive: true },
      { isActive: false }
    );

    const assignment = await Assignment.create({
      patientId,
      nurseId,
      doctorId,
      shift,
      isActive: true
    });

    await Notification.create({
      userId: nurseId,
      type: 'update',
      message: `You have been assigned to patient ${patient.fullName}`,
      relatedPatientId: patientId
    });

    res.status(201).json({
      message: 'Patient assigned successfully',
      assignment
    });
  } catch (error) {
    console.error('Assign patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update patient treatment plan
// @route   PUT /api/v1/doctor/update-treatment
// @access  Private (Doctor)
const updateTreatment = async (req, res) => {
  try {
    const { patientId, treatmentPlan, diagnosis, notes } = req.body;
    const doctorId = req.user._id;

    if (!patientId || !treatmentPlan) {
      return res.status(400).json({ message: 'Please provide patientId and treatmentPlan' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    let patientCase = await Case.findOne({ patientId, status: 'open' });
    if (!patientCase) {
      patientCase = await Case.create({
        patientId,
        doctorId,
        treatmentPlan,
        diagnosis: diagnosis || '',
        notes: notes || ''
      });
    } else {
      patientCase.treatmentPlan = treatmentPlan;
      if (diagnosis) patientCase.diagnosis = diagnosis;
      if (notes) patientCase.notes = notes;
      await patientCase.save();
    }

    if (patient.userId) {
      await Notification.create({
        userId: patient.userId,
        type: 'update',
        message: `Your treatment plan has been updated by Dr. ${req.user.fullName}`,
        relatedPatientId: patientId
      });
    }

    const assignments = await Assignment.find({ patientId, isActive: true });
    for (const assignment of assignments) {
      await Notification.create({
        userId: assignment.nurseId,
        type: 'update',
        message: `Treatment plan updated for patient ${patient.fullName}`,
        relatedPatientId: patientId
      });
    }

    res.json({
      message: 'Treatment updated and notifications sent',
      case: patientCase
    });
  } catch (error) {
    console.error('Update treatment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Close patient case
// @route   POST /api/v1/doctor/close-case
// @access  Private (Doctor)
const closeCase = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Please provide patientId' });
    }

    const patientCase = await Case.findOne({ patientId, status: 'open' });
    if (!patientCase) {
      return res.status(404).json({ message: 'No open case found for this patient' });
    }

    patientCase.status = 'closed';
    patientCase.closedAt = new Date();
    await patientCase.save();

    await Assignment.updateMany(
      { patientId, isActive: true },
      { isActive: false }
    );

    const patient = await Patient.findById(patientId);
    if (patient && patient.userId) {
      await Notification.create({
        userId: patient.userId,
        type: 'update',
        message: 'Your case has been closed',
        relatedPatientId: patientId
      });
    }

    res.json({
      message: 'Case closed successfully',
      case: patientCase
    });
  } catch (error) {
    console.error('Close case error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all patients under doctor's care
// @route   GET /api/v1/doctor/patients
// @access  Private (Doctor)
const getPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const cases = await Case.find({ doctorId, status: 'open' })
      .populate('patientId', 'nationalID fullName dateOfBirth contactInfo');

    const patients = cases.map(c => c.patientId);
    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNursesOnShift,
  assignPatient,
  updateTreatment,
  closeCase,
  getPatients
};
