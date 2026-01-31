const User = require('../models/User');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');

// @desc    Get nursing staff with assigned patients (for doctor UI)
// @route   GET /api/v1/doctor/nursing-staff
// @access  Private (Doctor)
// Only nurses on the same shift as the doctor appear (e.g. Dr. Ahmed Hassan morning → Nurse Fatima morning)
const getNursingStaff = async (req, res) => {
  try {
    const doctorShift = req.user.shift;
    const nurseQuery = { role: 'nurse', isActive: true };
    if (doctorShift) {
      nurseQuery.shift = doctorShift;
    }
    const nurses = await User.find(nurseQuery)
      .select('_id identifier fullName shift isLoggedIn')
      .sort({ fullName: 1 });

    const assignments = await Assignment.find({ isActive: true })
      .populate('patientId', 'fullName dateOfBirth contactInfo')
      .populate('nurseId', 'fullName shift');

    const byNurse = {};
    for (const a of assignments) {
      if (!a.nurseId || !a.patientId) continue;
      const nid = a.nurseId._id.toString();
      if (!byNurse[nid]) {
        byNurse[nid] = {
          _id: a.nurseId._id,
          fullName: a.nurseId.fullName,
          identifier: a.nurseId.identifier,
          shift: a.nurseId.shift,
          assignedPatients: []
        };
      }
      const p = a.patientId;
      const age = p.dateOfBirth ? Math.floor((new Date() - new Date(p.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      byNurse[nid].assignedPatients.push({
        _id: p._id,
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        age,
        room: p.contactInfo || '—',
        condition: '—'
      });
    }

    const staff = nurses.map(n => {
      const nid = n._id.toString();
      const assigned = byNurse[nid] ? byNurse[nid].assignedPatients : [];
      return {
        _id: n._id,
        fullName: n.fullName,
        identifier: n.identifier,
        shift: n.shift,
        isLoggedIn: n.isLoggedIn,
        assignedPatients: assigned,
        assignedPatientsCount: assigned.length
      };
    });

    res.json(staff);
  } catch (error) {
    console.error('Get nursing staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged-in nurses on current shift (same shift as doctor)
// @route   GET /api/v1/doctor/nurses-on-shift
// @access  Private (Doctor)
const getNursesOnShift = async (req, res) => {
  try {
    const doctorShift = req.user.shift;
    const nurseQuery = { role: 'nurse', isLoggedIn: true, isActive: true };
    if (doctorShift) {
      nurseQuery.shift = doctorShift;
    }
    const nurses = await User.find(nurseQuery).select('_id identifier fullName shift');

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

    if (!nurse.isActive) {
      return res.status(400).json({ message: 'Nurse is not active' });
    }

    // Nurse must be on the same shift as the doctor (e.g. morning doctor → morning nurses only)
    if (req.user.shift && nurse.shift !== req.user.shift) {
      return res.status(400).json({ message: `You can only assign patients to nurses on your shift (${req.user.shift}). This nurse is on ${nurse.shift} shift.` });
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

    // Second alert: prominent assignment notification for nurse
    await Notification.create({
      userId: nurseId,
      type: 'assignment',
      message: `New patient assigned: ${patient.fullName} (assigned by Dr. ${req.user.fullName})`,
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

// @desc    Get all patients under doctor's care (from cases + appointments from receptionist)
// @route   GET /api/v1/doctor/patients
// @access  Private (Doctor)
// Patients assigned to this doctor by receptionist (in appointments) appear here for that doctor's UI.
// Query: ?search= name or nationalID for dynamic search
const getPatients = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.json([]);
    }
    const doctorId = req.user._id;
    const search = (req.query.search || '').trim();

    const cases = await Case.find({ doctorId, status: 'open' })
      .populate('patientId', 'nationalID fullName dateOfBirth contactInfo');

    // Appointments where this doctor is assigned (receptionist assigns patients to this doctor)
    const appointments = await Appointment.find({
      doctorId,
      status: { $nin: ['cancelled'] },
      patientId: { $exists: true, $ne: null }
    })
      .populate('patientId', 'nationalID fullName dateOfBirth contactInfo');

    const patientMap = new Map();

    for (const c of cases) {
      if (!c.patientId) continue;
      const pid = c.patientId._id.toString();
      const activeAssignment = await Assignment.findOne({ patientId: c.patientId._id, isActive: true })
        .populate('nurseId', 'fullName');
      patientMap.set(pid, {
        ...c.patientId.toObject(),
        caseId: c._id,
        caseStatus: 'open',
        assignedNurse: activeAssignment?.nurseId?.fullName || null,
        appointmentDoctorName: req.user.fullName,
        appointmentDate: null,
        appointmentTime: null
      });
    }

    for (const apt of appointments) {
      if (!apt.patientId) continue;
      const pid = apt.patientId._id.toString();
      if (patientMap.has(pid)) {
        const existing = patientMap.get(pid);
        existing.appointmentDate = apt.date;
        existing.appointmentTime = apt.time;
        existing.appointmentDoctorName = apt.doctorName || req.user.fullName;
      } else {
        const activeAssignment = await Assignment.findOne({ patientId: apt.patientId._id, isActive: true })
          .populate('nurseId', 'fullName');
        patientMap.set(pid, {
          ...apt.patientId.toObject(),
          caseId: null,
          caseStatus: null,
          assignedNurse: activeAssignment?.nurseId?.fullName || null,
          appointmentDoctorName: apt.doctorName || req.user.fullName,
          appointmentDate: apt.date,
          appointmentTime: apt.time
        });
      }
    }

    let patients = Array.from(patientMap.values());

    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      patients = patients.filter(
        p =>
          (p.fullName && re.test(p.fullName)) ||
          (p.nationalID && (p.nationalID.includes(search) || re.test(p.nationalID)))
      );
    }

    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNursingStaff,
  getNursesOnShift,
  assignPatient,
  updateTreatment,
  closeCase,
  getPatients
};
