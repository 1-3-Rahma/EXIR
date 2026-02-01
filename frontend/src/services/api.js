import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const nurseAPI = {
  getAssignedPatients: () => api.get('/nurse/assigned-patients'),
  getCriticalEvents: () => api.get('/nurse/critical-events'),
  getUrgentCases: () => api.get('/nurse/urgent-cases'),
  getPatientVitals: (patientId) => api.get(`/nurse/patient/${patientId}/vitals`),
  getVitalsOverview: () => api.get('/nurse/vitals-overview'),
  updateVitals: (patientId, data) => api.put(`/nurse/patient/${patientId}/vitals`, data)
};

export const doctorAPI = {
  getNursingStaff: () => api.get('/doctor/nursing-staff'),
  getNursesOnShift: () => api.get('/doctor/nurses-on-shift'),
  assignPatient: (data) => api.post('/doctor/assign-patient', data),
  updateTreatment: (data) => api.put('/doctor/update-treatment', data),
  closeCase: (data) => api.post('/doctor/close-case', data),
  getPatients: (search) => api.get('/doctor/patients', { params: search ? { search } : {} }),
  getCriticalCases: () => api.get('/doctor/critical-cases'),
  setPatientStatus: (data) => api.put('/doctor/patient-status', data),
  addPrescription: (data) => api.post('/doctor/prescription', data),
  addIvOrder: (data) => api.post('/doctor/iv-order', data),
  getPatientVitals: (patientId) => api.get(`/vitals/patient/${patientId}`)
};

export const tasksAPI = {
  getTasks: () => api.get('/tasks'),
  getTodayTasks: () => api.get('/tasks/today'),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (taskId, data) => api.put(`/tasks/${taskId}`, data),
  completeTask: (taskId) => api.patch(`/tasks/${taskId}/complete`),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`)
};

export const patientAPI = {
  getVitals: () => api.get('/patient/vitals'),
  getMedicalHistory: () => api.get('/patient/medical-history'),
  getBilling: () => api.get('/patient/billing'),
  downloadRecords: () => api.get('/patient/download-records')
};

export const receptionistAPI = {
  registerPatient: (data) => api.post('/receptionist/register-patient', data),
  getPatient: (patientId) => api.get(`/receptionist/patient/${patientId}`),
  getAllPatients: (search) => api.get('/receptionist/patients', { params: search ? { search } : {} }),
  searchPatient: (nationalID) => api.get(`/receptionist/patient/search/${nationalID}`),
  searchByName: (name) => api.get(`/receptionist/patient/search/name/${name}`),
  searchByPhone: (phone) => api.get(`/receptionist/patient/search/phone/${phone}`),
  getPatientVisits: (patientId) => api.get(`/receptionist/patient/${patientId}/visits`),
  getPatientBilling: (patientId) => api.get(`/receptionist/patient/${patientId}/billing`),
  getDischargeStatus: (patientId) => api.get(`/receptionist/patient/${patientId}/discharge-status`),
  updatePatient: (patientId, data) => api.put(`/receptionist/patient/${patientId}`, data),
  getDashboardStats: () => api.get('/receptionist/dashboard-stats'),
  getTodayArrivals: () => api.get('/receptionist/today-arrivals'),
  checkInPatient: (patientId) => api.post(`/receptionist/patient/${patientId}/checkin`),
  getAppointments: (date) => api.get('/receptionist/appointments', { params: date ? { date } : {} }),
  createAppointment: (data) => api.post('/receptionist/appointments', data),
  updateAppointment: (appointmentId, data) => api.put(`/receptionist/appointments/${appointmentId}`, data),
  cancelAppointment: (appointmentId) => api.delete(`/receptionist/appointments/${appointmentId}`),
  markPaymentComplete: (patientId, paymentData) => api.post(`/receptionist/patient/${patientId}/payment`, paymentData),
  getPaymentHistory: (patientId) => api.get(`/receptionist/patient/${patientId}/payment-history`),
  getDoctors: (department) => api.get('/receptionist/doctors', { params: { department } })
};

export const vitalsAPI = {
  receiveVitals: (data) => api.post('/vitals/receive', data),
  getPatientVitals: (patientId) => api.get(`/vitals/patient/${patientId}`)
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.put('/notifications/read', { notificationId }),
  markAllAsRead: () => api.put('/notifications/read-all')
};

export const visitAPI = {
  startVisit: (data) => api.post('/visits/start', data),
  endVisit: (visitId) => api.put(`/visits/${visitId}/end`)
};

export const medicalRecordAPI = {
  uploadRecord: (formData) => api.post('/medical-records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPatientRecords: (patientId) => api.get(`/medical-records/patient/${patientId}`),
  downloadFile: (recordId) => api.get(`/files/${recordId}`, { responseType: 'blob' })
};

export default api;
