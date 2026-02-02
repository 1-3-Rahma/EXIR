const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Billing = require('../models/Billing');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const path = require('path');
const fs = require('fs');

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
      registeredByReceptionistId: req.user._id,
      totalVisits: 1
    });

    // Automatically create an active visit (check-in) for new patient
    await Visit.create({
      patientId: patient._id,
      hospitalId: patient.nationalID,
      admissionDate: new Date(),
      status: 'admitted',
      registeredBy: req.user._id
    });

    res.status(201).json({
      message: 'Patient registered and checked in successfully',
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

    // Return all patient fields including documents
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
      createdAt: patient.createdAt,
      documents: {
        nationalID: patient.documents?.nationalID || null,
        insuranceCard: patient.documents?.insuranceCard || null
      }
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
      _id: v._id,
      visitId: v._id,
      startTime: v.admissionDate,
      endTime: v.dischargeDate,
      admissionDate: v.admissionDate,
      dischargeDate: v.dischargeDate,
      status: v.status === 'admitted' ? 'active' : 'completed'
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

    // Get all active visits to check which patients have active visits
    const activeVisits = await Visit.find({ status: 'admitted' }).select('patientId');
    const activePatientIds = new Set(activeVisits.map(v => v.patientId.toString()));

    // Add hasActiveVisit flag to each patient
    const patientsWithVisitStatus = patients.map(patient => ({
      ...patient.toObject(),
      hasActiveVisit: activePatientIds.has(patient._id.toString())
    }));

    res.json(patientsWithVisitStatus);
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

// @desc    Get today's arrivals (patients registered today)
// @route   GET /api/v1/receptionist/today-arrivals
// @access  Private (Receptionist)
const getTodayArrivals = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Get patients registered today (based on createdAt field)
    const patients = await Patient.find({
      createdAt: { $gte: today, $lte: endOfDay }
    })
      .select('_id fullName nationalID phone createdAt')
      .sort({ createdAt: -1 });

    const arrivals = patients.map(patient => ({
      _id: patient._id,
      patientId: patient._id,
      patientName: patient.fullName,
      nationalID: patient.nationalID,
      phone: patient.phone,
      registrationTime: patient.createdAt,
      status: 'registered'
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

    // Check if patient already has an active visit
    const existingVisit = await Visit.findOne({ patientId, status: 'admitted' });
    if (existingVisit) {
      return res.status(400).json({ message: 'Patient already has an active visit' });
    }

    const visit = await Visit.create({
      patientId,
      hospitalId: req.user.hospitalId || 'HOSP001',
      admissionDate: new Date(),
      status: 'admitted',
      registeredBy: req.user._id
    });

    // Increment total visits count
    await Patient.findByIdAndUpdate(patientId, {
      $inc: { totalVisits: 1 },
      lastVisitDate: new Date()
    });

    res.status(201).json({
      message: 'Patient checked in successfully',
      visit: {
        ...visit.toObject(),
        status: 'active',
        startTime: visit.admissionDate
      }
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

// @desc    Get all patients with billing summary
// @route   GET /api/v1/receptionist/billing/patients
// @access  Private (Receptionist)
const getPatientsWithBilling = async (req, res) => {
  try {
    const { search } = req.query;

    let patientQuery = {};
    if (search && search.trim()) {
      patientQuery = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { nationalID: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const patients = await Patient.find(patientQuery)
      .select('_id nationalID fullName phone')
      .sort({ fullName: 1 });

    // Get billing summary for each patient
    const patientsWithBilling = await Promise.all(
      patients.map(async (patient) => {
        const billings = await Billing.find({ patientId: patient._id });
        const totalAmount = billings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const paidAmount = billings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const dueAmount = totalAmount - paidAmount;

        // Check if patient has active visit (not discharged)
        const activeVisit = await Visit.findOne({
          patientId: patient._id,
          status: 'admitted'
        });

        return {
          _id: patient._id,
          nationalID: patient.nationalID,
          fullName: patient.fullName,
          phone: patient.phone,
          totalAmount,
          paidAmount,
          dueAmount,
          paymentStatus: dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
          hasActiveVisit: !!activeVisit,
          canCheckout: dueAmount <= 0 && !!activeVisit
        };
      })
    );

    res.json(patientsWithBilling);
  } catch (error) {
    console.error('Get patients with billing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient billing details by visits
// @route   GET /api/v1/receptionist/billing/patient/:patientId
// @access  Private (Receptionist)
const getPatientBillingDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Get all billings for this patient
    const billings = await Billing.find({ patientId })
      .populate('visitId')
      .sort({ createdAt: -1 });

    // Get all visits for this patient
    const visits = await Visit.find({ patientId })
      .sort({ admissionDate: -1 });

    // Calculate totals
    const totalAmount = billings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidAmount = billings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const dueAmount = totalAmount - paidAmount;

    // Check for active visit
    const activeVisit = visits.find(v => v.status === 'admitted');

    // Format billing records
    const billingRecords = billings.map(b => ({
      _id: b._id,
      visitId: b.visitId?._id,
      visitDate: b.visitId?.admissionDate || b.createdAt,
      visitStatus: b.visitId?.status || 'unknown',
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount,
      dueAmount: b.dueAmount,
      paymentStatus: b.paymentStatus,
      items: b.items,
      paymentHistory: b.paymentHistory,
      createdAt: b.createdAt
    }));

    res.json({
      patient: {
        _id: patient._id,
        nationalID: patient.nationalID,
        fullName: patient.fullName,
        phone: patient.phone
      },
      summary: {
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus: dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'
      },
      hasActiveVisit: !!activeVisit,
      activeVisitId: activeVisit?._id,
      canCheckout: dueAmount <= 0 && !!activeVisit,
      billingRecords,
      visits: visits.map(v => ({
        _id: v._id,
        startTime: v.admissionDate,
        endTime: v.dischargeDate,
        admissionDate: v.admissionDate,
        dischargeDate: v.dischargeDate,
        status: v.status === 'admitted' ? 'active' : 'completed'
      }))
    });
  } catch (error) {
    console.error('Get patient billing details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Checkout patient (discharge)
// @route   POST /api/v1/receptionist/billing/checkout/:patientId
// @access  Private (Receptionist)
const checkoutPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Find active visit
    const activeVisit = await Visit.findOne({
      patientId,
      status: 'admitted'
    });

    if (!activeVisit) {
      return res.status(400).json({ message: 'No active visit found for this patient' });
    }

    // Check if all bills are paid
    const billings = await Billing.find({ patientId });
    const totalDue = billings.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

    if (totalDue > 0) {
      return res.status(400).json({
        message: 'Cannot checkout. Patient has outstanding balance of $' + totalDue.toLocaleString(),
        dueAmount: totalDue
      });
    }

    // Discharge the patient
    activeVisit.status = 'discharged';
    activeVisit.dischargeDate = new Date();
    await activeVisit.save();

    // Update patient's last visit date
    await Patient.findByIdAndUpdate(patientId, {
      lastVisitDate: new Date()
    });

    res.json({
      message: 'Patient checked out successfully',
      visit: {
        ...activeVisit.toObject(),
        status: 'completed',
        startTime: activeVisit.admissionDate,
        endTime: activeVisit.dischargeDate
      }
    });
  } catch (error) {
    console.error('Checkout patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Process payment for billing
// @route   POST /api/v1/receptionist/billing/:billingId/pay
// @access  Private (Receptionist)
const processBillingPayment = async (req, res) => {
  try {
    const { billingId } = req.params;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const billing = await Billing.findById(billingId);
    if (!billing) {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    if (amount > billing.dueAmount) {
      return res.status(400).json({
        message: 'Payment amount exceeds due amount',
        dueAmount: billing.dueAmount
      });
    }

    billing.paidAmount += amount;
    billing.paymentHistory.push({
      amount,
      paymentMethod: paymentMethod || 'cash',
      paidAt: new Date(),
      receivedBy: req.user._id
    });

    await billing.save();

    res.json({
      message: 'Payment processed successfully',
      billing: {
        _id: billing._id,
        totalAmount: billing.totalAmount,
        paidAmount: billing.paidAmount,
        dueAmount: billing.dueAmount,
        paymentStatus: billing.paymentStatus
      }
    });
  } catch (error) {
    console.error('Process billing payment error:', error);
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

// @desc    Upload patient document (nationalID or insuranceCard)
// @route   POST /api/v1/receptionist/patient/:patientId/document
// @access  Private (Receptionist)
const uploadPatientDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!documentType || !['nationalID', 'insuranceCard'].includes(documentType)) {
      // Delete the uploaded file if document type is invalid
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Invalid document type. Must be nationalID or insuranceCard' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      // Delete the uploaded file if patient not found
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Delete old file if exists
    if (patient.documents && patient.documents[documentType] && patient.documents[documentType].filename) {
      const oldFilePath = path.join(process.env.UPLOAD_PATH || './uploads', 'documents', patient.documents[documentType].filename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update patient document info
    if (!patient.documents) {
      patient.documents = {};
    }

    patient.documents[documentType] = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    await patient.save();

    res.json({
      message: `${documentType === 'nationalID' ? 'National ID' : 'Insurance Card'} uploaded successfully`,
      document: patient.documents[documentType]
    });
  } catch (error) {
    console.error('Upload document error:', error);
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get patient documents
// @route   GET /api/v1/receptionist/patient/:patientId/documents
// @access  Private (Receptionist)
const getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId).select('_id fullName nationalID documents');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      patientId: patient._id,
      patientName: patient.fullName,
      nationalIDNumber: patient.nationalID,
      documents: {
        nationalID: patient.documents?.nationalID || null,
        insuranceCard: patient.documents?.insuranceCard || null
      }
    });
  } catch (error) {
    console.error('Get patient documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download patient document
// @route   GET /api/v1/receptionist/patient/:patientId/document/:documentType
// @access  Private (Receptionist)
const downloadPatientDocument = async (req, res) => {
  try {
    const { patientId, documentType } = req.params;

    if (!['nationalID', 'insuranceCard'].includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const document = patient.documents?.[documentType];
    if (!document || !document.filename) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'documents', document.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete patient document
// @route   DELETE /api/v1/receptionist/patient/:patientId/document/:documentType
// @access  Private (Receptionist)
const deletePatientDocument = async (req, res) => {
  try {
    const { patientId, documentType } = req.params;

    if (!['nationalID', 'insuranceCard'].includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // National ID is required, don't allow deletion
    if (documentType === 'nationalID') {
      return res.status(400).json({ message: 'National ID document cannot be deleted. It can only be replaced.' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const document = patient.documents?.[documentType];
    if (!document || !document.filename) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from disk
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'documents', document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from patient record
    patient.documents[documentType] = null;
    await patient.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all patients with document status
// @route   GET /api/v1/receptionist/documents/patients
// @access  Private (Receptionist)
const getAllPatientsWithDocuments = async (req, res) => {
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
      .select('_id nationalID fullName phone documents createdAt')
      .sort({ createdAt: -1 });

    const patientsWithDocStatus = patients.map(patient => ({
      _id: patient._id,
      nationalID: patient.nationalID,
      fullName: patient.fullName,
      phone: patient.phone,
      hasNationalID: !!(patient.documents?.nationalID?.filename),
      hasInsuranceCard: !!(patient.documents?.insuranceCard?.filename),
      createdAt: patient.createdAt
    }));

    res.json(patientsWithDocStatus);
  } catch (error) {
    console.error('Get all patients with documents error:', error);
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
  getDoctors,
  getPatientsWithBilling,
  getPatientBillingDetails,
  checkoutPatient,
  processBillingPayment,
  uploadPatientDocument,
  getPatientDocuments,
  downloadPatientDocument,
  deletePatientDocument,
  getAllPatientsWithDocuments
};
