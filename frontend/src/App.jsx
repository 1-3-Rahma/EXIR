import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import NurseDashboard from './pages/nurse/NurseDashboard';
import NursePatients from './pages/nurse/NursePatients';
import NurseVitals from './pages/nurse/NurseVitals';
import NurseCriticalEvents from './pages/nurse/NurseCriticalEvents';
import NurseMedications from './pages/nurse/NurseMedications';
import NurseTasks from './pages/nurse/NurseTasks';
import NurseMessages from './pages/nurse/NurseMessages';
import NurseProfile from './pages/nurse/NurseProfile';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorNurses from './pages/doctor/DoctorNurses';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorPriorityCases from './pages/doctor/DoctorPriorityCases';
import DoctorMessages from './pages/doctor/DoctorMessages';
import DoctorTasks from './pages/doctor/DoctorTasks';
import DoctorProfile from './pages/doctor/DoctorProfile';

import PatientDashboard from './pages/patient/PatientDashboard';
import PatientHistory from './pages/patient/PatientHistory';
import PatientRecords from './pages/patient/PatientRecords';
import PatientMedications from './pages/patient/PatientMedications';

import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistPatients from './pages/receptionist/ReceptionistPatients';
import ReceptionistBilling from './pages/receptionist/ReceptionistBilling';
import ReceptionistVisits from './pages/receptionist/ReceptionistVisits';

import PrivateRoute from './components/common/PrivateRoute';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const getDefaultRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'nurse': return '/nurse';
      case 'doctor': return '/doctor';
      case 'patient': return '/patient';
      case 'receptionist': return '/receptionist';
      default: return '/login';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />

      {/* Nurse Routes */}
      <Route path="/nurse" element={<PrivateRoute allowedRoles={['nurse']}><NurseDashboard /></PrivateRoute>} />
      <Route path="/nurse/patients" element={<PrivateRoute allowedRoles={['nurse']}><NursePatients /></PrivateRoute>} />
      <Route path="/nurse/vitals" element={<PrivateRoute allowedRoles={['nurse']}><NurseVitals /></PrivateRoute>} />
      <Route path="/nurse/critical" element={<PrivateRoute allowedRoles={['nurse']}><NurseCriticalEvents /></PrivateRoute>} />
      <Route path="/nurse/medications" element={<PrivateRoute allowedRoles={['nurse']}><NurseMedications /></PrivateRoute>} />
      <Route path="/nurse/tasks" element={<PrivateRoute allowedRoles={['nurse']}><NurseTasks /></PrivateRoute>} />
      <Route path="/nurse/messages" element={<PrivateRoute allowedRoles={['nurse']}><NurseMessages /></PrivateRoute>} />
      <Route path="/nurse/profile" element={<PrivateRoute allowedRoles={['nurse']}><NurseProfile /></PrivateRoute>} />

      {/* Doctor Routes */}
      <Route path="/doctor" element={<PrivateRoute allowedRoles={['doctor']}><DoctorDashboard /></PrivateRoute>} />
      <Route path="/doctor/nurses" element={<PrivateRoute allowedRoles={['doctor']}><DoctorNurses /></PrivateRoute>} />
      <Route path="/doctor/patients" element={<PrivateRoute allowedRoles={['doctor']}><DoctorPatients /></PrivateRoute>} />
      <Route path="/doctor/priority-cases" element={<PrivateRoute allowedRoles={['doctor']}><DoctorPriorityCases /></PrivateRoute>} />
      <Route path="/doctor/messages" element={<PrivateRoute allowedRoles={['doctor']}><DoctorMessages /></PrivateRoute>} />
      <Route path="/doctor/tasks" element={<PrivateRoute allowedRoles={['doctor']}><DoctorTasks /></PrivateRoute>} />
      <Route path="/doctor/profile" element={<PrivateRoute allowedRoles={['doctor']}><DoctorProfile /></PrivateRoute>} />

      {/* Patient Routes */}
      <Route path="/patient" element={<PrivateRoute allowedRoles={['patient']}><PatientDashboard /></PrivateRoute>} />
      <Route path="/patient/history" element={<PrivateRoute allowedRoles={['patient']}><PatientHistory /></PrivateRoute>} />
      <Route path="/patient/records" element={<PrivateRoute allowedRoles={['patient']}><PatientRecords /></PrivateRoute>} />
      <Route path="/patient/medications" element={<PrivateRoute allowedRoles={['patient']}><PatientMedications /></PrivateRoute>} />

      {/* Receptionist Routes */}
      <Route path="/receptionist" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistDashboard /></PrivateRoute>} />
      <Route path="/receptionist/patients" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistPatients /></PrivateRoute>} />
      <Route path="/receptionist/billing" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistBilling /></PrivateRoute>} />
      <Route path="/receptionist/visits" element={<PrivateRoute allowedRoles={['receptionist']}><ReceptionistVisits /></PrivateRoute>} />

      {/* Root always opens login; /login redirects to dashboard if already logged in */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default App;
