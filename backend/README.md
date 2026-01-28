# EXIR Healthcare Backend API

Smart Healthcare Monitoring System - Backend API built with Node.js, Express, and MongoDB.

## Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create `.env` file (already created with defaults):
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/exir_healthcare
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=24h
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Run the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Seed Test Data

```bash
node seed.js
```

## Test Credentials

After running `node seed.js`:

| Role | Identifier | Password |
|------|------------|----------|
| Doctor | DOC001 | password123 |
| Nurse | NUR001 | password123 |
| Receptionist | REC001 | password123 |
| Patient | 29901011234567 (National ID) | OTP via console |

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/login` - Login (doctor, nurse, receptionist)
- `POST /auth/logout` - Logout
- `POST /auth/request-otp` - Request OTP (patient)
- `POST /auth/verify-otp` - Verify OTP and login (patient)
- `GET /auth/me` - Get current user

### Doctor
- `GET /doctor/nurses-on-shift` - Get available nurses
- `POST /doctor/assign-patient` - Assign patient to nurse
- `PUT /doctor/update-treatment` - Update treatment plan
- `POST /doctor/close-case` - Close patient case
- `GET /doctor/patients` - Get all patients under care

### Nurse
- `GET /nurse/assigned-patients` - Get assigned patients
- `GET /nurse/critical-events` - Get critical alerts
- `GET /nurse/patient/:patientId/vitals` - Get patient vitals
- `GET /nurse/vitals-overview` - Get vitals overview

### Patient
- `GET /patient/vitals` - Get own vitals
- `GET /patient/medical-history` - Get medical history
- `GET /patient/billing` - Get billing summary
- `GET /patient/download-records` - Get medical records

### Receptionist
- `POST /receptionist/register-patient` - Register patient
- `GET /receptionist/patient/:patientId` - Get patient profile
- `GET /receptionist/patient/:patientId/visits` - Get visit history
- `GET /receptionist/patient/:patientId/billing` - Get billing
- `GET /receptionist/patient/:patientId/discharge-status` - Check discharge

### Vitals (Sensor)
- `POST /vitals/receive` - Receive sensor data (public)
- `GET /vitals/patient/:patientId` - Get patient vitals

### Notifications
- `GET /notifications` - Get notifications
- `PUT /notifications/read` - Mark as read

### Visits
- `POST /visits/start` - Start hospital visit
- `PUT /visits/:visitId/end` - End visit

### Medical Records
- `POST /medical-records/upload` - Upload file
- `GET /medical-records/patient/:patientId` - Get records
- `GET /files/:recordId` - Download file

## Project Structure

```
backend/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── doctorController.js
│   ├── nurseController.js
│   ├── patientController.js
│   ├── receptionistController.js
│   ├── vitalsController.js
│   ├── notificationController.js
│   ├── visitController.js
│   └── medicalRecordController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── errorMiddleware.js
│   └── uploadMiddleware.js
├── models/
│   ├── User.js
│   ├── Patient.js
│   ├── Vital.js
│   ├── Assignment.js
│   ├── Notification.js
│   ├── Case.js
│   ├── Visit.js
│   ├── MedicalRecord.js
│   └── Billing.js
├── routes/
│   └── [all route files]
├── utils/
│   ├── generateToken.js
│   ├── generateOTP.js
│   └── criticalDetection.js
├── uploads/
├── .env
├── package.json
├── seed.js
└── server.js
```

## Critical Event Detection

Vitals are automatically checked for critical conditions:
- Heart Rate: < 50 or > 120 bpm
- SpO2: < 90%
- Temperature: < 35°C or > 39°C

When critical vitals are detected:
1. Vital is marked as `isCritical: true`
2. Notifications sent to assigned nurse and doctor
3. Alert appears in nurse's critical events
