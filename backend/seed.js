const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Patient = require('./models/Patient');
const Billing = require('./models/Billing');
const Appointment = require('./models/Appointment');
const Visit = require('./models/Visit');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Patient.deleteMany({});
    await Billing.deleteMany({});
    await Appointment.deleteMany({});
    await Visit.deleteMany({});

    console.log('Cleared existing data');

    const doctor1 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC001',
      password: 'password123',
      fullName: 'Doctor 1',
      specialization: 'Cardiology',
      department: 'Cardiology',
      shift: 'morning',
      phone: '+201012345601',
      isActive: true
    });

    const doctor2 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC002',
      password: 'password123',
      fullName: 'Doctor 2',
      specialization: 'General Medicine',
      department: 'General Medicine',
      shift: 'afternoon',
      phone: '+201012345602',
      isActive: true
    });

    const doctor3 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC003',
      password: 'password123',
      fullName: 'Doctor 3',
      specialization: 'Neurology',
      department: 'Neurology',
      shift: 'morning',
      phone: '+201012345605',
      isActive: true
    });

    const doctor4 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC004',
      password: 'password123',
      fullName: 'Doctor 4',
      specialization: 'Pediatrics',
      department: 'Pediatrics',
      shift: 'afternoon',
      phone: '+201012345606',
      isActive: true
    });

    const doctor5 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC005',
      password: 'password123',
      fullName: 'Doctor 5',
      specialization: 'Orthopedics',
      department: 'Orthopedics',
      shift: 'night',
      phone: '+201012345607',
      isActive: true
    });

    const doctor6 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC006',
      password: 'password123',
      fullName: 'Doctor 6',
      specialization: 'Dermatology',
      department: 'Dermatology',
      shift: 'morning',
      phone: '+201012345608',
      isActive: true
    });

    const doctor7 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC007',
      password: 'password123',
      fullName: 'Doctor 7',
      specialization: 'Emergency Medicine',
      department: 'Emergency',
      shift: 'morning',
      phone: '+201012345609',
      isActive: true
    });

    const doctor8 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC008',
      password: 'password123',
      fullName: 'Doctor 8',
      specialization: 'Emergency Medicine',
      department: 'Emergency',
      shift: 'afternoon',
      phone: '+201012345610',
      isActive: true
    });

    const doctor9 = await User.create({
      role: 'doctor',
      hospitalId: 'HOSP001',
      identifier: 'DOC009',
      password: 'password123',
      fullName: 'Doctor 9',
      specialization: 'Emergency Medicine',
      department: 'Emergency',
      shift: 'night',
      phone: '+201012345611',
      isActive: true
    });

    const nurse1 = await User.create({
      role: 'nurse',
      hospitalId: 'HOSP001',
      identifier: 'NUR001',
      password: 'password123',
      fullName: 'Nurse 1',
      shift: 'morning',
      phone: '+201012345603',
      isActive: true,
      isLoggedIn: true
    });

    const nurse2 = await User.create({
      role: 'nurse',
      hospitalId: 'HOSP001',
      identifier: 'NUR002',
      password: 'password123',
      fullName: 'Nurse 2',
      shift: 'afternoon',
      phone: '+201012345604',
      isActive: true,
      isLoggedIn: true
    });

    const nurse3 = await User.create({
      role: 'nurse',
      hospitalId: 'HOSP001',
      identifier: 'NUR003',
      password: 'password123',
      fullName: 'Nurse 3',
      shift: 'night',
      isActive: true,
      isLoggedIn: false
    });

    const receptionist = await User.create({
      role: 'receptionist',
      hospitalId: 'HOSP001',
      identifier: 'REC001',
      password: 'password123',
      fullName: 'Receptionist 1',
      isActive: true,
      phone: '01067731212',
      email: 'receptionist@gmail.com'
    });

    const patient1 = await Patient.create({
      nationalID: '29901011234567',
      fullName: 'Patient 1',
      dateOfBirth: new Date('1999-01-01'),
      gender: 'male',
      contactInfo: 'Cairo, Egypt',
      phone: '01098765432',
      email: 'Patient.1@email.com',
      address: '15 Tahrir Street, Cairo, Egypt',
      emergencyContact: '01012345678',
      emergencyContactName: 'Ahmed Ibrahim',
      emergencyContactPhone: '01012345678',
      emergencyContactRelation: 'Brother',
      registeredByReceptionistId: receptionist._id,
      totalVisits: 1,
      lastVisitDate: new Date('2026-01-15')
    });

    const patient2 = await Patient.create({
      nationalID: '29512312345678',
      fullName: 'Patient 2',
      dateOfBirth: new Date('1995-12-31'),
      gender: 'female',
      contactInfo: 'Alexandria, Egypt',
      phone: '01198765432',
      email: 'Patient.2@email.com',
      address: '23 Corniche Road, Alexandria, Egypt',
      emergencyContact: '01123456789',
      emergencyContactName: 'Fatma Mahmoud',
      emergencyContactPhone: '01123456789',
      emergencyContactRelation: 'Mother',
      registeredByReceptionistId: receptionist._id,
      totalVisits: 1,
      lastVisitDate: new Date('2026-01-20')
    });

    const patient3 = await Patient.create({
      nationalID: '28803051234569',
      fullName: 'Patient 3',
      dateOfBirth: new Date('1988-03-05'),
      gender: 'male',
      contactInfo: 'Giza, Egypt',
      phone: '01234567890',
      email: 'Patient.3@email.com',
      address: '8 Pyramids Street, Giza, Egypt',
      emergencyContact: '01298765432',
      emergencyContactName: 'Sara Youssef',
      emergencyContactPhone: '01298765432',
      emergencyContactRelation: 'Wife',
      registeredByReceptionistId: receptionist._id,
      totalVisits: 1,
      lastVisitDate: new Date()
    });

    const patientUser1 = await User.create({
      role: 'patient',
      identifier: patient1.nationalID,
      fullName: patient1.fullName,
      phone: patient1.phone
    });
    patient1.userId = patientUser1._id;
    await patient1.save();

    const patientUser2 = await User.create({
      role: 'patient',
      identifier: patient2.nationalID,
      fullName: patient2.fullName,
      phone: patient2.phone
    });
    patient2.userId = patientUser2._id;
    await patient2.save();

    await Billing.create({
      patientId: patient1._id,
      totalAmount: 5000,
      paidAmount: 3000,
      dueAmount: 2000,
      items: [
        { description: 'Consultation', amount: 500 },
        { description: 'Lab Tests', amount: 1500 },
        { description: 'Medication', amount: 3000 }
      ]
    });

    await Billing.create({
      patientId: patient2._id,
      totalAmount: 2000,
      paidAmount: 2000,
      dueAmount: 0,
      paymentStatus: 'paid',
      items: [
        { description: 'Consultation', amount: 500 },
        { description: 'X-Ray', amount: 1500 }
      ]
    });

    // Appointments: receptionist assigns patients to doctors so they appear in doctor UI
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    await Appointment.create({
      patientId: patient1._id,
      patientName: patient1.fullName,
      doctorId: doctor1._id,
      doctorName: doctor1.fullName,
      department: 'Cardiology',
      date: tomorrow,
      time: '09:00 AM',
      status: 'pending',
      createdBy: receptionist._id
    });
    await Appointment.create({
      patientId: patient2._id,
      patientName: patient2.fullName,
      doctorId: doctor1._id,
      doctorName: doctor1.fullName,
      department: 'Cardiology',
      date: tomorrow,
      time: '10:30 AM',
      status: 'pending',
      createdBy: receptionist._id
    });
    await Appointment.create({
      patientId: patient3._id,
      patientName: patient3.fullName,
      doctorId: doctor2._id,
      doctorName: doctor2.fullName,
      department: 'General Medicine',
      date: tomorrow,
      time: '02:00 PM',
      status: 'pending',
      createdBy: receptionist._id
    });

    console.log('\n========================================');
    console.log('Seed data created successfully!');
    console.log('========================================\n');

    console.log('TEST CREDENTIALS:');
    console.log('----------------------------------------');
    console.log('Doctors:');
    console.log('  DOC001 - Doctor 1 (Cardiology, Morning)');
    console.log('  DOC002 - Doctor 2 (General Medicine, Afternoon)');
    console.log('  DOC003 - Doctor 3 (Neurology, Morning)');
    console.log('  DOC004 - Doctor 4 (Pediatrics, Afternoon)');
    console.log('  DOC005 - Doctor 5 (Orthopedics, Night)');
    console.log('  DOC006 - Doctor 6 (Dermatology, Morning)');
    console.log('  DOC007 - Doctor 7 (Emergency, Morning)');
    console.log('  DOC008 - Doctor 8 (Emergency, Afternoon)');
    console.log('  DOC009 - Doctor 9 (Emergency, Night)');
    console.log('  Password: password123');
    console.log('  Role: doctor');
    console.log('----------------------------------------');
    console.log('Nurse:');
    console.log('  Identifier: NUR001');
    console.log('  Password: password123');
    console.log('  Role: nurse');
    console.log('----------------------------------------');
    console.log('Receptionist:');
    console.log('  Identifier: REC001');
    console.log('  Password: password123');
    console.log('  Role: receptionist');
    console.log('  Email: receptionist@gmail.com');
    console.log('  Phone: 01067731212');
    console.log('----------------------------------------');
    console.log('Patient (OTP Login):');
    console.log('  National ID: 29901011234567');
    console.log('  Phone: 01098765432');
    console.log('  (Request OTP, check console for code)');
    console.log('----------------------------------------\n');

    console.log('PATIENT IDs (for testing):');
    console.log(`  Patient 1: ${patient1._id}`);
    console.log(`  Patient 2: ${patient2._id}`);
    console.log(`  Patient 3: ${patient3._id}`);
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
