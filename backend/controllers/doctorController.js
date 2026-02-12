const User = require('../models/User');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');

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
      .populate('patientId', 'fullName dateOfBirth contactInfo room')
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
        room: p.room || '—',
        condition: '—'
      });
    }

    // Fetch cases to get prescription and IV order counts for all assigned patients
    const allPatientIds = [];
    Object.values(byNurse).forEach(n => {
      n.assignedPatients.forEach(p => allPatientIds.push(p._id));
    });

    const casesWithMeds = await Case.find({
      patientId: { $in: allPatientIds },
      status: 'open'
    }).select('patientId medications ivOrders');

    const medCountByPatient = {};
    casesWithMeds.forEach(c => {
      const pid = c.patientId.toString();
      medCountByPatient[pid] = {
        prescriptionsCount: c.medications?.length || 0,
        ivOrdersCount: c.ivOrders?.length || 0,
        prescriptions: c.medications || [],
        ivOrders: c.ivOrders || []
      };
    });

    const staff = nurses.map(n => {
      const nid = n._id.toString();
      const assigned = byNurse[nid] ? byNurse[nid].assignedPatients.map(p => {
        const patientMeds = medCountByPatient[p._id.toString()];
        return {
          ...p,
          prescriptionsCount: patientMeds?.prescriptionsCount || 0,
          ivOrdersCount: patientMeds?.ivOrdersCount || 0,
          prescriptions: patientMeds?.prescriptions || [],
          ivOrders: patientMeds?.ivOrders || []
        };
      }) : [];
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
// patientStatus (stable/critical) from Case is single source of truth for both doctor and nurse UI.
// Query: ?search= name or nationalID for dynamic search
const getPatients = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.json([]);
    }
    const doctorId = req.user._id;
    const search = (req.query.search || '').trim();
    const isEmergency = req.user.department === 'Emergency';

    const patientMap = new Map();

    // Emergency doctors: see ALL checked-in patients (active visits)
    // EXCEPT patients who already have an appointment with a specific doctor
    if (isEmergency) {
      const activeVisits = await Visit.find({ status: 'admitted' })
        .populate('patientId', 'nationalID fullName dateOfBirth contactInfo room');

      const visitPatientIds = activeVisits
        .filter(v => v.patientId)
        .map(v => v.patientId._id);

      // Find patients that have active appointments (exclude them from emergency list)
      const appointedPatients = await Appointment.find({
        patientId: { $in: visitPatientIds },
        status: { $in: ['pending', 'confirmed'] }
      });
      const appointedPatientIds = new Set(
        appointedPatients.map(a => a.patientId.toString())
      );

      // Check if any of these patients have open cases (from any doctor)
      const openCases = await Case.find({
        patientId: { $in: visitPatientIds },
        status: 'open'
      });
      const caseByPatient = {};
      openCases.forEach(c => {
        caseByPatient[c.patientId.toString()] = c;
      });

      for (const v of activeVisits) {
        if (!v.patientId) continue;
        const pid = v.patientId._id.toString();
        // Skip patients who have an appointment with a doctor
        if (appointedPatientIds.has(pid)) continue;
        const existingCase = caseByPatient[pid];
        const activeAssignment = await Assignment.findOne({ patientId: v.patientId._id, isActive: true })
          .populate('nurseId', 'fullName');
        patientMap.set(pid, {
          ...v.patientId.toObject(),
          caseId: existingCase?._id || null,
          caseStatus: existingCase ? 'open' : null,
          patientStatus: existingCase?.patientStatus || 'stable',
          medications: existingCase?.medications || [],
          assignedNurse: activeAssignment?.nurseId?.fullName || null,
          appointmentDoctorName: req.user.fullName,
          appointmentDate: null,
          appointmentTime: null
        });
      }
    }

    // All doctors (including emergency): also include their own cases and appointments
    const cases = await Case.find({ doctorId, status: 'open' })
      .populate('patientId', 'nationalID fullName dateOfBirth contactInfo room');

    const appointments = await Appointment.find({
      doctorId,
      status: { $nin: ['cancelled'] },
      patientId: { $exists: true, $ne: null }
    })
      .populate('patientId', 'nationalID fullName dateOfBirth contactInfo room');

    for (const c of cases) {
      if (!c.patientId) continue;
      const pid = c.patientId._id.toString();
      if (patientMap.has(pid)) continue; // already added from visits
      const activeAssignment = await Assignment.findOne({ patientId: c.patientId._id, isActive: true })
        .populate('nurseId', 'fullName');
      patientMap.set(pid, {
        ...c.patientId.toObject(),
        caseId: c._id,
        caseStatus: 'open',
        patientStatus: c.patientStatus || 'stable',
        medications: c.medications || [],
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
          patientStatus: 'stable',
          medications: [],
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

// @desc    Set patient status (stable / critical) for a case
// @route   PUT /api/v1/doctor/patient-status
// @access  Private (Doctor)
const setPatientStatus = async (req, res) => {
  try {
    const { patientId, caseId, status } = req.body;
    const doctorId = req.user._id;

    if (!patientId || !status || !['stable', 'critical'].includes(status)) {
      return res.status(400).json({ message: 'Please provide patientId and status (stable or critical)' });
    }

    let patientCase = await Case.findOne({ patientId, doctorId, status: 'open' });
    if (!patientCase) {
      patientCase = await Case.create({
        patientId,
        doctorId,
        status: 'open',
        patientStatus: status,
        treatmentPlan: '',
        diagnosis: '',
        notes: ''
      });
    } else {
      patientCase.patientStatus = status;
      await patientCase.save();
    }

    const patient = await Patient.findById(patientId).select('fullName');
    const patientName = patient?.fullName || 'Unknown';
    const doctorName = req.user.fullName || 'Doctor';
    const assignments = await Assignment.find({ patientId, isActive: true });

    if (status === 'critical') {
      for (const a of assignments) {
        await Notification.create({
          userId: a.nurseId,
          type: 'critical',
          message: `Patient ${patientName} marked as critical by Dr. ${doctorName}`,
          relatedPatientId: patientId
        });
      }
    }

    // Real-time: notify assigned nurses immediately so they see update without refresh
    const io = req.app.get('io');
    if (io) {
      const payload = {
        patientId,
        status,
        patientName,
        doctorName,
        message: status === 'critical'
          ? `Patient ${patientName} marked as critical by Dr. ${doctorName}`
          : `Patient ${patientName} reverted to stable by Dr. ${doctorName}`
      };
      for (const a of assignments) {
        const nurseId = a.nurseId?.toString?.() || a.nurseId;
        if (nurseId) io.to(`nurse:${nurseId}`).emit('patientStatusChanged', payload);
      }
    }

    res.json({ message: 'Patient status updated', case: patientCase });
  } catch (error) {
    console.error('Set patient status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get critical cases for this doctor (for dashboard count and Priority Cases page)
// @route   GET /api/v1/doctor/critical-cases
// @access  Private (Doctor)
const getCriticalCases = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const cases = await Case.find({ doctorId, status: 'open', patientStatus: 'critical' })
      .populate('patientId', 'fullName nationalID room');

    const assignments = await Assignment.find({
      patientId: { $in: cases.map(c => c.patientId._id) },
      isActive: true
    });
    const roomByPatient = {};
    assignments.forEach(a => {
      roomByPatient[a.patientId.toString()] = a.patientId?.room || 'N/A';
    });

    const list = cases.map(c => ({
      _id: c._id,
      patientId: c.patientId._id,
      patientName: c.patientId?.fullName || 'Unknown',
      room: c.patientId?.room || 'N/A',
      reason: c.diagnosis || 'Marked critical by doctor',
      severity: 'high',
      createdAt: c.updatedAt
    }));

    res.json(list);
  } catch (error) {
    console.error('Get critical cases error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add prescription (medications) to a patient's case – notifies assigned nurses
// @route   POST /api/v1/doctor/prescription
// @access  Private (Doctor)
const addPrescription = async (req, res) => {
  try {
    const { patientId, medications } = req.body;
    const doctorId = req.user._id;

    if (!patientId || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ message: 'Please provide patientId and at least one medication' });
    }

    let patientCase = await Case.findOne({ patientId, doctorId, status: 'open' });
    if (!patientCase) {
      patientCase = await Case.create({
        patientId,
        doctorId,
        status: 'open',
        patientStatus: 'stable',
        treatmentPlan: '',
        diagnosis: '',
        notes: '',
        medications: []
      });
    }
    if (!patientCase.medications) patientCase.medications = [];

    const SLOTS = ['morning', 'afternoon', 'evening', 'night'];
    const validMeds = medications.filter(m =>
      m && String(m.medicineName || '').trim() && (m.timesPerDay != null && m.timesPerDay !== '')
    ).map(m => {
      const timesPerDay = Number(m.timesPerDay);
      let schedule = Array.isArray(m.schedule) ? m.schedule.filter(s => SLOTS.includes(s)) : [];
      if (schedule.length === 0 && timesPerDay >= 1 && timesPerDay <= 4) {
        const defaults = [
          ['morning'],
          ['morning', 'evening'],
          ['morning', 'afternoon', 'night'],
          ['morning', 'afternoon', 'evening', 'night']
        ];
        schedule = defaults[timesPerDay - 1] || ['morning'];
      }
      if (schedule.length === 0) schedule = ['morning'];
      return {
        medicineName: String(m.medicineName || '').trim(),
        timesPerDay,
        schedule,
        note: String(m.note || '').trim()
      };
    });

    patientCase.medications.push(...validMeds);
    await patientCase.save();

    // Send notification to assigned nurses
    const patient = await Patient.findById(patientId).select('fullName');
    const patientName = patient?.fullName || 'Unknown';
    const doctorName = req.user.fullName || 'Doctor';
    const assignments = await Assignment.find({ patientId, isActive: true });

    // Build medication list for notification
    const medList = validMeds.map(m => m.medicineName).join(', ');

    for (const a of assignments) {
      await Notification.create({
        userId: a.nurseId,
        type: 'assignment',
        message: `New prescription for ${patientName}: ${medList}. Dr. ${doctorName}`,
        relatedPatientId: patientId
      });
    }

    // Real-time: notify assigned nurses immediately via socket
    const io = req.app.get('io');
    if (io) {
      const payload = {
        type: 'prescription',
        patientId,
        patientName,
        doctorName,
        medications: validMeds,
        message: `New prescription for ${patientName}: ${medList}. Dr. ${doctorName}`
      };
      for (const a of assignments) {
        const nurseId = a.nurseId?.toString?.() || a.nurseId;
        if (nurseId) io.to(`nurse:${nurseId}`).emit('newNotification', payload);
      }
    }

    res.status(201).json({ message: 'Prescription added', case: patientCase });
  } catch (error) {
    console.error('Add prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add IV order for a patient – notifies assigned nurses
// @route   POST /api/v1/doctor/iv-order
// @access  Private (Doctor)
const addIvOrder = async (req, res) => {
  try {
    const { patientId, fluidName, volume, rate, instructions } = req.body;
    const doctorId = req.user._id;

    if (!patientId || !fluidName || !String(fluidName).trim()) {
      return res.status(400).json({ message: 'Please provide patientId and fluidName' });
    }

    let patientCase = await Case.findOne({ patientId, doctorId, status: 'open' });
    if (!patientCase) {
      patientCase = await Case.create({
        patientId,
        doctorId,
        status: 'open',
        patientStatus: 'stable',
        treatmentPlan: '',
        diagnosis: '',
        notes: '',
        medications: [],
        ivOrders: []
      });
    }
    if (!patientCase.ivOrders) patientCase.ivOrders = [];

    patientCase.ivOrders.push({
      fluidName: String(fluidName || '').trim(),
      volume: String(volume || '').trim(),
      rate: String(rate || '').trim(),
      instructions: String(instructions || '').trim()
    });
    await patientCase.save();

    const patient = await Patient.findById(patientId).select('fullName');
    const patientName = patient?.fullName || 'Unknown';
    const doctorName = req.user.fullName || 'Doctor';
    const assignments = await Assignment.find({ patientId, isActive: true });

    for (const a of assignments) {
      await Notification.create({
        userId: a.nurseId,
        type: 'assignment',
        message: `IV order for ${patientName}: ${fluidName}${volume ? ` ${volume}` : ''}${rate ? ` @ ${rate}` : ''}. Dr. ${doctorName}`,
        relatedPatientId: patientId
      });
    }

    // Real-time: notify assigned nurses immediately via socket
    const io = req.app.get('io');
    if (io) {
      const payload = {
        type: 'iv_order',
        patientId,
        patientName,
        doctorName,
        fluidName,
        volume,
        rate,
        message: `IV order for ${patientName}: ${fluidName}${volume ? ` ${volume}` : ''}${rate ? ` @ ${rate}` : ''}. Dr. ${doctorName}`
      };
      for (const a of assignments) {
        const nurseId = a.nurseId?.toString?.() || a.nurseId;
        if (nurseId) io.to(`nurse:${nurseId}`).emit('newNotification', payload);
      }
    }

    res.status(201).json({ message: 'IV order added', case: patientCase });
  } catch (error) {
    console.error('Add IV order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNursingStaff,
  getNursesOnShift,
  assignPatient,
  updateTreatment,
  closeCase,
  getPatients,
  setPatientStatus,
  getCriticalCases,
  addPrescription,
  addIvOrder
};
