import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import {
  FiCalendar, FiClock, FiUser, FiPlus, FiX,
  FiSearch, FiAlertCircle, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

const ReceptionistAppointments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [shiftError, setShiftError] = useState('');
  const [prefilledPatient, setPrefilledPatient] = useState(null);

  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    patientId: '',
    nationalID: '',
    phone: '',
    doctorId: '',
    doctorName: '',
    date: '',
    time: '',
    department: '',
    customDepartment: '',
    notes: ''
  });

  const departments = [
    'Cardiology',
    'General Medicine',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Ophthalmology',
    'ENT',
    'Gynecology',
    'Urology',
    'Psychiatry',
    'Oncology',
    'Emergency',
    'Other'
  ];

  // Shift time ranges
  const shiftTimes = {
    morning: { start: '08:00', end: '14:00', label: 'Morning (8:00 AM - 2:00 PM)' },
    afternoon: { start: '14:00', end: '20:00', label: 'Afternoon (2:00 PM - 8:00 PM)' },
    night: { start: '20:00', end: '08:00', label: 'Night (8:00 PM - 8:00 AM)' }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  // Check for patient query parameter (from patient profile)
  useEffect(() => {
    const patientId = searchParams.get('patient');
    if (patientId) {
      fetchPatientForAppointment(patientId);
    }
  }, [searchParams]);

  const fetchPatientForAppointment = async (patientId) => {
    try {
      const response = await receptionistAPI.getPatient(patientId);
      const patient = response.data;
      setPrefilledPatient(patient);
      setNewAppointment(prev => ({
        ...prev,
        patientName: patient.fullName,
        patientId: patient._id
      }));
      setShowNewModal(true);
      // Clear the query parameter
      setSearchParams({});
    } catch (error) {
      console.error('Error fetching patient:', error);
      alert('Failed to load patient information');
      navigate('/receptionist/appointments');
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Format date as YYYY-MM-DD to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await receptionistAPI.getAppointments(dateStr);
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Fetch doctors when department changes
  useEffect(() => {
    if (newAppointment.department) {
      fetchDoctors(newAppointment.department);
    } else {
      setDoctors([]);
    }
  }, [newAppointment.department]);

  const fetchDoctors = async (department) => {
    setLoadingDoctors(true);
    try {
      const response = await receptionistAPI.getDoctors(department);
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Validate time against doctor's shift
  const validateShiftTime = (time, doctor) => {
    if (!time || !doctor || !doctor.shift) {
      setShiftError('');
      return true;
    }

    const shift = shiftTimes[doctor.shift];
    if (!shift) {
      setShiftError('');
      return true;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    const [startH, startM] = shift.start.split(':').map(Number);
    const [endH, endM] = shift.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let isValid;
    if (doctor.shift === 'night') {
      // Night shift spans midnight
      isValid = timeInMinutes >= startMinutes || timeInMinutes < endMinutes;
    } else {
      isValid = timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
    }

    if (!isValid) {
      setShiftError(`Dr. ${doctor.fullName} works ${shift.label}. Please select a time within their shift.`);
      return false;
    }

    setShiftError('');
    return true;
  };

  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find(d => d._id === doctorId);
    setNewAppointment({
      ...newAppointment,
      doctorId: doctorId,
      doctorName: doctor?.fullName || ''
    });
    // Re-validate time if already set
    if (newAppointment.time && doctor) {
      validateShiftTime(newAppointment.time, doctor);
    }
  };

  const handleTimeChange = (time) => {
    setNewAppointment({ ...newAppointment, time });
    const doctor = doctors.find(d => d._id === newAppointment.doctorId);
    if (doctor) {
      validateShiftTime(time, doctor);
    }
  };

  // Convert 24h time to 12h format
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();

    // Validate shift time
    const doctor = doctors.find(d => d._id === newAppointment.doctorId);
    if (!validateShiftTime(newAppointment.time, doctor)) {
      return;
    }

    try {
      const appointmentData = {
        patientName: newAppointment.patientName,
        patientId: newAppointment.patientId || null,
        doctorId: newAppointment.doctorId,
        doctorName: newAppointment.doctorName,
        department: newAppointment.department === 'Other' ? newAppointment.customDepartment : newAppointment.department,
        date: newAppointment.date,
        time: formatTime12h(newAppointment.time),
        notes: newAppointment.notes
      };

      await receptionistAPI.createAppointment(appointmentData);

      // Switch to the appointment's date to show it in the list
      const [year, month, day] = newAppointment.date.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day);
      setSelectedDate(appointmentDate);

      setShowNewModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert(error.response?.data?.message || 'Failed to create appointment. Please try again.');
    }
  };

  const resetForm = () => {
    setNewAppointment({
      patientName: '',
      patientId: '',
      nationalID: '',
      phone: '',
      doctorId: '',
      doctorName: '',
      date: '',
      time: '',
      department: '',
      customDepartment: '',
      notes: ''
    });
    setShiftError('');
    setDoctors([]);
    setPrefilledPatient(null);
  };

  // Filter appointments by patient name
  const filteredAppointments = appointments.filter(apt => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return apt.patientName?.toLowerCase().includes(term);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSelectedDoctor = () => {
    return doctors.find(d => d._id === newAppointment.doctorId);
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Appointments</h1>
            <p>Manage patient appointments and schedules</p>
          </div>
          <button className="new-appointment-btn" onClick={() => setShowNewModal(true)}>
            <FiPlus /> New Appointment
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="date-navigation">
        <button className="nav-btn" onClick={() => changeDate(-1)}>
          <FiChevronLeft />
        </button>
        <div className="current-date">
          <FiCalendar />
          <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <button className="nav-btn" onClick={() => changeDate(1)}>
          <FiChevronRight />
        </button>
        <button className="today-btn" onClick={() => setSelectedDate(new Date())}>
          Today
        </button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="card-header">
          <h2>Scheduled Appointments</h2>
          <span className="appointment-count">{filteredAppointments.length} appointments</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading appointments...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <FiCalendar className="empty-icon" />
              <h3>No Appointments</h3>
              <p>{searchTerm ? 'No appointments found matching your search' : 'No appointments scheduled for this day'}</p>
            </div>
          ) : (
            <div className="appointments-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Doctor</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt._id}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">
                            {apt.patientName?.charAt(0) || 'P'}
                          </div>
                          <span>{apt.patientName}</span>
                        </div>
                      </td>
                      <td>{formatDate(apt.date)}</td>
                      <td>
                        <span className="time-badge">
                          <FiClock /> {apt.time}
                        </span>
                      </td>
                      <td>
                        <span className="doctor-name">
                          <FiUser /> {apt.doctorName || 'Not assigned'}
                        </span>
                      </td>
                      <td>
                        <span className="department-badge">{apt.department}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule New Appointment</h2>
              <button className="close-btn" onClick={() => { setShowNewModal(false); resetForm(); }}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateAppointment} className="modal-body">
              {prefilledPatient && (
                <div className="patient-info-banner">
                  <div className="patient-avatar-small">
                    {prefilledPatient.fullName?.charAt(0) || 'P'}
                  </div>
                  <div className="patient-details">
                    <span className="patient-name-display">{prefilledPatient.fullName}</span>
                    <span className="patient-id-display">ID: {prefilledPatient.nationalID}</span>
                  </div>
                </div>
              )}

              {!prefilledPatient && (
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input
                    type="text"
                    value={newAppointment.patientName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                    placeholder="Enter patient name"
                    required
                  />
                  <span className="field-hint warning">Tip: Schedule from a patient's profile for better tracking</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={newAppointment.department}
                    onChange={(e) => {
                      setNewAppointment({
                        ...newAppointment,
                        department: e.target.value,
                        doctorId: '',
                        doctorName: '',
                        customDepartment: ''
                      });
                      setShiftError('');
                    }}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {newAppointment.department === 'Other' && (
                  <div className="form-group">
                    <label>Specify Department *</label>
                    <input
                      type="text"
                      value={newAppointment.customDepartment}
                      onChange={(e) => setNewAppointment({ ...newAppointment, customDepartment: e.target.value })}
                      placeholder="Enter department name"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Doctor *</label>
                <select
                  value={newAppointment.doctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  required
                  disabled={!newAppointment.department || loadingDoctors}
                >
                  <option value="">
                    {loadingDoctors ? 'Loading doctors...' :
                     !newAppointment.department ? 'Select department first' :
                     doctors.length === 0 ? 'No doctors available' : 'Select doctor'}
                  </option>
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.fullName} {doctor.shift ? `(${doctor.shift} shift)` : ''}
                    </option>
                  ))}
                </select>
                {getSelectedDoctor()?.shift && (
                  <span className="shift-info">
                    <FiClock /> {shiftTimes[getSelectedDoctor().shift]?.label}
                  </span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {shiftError && (
                <div className="shift-error">
                  <FiAlertCircle /> {shiftError}
                </div>
              )}

              <div className="form-group">
                <label>Symptoms / Reason for Visit *</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  placeholder="Describe the patient's symptoms or reason for the appointment..."
                  rows={4}
                  required
                />
                <span className="field-hint">This information will be visible to the doctor</span>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => { setShowNewModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={!!shiftError}>
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .new-appointment-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .new-appointment-btn:hover {
          background: #1d4ed8;
        }
        .date-navigation {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: var(--bg-white);
          padding: 1rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        .nav-btn {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .current-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          flex: 1;
        }
        .today-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .today-btn:hover {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }
        .search-section {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          padding: 1rem 1.5rem;
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
        }
        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-light);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .search-input-wrapper input {
          border: none;
          outline: none;
          background: none;
          font-size: 0.9rem;
          flex: 1;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .appointment-count {
          font-size: 0.85rem;
          color: var(--text-secondary);
          background: var(--bg-light);
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
        }
        .appointments-table {
          overflow-x: auto;
        }
        .appointments-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .appointments-table th,
        .appointments-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .appointments-table th {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-light);
        }
        .appointments-table tbody tr:hover {
          background: var(--bg-light);
        }
        .patient-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .patient-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .time-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--accent-blue);
          font-weight: 500;
        }
        .doctor-name {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--text-secondary);
        }
        .department-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(139, 92, 246, 0.1);
          color: #7c3aed;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .loading-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalSlideIn 0.2s ease-out;
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: var(--bg-white);
          z-index: 1;
        }
        .modal-header h2 {
          font-size: 1.1rem;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-muted);
          padding: 0.25rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: var(--bg-light);
          color: var(--text-primary);
        }
        .modal-body {
          padding: 1.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          margin-bottom: 1rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
        .form-group select:disabled {
          background: var(--bg-light);
          cursor: not-allowed;
        }
        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        .field-hint {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        .field-hint.warning {
          color: var(--accent-orange);
        }
        .patient-info-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .patient-avatar-small {
          width: 48px;
          height: 48px;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .patient-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .patient-name-display {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary);
        }
        .patient-id-display {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .shift-info {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--accent-blue);
          margin-top: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-md);
        }
        .shift-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          margin-top: 0.5rem;
        }
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          background: var(--bg-light);
        }
        .submit-btn {
          padding: 0.75rem 1.5rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .submit-btn:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistAppointments;
