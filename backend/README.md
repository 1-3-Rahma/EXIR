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
AI_SERVICE_URL=http://localhost:8000
```

### Run the Server

Start the AI service first:

```bash
cd ai-service
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then start the backend:

```bash
cd backend
npm install

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

## AI Vitals Flow

Vitals sent to `POST /api/v1/vitals/receive` are forwarded to the FastAPI AI service at `AI_SERVICE_URL`. The backend saves the raw vital reading, stores the AI prediction fields on the `Vital` document, and creates notifications only from the AI result:

- `Normal`: save reading only
- `warning` alert level or `Abnormal` predicted label: create warning notifications
- `critical` alert level or `Critical` predicted label: create critical notifications

The legacy `utils/criticalDetection.js` file is still present but is not used as the main notification logic.

### AI Artifact Layout

Place the Python model package files here:

```text
ai-service/artifacts/backend/health_alert_engine.py
ai-service/artifacts/model/xgb_risk_model.joblib
ai-service/artifacts/preprocessing/features.json
ai-service/artifacts/preprocessing/label_mapping.json
ai-service/artifacts/config/alert_config.json
```

### Postman Examples

Normal:

```http
POST http://localhost:5000/api/v1/vitals/receive
Content-Type: application/json

{
  "patientId": "PUT_REAL_PATIENT_ID_HERE",
  "heartRate": 78,
  "spo2": 98,
  "temperature": 36.8,
  "source": "sensor-simulator"
}
```

Abnormal:

```http
POST http://localhost:5000/api/v1/vitals/receive
Content-Type: application/json

{
  "patientId": "PUT_REAL_PATIENT_ID_HERE",
  "heartRate": 120,
  "spo2": 90,
  "temperature": 38.5,
  "source": "sensor-simulator"
}
```

Critical:

```http
POST http://localhost:5000/api/v1/vitals/receive
Content-Type: application/json

{
  "patientId": "PUT_REAL_PATIENT_ID_HERE",
  "heartRate": 145,
  "spo2": 84,
  "temperature": 40.2,
  "source": "sensor-simulator"
}
```

## Legacy Critical Event Detection

This section describes the old threshold utility that remains in `utils/criticalDetection.js` for reference only. AI predictions are now the main notification source.

The old utility checked these fixed threshold conditions:
- Heart Rate: < 50 or > 120 bpm
- SpO2: < 90%
- Temperature: < 35°C or > 39°C

That old flow has been replaced for sensor ingestion by the AI service flow above.
