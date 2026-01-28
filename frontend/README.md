# EXIR Healthcare Frontend

React-based frontend for the EXIR Smart Healthcare Monitoring System.

## Quick Start

### Prerequisites
- Node.js (v16+)
- Backend server running on port 5000

### Installation

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000`

## Features

### Login
- Staff login (Doctor, Nurse, Receptionist) with ID + Password
- Patient login with National ID + Phone + OTP

### Role-Based Dashboards

**Nurse Dashboard (NurseHub)**
- View assigned patients
- Monitor vitals in real-time
- Respond to critical alerts
- Manage tasks

**Doctor Dashboard (Doctor's Hospital)**
- View nurses on shift
- Assign patients to nurses
- Update treatment plans
- Close patient cases
- Quick notes

**Patient Dashboard (Patient View)**
- View upcoming appointments
- Check medication schedule
- Access medical records
- Download documents

**Receptionist Dashboard (MedHub)**
- Register new patients
- Search patients (by name, phone, National ID)
- View/manage billing
- Track visits

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Layout.jsx
│   │       ├── Sidebar.jsx
│   │       ├── StatCard.jsx
│   │       ├── PrivateRoute.jsx
│   │       └── NotificationPanel.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── nurse/
│   │   ├── doctor/
│   │   ├── patient/
│   │   └── receptionist/
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   └── index.js
├── .env
└── package.json
```

## Test Credentials

After running backend seed:

| Role | Identifier | Password |
|------|------------|----------|
| Doctor | DOC001 | password123 |
| Nurse | NUR001 | password123 |
| Receptionist | REC001 | password123 |
| Patient | 29901011234567 | OTP (check backend console) |

## Routes

| Path | Role | Description |
|------|------|-------------|
| /login | Public | Login page |
| /nurse | Nurse | Nurse dashboard |
| /nurse/patients | Nurse | Assigned patients |
| /nurse/vitals | Nurse | Vitals monitoring |
| /nurse/critical | Nurse | Priority alerts |
| /doctor | Doctor | Doctor dashboard |
| /doctor/nurses | Doctor | Nurses on shift |
| /doctor/patients | Doctor | Patient management |
| /doctor/priority-cases | Doctor | Critical cases |
| /patient | Patient | Patient dashboard |
| /patient/history | Patient | Medical history |
| /patient/records | Patient | Medical records |
| /patient/medications | Patient | Medications |
| /receptionist | Receptionist | Reception dashboard |
| /receptionist/patients | Receptionist | Patient management |
| /receptionist/billing | Receptionist | Billing |
| /receptionist/visits | Receptionist | Visit history |

## Design Matching

The UI follows the provided Figma designs:
- Dark blue sidebar (#1e3a5f)
- White content area
- Card-based layouts
- Stat cards with colored icons
- Alert/notification panels
