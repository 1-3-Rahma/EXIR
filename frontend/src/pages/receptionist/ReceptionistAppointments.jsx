import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import {
  FiCalendar, FiClock, FiUser, FiPlus, FiEdit2,
  FiTrash2, FiSearch, FiFilter, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

const ReceptionistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewModal, setShowNewModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    patientId: '',
    doctorId: '',
    doctorName: '',
    date: '',
    time: '',
    department: '',
    notes: ''
  });

  const doctors = [
    { _id: '1', fullName: 'Dr. Sarah Johnson', specialization: 'Cardiology' },
    { _id: '2', fullName: 'Dr. Michael Chen', specialization: 'General Medicine' },
    { _id: '3', fullName: 'Dr. Emily Brown', specialization: 'Neurology' }
  ];

  const departments = ['Cardiology', 'General Medicine', 'Neurology', 'Orthopedics', 'Pediatrics', 'ER'];

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await receptionistAPI.getAppointments(selectedDate.toISOString());
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([
        { _id: '1', patientName: 'John Doe', doctorName: 'Dr. Sarah Johnson', time: '09:00 AM', status: 'confirmed', department: 'Cardiology' },
        { _id: '2', patientName: 'Jane Smith', doctorName: 'Dr. Michael Chen', time: '10:30 AM', status: 'pending', department: 'General Medicine' },
        { _id: '3', patientName: 'Bob Wilson', doctorName: 'Dr. Emily Brown', time: '02:00 PM', status: 'confirmed', department: 'Neurology' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      await receptionistAPI.createAppointment(newAppointment);
      setShowNewModal(false);
      fetchAppointments();
      setNewAppointment({
        patientName: '',
        patientId: '',
        doctorId: '',
        doctorName: '',
        date: '',
        time: '',
        department: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await receptionistAPI.cancelAppointment(appointmentId);
      fetchAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error);
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter !== 'all' && apt.status !== filter) return false;
    if (searchTerm && !apt.patientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'pending': return 'orange';
      case 'cancelled': return 'red';
      case 'completed': return 'blue';
      default: return 'gray';
    }
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

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'confirmed' ? 'active' : ''} onClick={() => setFilter('confirmed')}>Confirmed</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending</button>
          <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>Cancelled</button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading appointments...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <FiCalendar className="empty-icon" />
              <h3>No Appointments</h3>
              <p>No appointments scheduled for this day</p>
            </div>
          ) : (
            <div className="appointments-list">
              {filteredAppointments.map((apt) => (
                <div key={apt._id} className="appointment-card">
                  <div className="appointment-time">
                    <FiClock />
                    <span>{apt.time}</span>
                  </div>
                  <div className="appointment-info">
                    <div className="patient-info">
                      <span className="patient-name">{apt.patientName}</span>
                      <span className="department">{apt.department}</span>
                    </div>
                    <div className="doctor-info">
                      <FiUser />
                      <span>{apt.doctorName}</span>
                    </div>
                  </div>
                  <div className="appointment-status">
                    <span className={`status-badge ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="appointment-actions">
                    <button className="action-btn edit" title="Edit">
                      <FiEdit2 />
                    </button>
                    {apt.status !== 'cancelled' && (
                      <button
                        className="action-btn cancel"
                        title="Cancel"
                        onClick={() => handleCancelAppointment(apt._id)}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Schedule New Appointment</h2>
              <button className="close-btn" onClick={() => setShowNewModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateAppointment} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input
                    type="text"
                    value={newAppointment.patientName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                    placeholder="Enter patient name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={newAppointment.department}
                    onChange={(e) => setNewAppointment({ ...newAppointment, department: e.target.value })}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Doctor *</label>
                  <select
                    value={newAppointment.doctorId}
                    onChange={(e) => {
                      const doctor = doctors.find(d => d._id === e.target.value);
                      setNewAppointment({
                        ...newAppointment,
                        doctorId: e.target.value,
                        doctorName: doctor?.fullName || ''
                      });
                    }}
                    required
                  >
                    <option value="">Select doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.fullName} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowNewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
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
        }
        .today-btn:hover {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }
        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-white);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          flex: 1;
          max-width: 300px;
        }
        .search-box input {
          border: none;
          outline: none;
          font-size: 0.9rem;
          flex: 1;
        }
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
        }
        .filter-tabs button {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-white);
          font-size: 0.85rem;
          cursor: pointer;
        }
        .filter-tabs button.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
        }
        .appointments-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .appointment-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }
        .appointment-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .appointment-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 100px;
          color: var(--accent-blue);
          font-weight: 500;
        }
        .appointment-info {
          flex: 1;
        }
        .patient-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .patient-name {
          font-weight: 500;
        }
        .department {
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          background: var(--bg-light);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
        }
        .doctor-info {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.green { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
        .status-badge.orange { background: rgba(249, 115, 22, 0.1); color: var(--accent-orange); }
        .status-badge.red { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }
        .status-badge.blue { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
        .appointment-actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn.edit {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .action-btn.cancel {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
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
        }
        .modal {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 500px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 {
          font-size: 1.1rem;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-muted);
        }
        .modal-body {
          padding: 1.25rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.625rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .cancel-btn {
          padding: 0.625rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          cursor: pointer;
        }
        .submit-btn {
          padding: 0.625rem 1.25rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistAppointments;
