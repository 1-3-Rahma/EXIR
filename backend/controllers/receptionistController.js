const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Billing = require('../models/Billing');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Register a new patient
// @route   POST /api/v1/receptionist/register-patient
// @access  Private (Receptionist)
const registerPatient = async (req, res) => {
  try {
    const {
      nationalID,
      fullName,
      dateOfBirth,
      gender,
      contactInfo,
      emergencyContact,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      phone,
      email,
      address
    } = req.body;

    if (!nationalID || !fullName) {
      return res.status(400).json({ message: 'National ID and full name are required' });
    }

    if (!gender) {
      return res.status(400).json({ message: 'Gender is required' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Validate phone number is exactly 11 digits
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 11 digits' });
    }

    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    // Validate emergency contact info
    if (!emergencyContactName) {
      return res.status(400).json({ message: 'Emergency contact name is required' });
    }

    if (!emergencyContactPhone) {
      return res.status(400).json({ message: 'Emergency contact phone is required' });
    }

    // Validate emergency contact phone is exactly 11 digits
    if (!/^\d{11}$/.test(emergencyContactPhone)) {
      return res.status(400).json({ message: 'Emergency contact phone must be exactly 11 digits' });
    }

    if (!emergencyContactRelation) {
      return res.status(400).json({ message: 'Emergency contact relationship is required' });
    }

    let patient = await Patient.findOne({ nationalID });

    if (patient) {
      return res.status(400).json({
        message: 'Patient with this National ID already exists',
        patientId: patient._id
      });
    }

    patient = await Patient.create({
      nationalID,
      fullName,
      dateOfBirth: dateOfBirth || null,
      gender,
      contactInfo: contactInfo || address,
      emergencyContact: emergencyContact || `${emergencyContactName} (${emergencyContactRelation}) - ${emergencyContactPhone}`,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      phone,
      email: email || '',
      address,
      registeredByReceptionistId: req.user._id
    });

    // Auto-create today's arrival appointment for the newly registered patient
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    await Appointment.create({
      patientId: patient._id,
      patientName: fullName,
      department: 'General',
      date: now,
      time: currentTime,
      status: 'pending',
      notes: 'New patient registration',
      createdBy: req.user._id
    });

    res.status(201).json({
      message: 'Patient registered successfully',
      patient
    });
  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient profile
// @route   GET /api/v1/receptionist/patient/:patientId
// @access  Private (Receptionist)
const getPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Return all patient fields
    res.json({
      _id: patient._id,
      nationalID: patient.nationalID,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      contactInfo: patient.contactInfo,
      emergencyContact: patient.emergencyContact,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelation: patient.emergencyContactRelation,
      createdAt: patient.createdAt
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search patient by National ID (partial match)
// @route   GET /api/v1/receptionist/patient/search/:nationalID
// @access  Private (Receptionist)
const searchPatientByNationalID = async (req, res) => {
  try {
    const { nationalID } = req.params;

    // Use regex for partial matching - filter as user types
    const patients = await Patient.find({
      nationalID: { $regex: nationalID, $options: 'i' }
    }).limit(10);

    if (patients.length === 0) {
      return res.status(404).json({ message: 'No patients found' });
    }

    // Return array for consistency with other search methods
    res.json(patients);
  } catch (error) {
    console.error('Search patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient visit history
// @route   GET /api/v1/receptionist/patient/:patientId/visits
// @access  Private (Receptionist)
const getPatientVisits = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const visits = await Visit.find({ patientId })
      .sort({ admissionDate: -1 });

    const formattedVisits = visits.map(v => ({
      visitId: v._id,
      admissionDate: v.admissionDate,
      dischargeDate: v.dischargeDate,
      status: v.status
    }));

    res.json(formattedVisits);
  } catch (error) {
    console.error('Get patient visits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient billing
// @route   GET /api/v1/receptionist/patient/:patientId/billing
// @access  Private (Receptionist)
const getPatientBilling = async (req, res) => {
  try {
    const { patientId } = req.params;

    const billing = await Billing.findOne({ patientId })
      .sort({ createdAt: -1 });

    if (!billing) {
      return res.json({
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        paymentStatus: 'no_bills'
      });
    }

    res.json({
      totalAmount: billing.totalAmount,
      paidAmount: billing.paidAmount,
      dueAmount: billing.dueAmount,
      paymentStatus: billing.paymentStatus
    });
  } catch (error) {
    console.error('Get patient billing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check discharge status
// @route   GET /api/v1/receptionist/patient/:patientId/discharge-status
// @access  Private (Receptionist)
const getDischargeStatus = async (req, res) => {
  try {
    const { patientId } = req.params;

    const billing = await Billing.findOne({ patientId })
      .sort({ createdAt: -1 });

    const dueAmount = billing ? billing.dueAmount : 0;
    const isCleared = dueAmount <= 0;

    res.json({
      isCleared,
      dueAmount
    });
  } catch (error) {
    console.error('Get discharge status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update patient info
// @route   PUT /api/v1/receptionist/patient/:patientId
// @access  Private (Receptionist)
const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { fullName, contactInfo, emergencyContact, phone } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (fullName) patient.fullName = fullName;
    if (contactInfo) patient.contactInfo = contactInfo;
    if (emergencyContact) patient.emergencyContact = emergencyContact;
    if (phone) patient.phone = phone;

    await patient.save();

    res.json({
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all patients
// @route   GET /api/v1/receptionist/patients
// @access  Private (Receptionist)
const getAllPatients = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search && search.trim()) {
      query = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { nationalID: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const patients = await Patient.find(query)
      .select('_id nationalID fullName phone gender dateOfBirth totalVisits lastVisitDate createdAt')
      .sort({ createdAt: -1 });

    res.json(patients);
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search patient by name
// @route   GET /api/v1/receptionist/patient/search/name/:name
// @access  Private (Receptionist)
const searchPatientByName = async (req, res) => {
  try {
    const { name } = req.params;

    const patients = await Patient.find({
      fullName: { $regex: name, $options: 'i' }
    }).limit(10);

    res.json(patients);
  } catch (error) {
    console.error('Search patient by name error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search patient by phone
// @route   GET /api/v1/receptionist/patient/search/phone/:phone
// @access  Private (Receptionist)
const searchPatientByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const patients = await Patient.find({
      $or: [
        { phone: { $regex: phone, $options: 'i' } },
        { contactInfo: { $regex: phone, $options: 'i' } }
      ]
    }).limit(10);

    res.json(patients);
  } catch (error) {
    console.error('Search patient by phone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/v1/receptionist/dashboard-stats
// @access  Private (Receptionist)
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [todayCheckIns, pendingArrivals, outstandingBills, appointmentsToday] = await Promise.all([
      Visit.countDocuments({
        admissionDate: { $gte: today, $lte: endOfDay }
      }),
      Appointment.countDocuments({
        date: { $gte: today, $lte: endOfDay },
        status: 'pending'
      }),
      Billing.aggregate([
        { $match: { paymentStatus: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } }
      ]),
      Appointment.countDocuments({
        date: { $gte: today, $lte: endOfDay }
      })
    ]);

    res.json({
      todayCheckIns,
      pendingArrivals,
      outstandingBills: outstandingBills[0]?.total || 0,
      appointmentsToday
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get today's arrivals
// @route   GET /api/v1/receptionist/today-arrivals
// @access  Private (Receptionist)
const getTodayArrivals = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Only get appointments that have a registered patient (patientId exists)
    const appointments = await Appointment.find({
      date: { $gte: today, $lte: endOfDay },
      patientId: { $exists: true, $ne: null }
    })
      .populate('patientId', 'fullName')
      .sort({ time: 1 });

    // Filter out any where populate failed (patient was deleted)
    const arrivals = appointments
      .filter(apt => apt.patientId && apt.patientId._id)
      .map(apt => ({
        _id: apt._id,
        patientId: apt.patientId._id,
        patientName: apt.patientId.fullName || apt.patientName,
        time: apt.time,
        status: apt.status
      }));

    res.json(arrivals);
  } catch (error) {
    console.error('Get today arrivals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check in patient
// @route   POST /api/v1/receptionist/patient/:patientId/checkin
// @access  Private (Receptionist)
const checkInPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const visit = await Visit.create({
      patientId,
      admissionDate: new Date(),
      status: 'active',
      admittedBy: req.user._id
    });

    res.status(201).json({
      message: 'Patient checked in successfully',
      visit
    });
  } catch (error) {
    console.error('Check in patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get appointments
// @route   GET /api/v1/receptionist/appointments
// @access  Private (Receptionist)
const getAppointments = async (req, res) => {
  try {
    const { date } = req.query;

    let query = {};
    if (date) {
      // Parse date as YYYY-MM-DD and create start/end of day
      const [year, month, day] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'fullName nationalID phone')
      .populate('doctorId', 'fullName specialization')
      .sort({ date: 1, time: 1 });

    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      patientId: apt.patientId?._id,
      patientName: apt.patientId?.fullName || apt.patientName,
      nationalID: apt.patientId?.nationalID || apt.nationalID,
      phone: apt.patientId?.phone || apt.phone,
      doctorId: apt.doctorId?._id,
      doctorName: apt.doctorId?.fullName || apt.doctorName,
      department: apt.department,
      date: apt.date,
      time: apt.time,
      status: apt.status,
      notes: apt.notes
    }));

    res.json(formattedAppointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create appointment
// @route   POST /api/v1/receptionist/appointments
// @access  Private (Receptionist)
const createAppointment = async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName, department, date, time, notes } = req.body;

    // Validate required fields
    if (!patientName || !department || !date || !time) {
      return res.status(400).json({ message: 'Patient name, department, date, and time are required' });
    }

    // Parse date as YYYY-MM-DD and create local date at noon to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    const appointmentData = {
      patientName,
      department,
      date: appointmentDate,
      time,
      notes: notes || '',
      status: 'pending',
      createdBy: req.user._id
    };

    // Only add patientId if it's a valid value
    if (patientId && patientId !== '' && patientId !== 'null' && patientId !== null) {
      appointmentData.patientId = patientId;
    }

    // Only add doctorId if it's a valid value
    if (doctorId && doctorId !== '' && doctorId !== 'null' && doctorId !== null) {
      appointmentData.doctorId = doctorId;
      appointmentData.doctorName = doctorName;
    }

    const appointment = await Appointment.create(appointmentData);

    // Update patient's visit count and last visit date if patientId is provided
    if (appointmentData.patientId) {
      await Patient.findByIdAndUpdate(appointmentData.patientId, {
        $inc: { totalVisits: 1 },
        lastVisitDate: appointmentDate
      });
    }

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update appointment
// @route   PUT /api/v1/receptionist/appointments/:appointmentId
// @access  Private (Receptionist)
const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, time, status, notes } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (date) appointment.date = new Date(date);
    if (time) appointment.time = time;
    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;

    await appointment.save();

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/v1/receptionist/appointments/:appointmentId
// @access  Private (Receptionist)
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Record payment
// @route   POST /api/v1/receptionist/patient/:patientId/payment
// @access  Private (Receptionist)
const recordPayment = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { amount, paymentMethod } = req.body;

    let billing = await Billing.findOne({ patientId }).sort({ createdAt: -1 });

    if (!billing) {
      return res.status(404).json({ message: 'No billing found for this patient' });
    }

    billing.paidAmount += amount;
    billing.dueAmount = billing.totalAmount - billing.paidAmount;

    if (billing.dueAmount <= 0) {
      billing.paymentStatus = 'paid';
    } else {
      billing.paymentStatus = 'partial';
    }

    billing.paymentHistory.push({
      amount,
      paymentMethod,
      paidAt: new Date(),
      receivedBy: req.user._id
    });

    await billing.save();

    res.json({
      message: 'Payment recorded successfully',
      billing
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get payment history
// @route   GET /api/v1/receptionist/patient/:patientId/payment-history
// @access  Private (Receptionist)
const getPaymentHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const billings = await Billing.find({ patientId })
      .sort({ createdAt: -1 });

    const paymentHistory = billings.flatMap(b =>
      (b.paymentHistory || []).map(p => ({
        ...p.toObject(),
        billingId: b._id
      }))
    );

    res.json(paymentHistory);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get doctors (optionally filtered by department/specialization)
// @route   GET /api/v1/receptionist/doctors
// @access  Private (Receptionist)
const getDoctors = async (req, res) => {
  try {
    const { department } = req.query;

    const query = { role: 'doctor', isActive: true };

    // Filter by specialization or department (doctors use specialization)
    if (department && department !== 'Other') {
      query.$or = [
        { specialization: { $regex: department, $options: 'i' } },
        { department: { $regex: department, $options: 'i' } }
      ];
    }

    const doctors = await User.find(query)
      .select('_id fullName department specialization shift shiftStartTime shiftEndTime')
      .sort({ fullName: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerPatient,
  getPatient,
  getAllPatients,
  searchPatientByNationalID,
  searchPatientByName,
  searchPatientByPhone,
  getPatientVisits,
  getPatientBilling,
  getDischargeStatus,
  updatePatient,
  getDashboardStats,
  getTodayArrivals,
  checkInPatient,
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  recordPayment,
  getPaymentHistory,
  getDoctors
};
