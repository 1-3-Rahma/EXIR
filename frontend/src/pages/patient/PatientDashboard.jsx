import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { patientAPI, notificationAPI } from '../../services/api';
import { FiCalendar, FiHeart, FiBell, FiMapPin, FiChevronRight, FiAlertCircle, FiInfo, FiCheckCircle, FiClock, FiUser, FiDroplet } from 'react-icons/fi';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    todayMedications: 0,
    unreadNotifications: 0
  });
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [ivOrders, setIvOrders] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, medicationsRes, notifRes] = await Promise.all([
        patientAPI.getDashboard(),
        patientAPI.getMedications(),
        notificationAPI.getNotifications()
      ]);

      // Set appointments from dashboard
      setAppointments(dashboardRes.data.upcomingAppointments || []);

      // Set medications from medications endpoint
      setMedications(medicationsRes.data.medications || []);
      setIvOrders(medicationsRes.data.ivOrders || []);
      setDoctor(medicationsRes.data.doctor || null);

      // Set notifications
      setNotifications(notifRes.data.slice(0, 5));

      // Update stats
      setStats({
        upcomingAppointments: dashboardRes.data.stats?.upcomingAppointmentsCount || 0,
        todayMedications: (medicationsRes.data.medications?.length || 0) + (medicationsRes.data.ivOrders?.length || 0),
        unreadNotifications: notifRes.data.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical':
        return <FiAlertCircle className="notif-icon critical" />;
      case 'success':
        return <FiCheckCircle className="notif-icon success" />;
      case 'medication':
        return <FiHeart className="notif-icon info" />;
      case 'appointment':
        return <FiCalendar className="notif-icon info" />;
      default:
        return <FiInfo className="notif-icon info" />;
    }
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {user?.fullName || 'Patient'}</p>
          </div>
        </div>
      </div>

      <div className="colored-stats">
        <div className="colored-stat blue">
          <div className="colored-stat-content">
            <span>Upcoming</span>
            <strong>{stats.upcomingAppointments}</strong>
            <span>Appointments</span>
          </div>
          <FiCalendar className="colored-stat-icon" />
        </div>

        <div className="colored-stat green">
          <div className="colored-stat-content">
            <span>Today's</span>
            <strong>{stats.todayMedications}</strong>
            <span>Medications</span>
          </div>
          <FiHeart className="colored-stat-icon" />
        </div>

        <div className="colored-stat orange">
          <div className="colored-stat-content">
            <span>Unread</span>
            <strong>{stats.unreadNotifications}</strong>
            <span>Notifications</span>
          </div>
          <FiBell className="colored-stat-icon" />
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <h2>
              <FiCalendar /> Upcoming Appointments
            </h2>
          </div>
          <div className="appointment-list">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state-small">
                <FiCalendar className="empty-icon" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt._id} className="appointment-item">
                  <div className="appointment-date">
                    <span>{formatDate(apt.date)}</span>
                    <strong>{apt.time}</strong>
                  </div>
                  <div className="appointment-info">
                    <span className="appointment-doctor">
                      <FiUser /> {apt.doctorId?.fullName || apt.doctorName || 'Doctor'}
                    </span>
                    <span className="appointment-specialty">{apt.doctorId?.specialization || apt.department}</span>
                    <span className="appointment-status">
                      <span className={`status-badge ${apt.status}`}>{apt.status}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Medications */}
        <div className="card">
          <div className="card-header">
            <h2>
              <FiHeart /> Today's Medications
            </h2>
            {doctor && (
              <span className="prescribed-by">Prescribed by Dr. {doctor.fullName}</span>
            )}
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading medications...</p>
              </div>
            ) : medications.length === 0 && ivOrders.length === 0 ? (
              <div className="empty-state-small">
                <FiHeart className="empty-icon" />
                <p>No medications scheduled for today</p>
              </div>
            ) : (
              <div className="medications-list">
                {medications.map((med, index) => (
                  <div key={index} className="medication-item">
                    <div className="med-icon">
                      <FiHeart />
                    </div>
                    <div className="med-details">
                      <span className="med-name">{med.medicineName}</span>
                      <span className="med-dosage">{med.dosage}</span>
                      <span className="med-frequency">
                        <FiClock /> {med.timesPerDay}x daily
                      </span>
                    </div>
                  
                  </div>
                ))}
                {ivOrders.map((iv, index) => (
                  <div key={`iv-${index}`} className="medication-item iv-order">
                    <div className="med-icon iv">
                      <FiDroplet />
                    </div>
                    <div className="med-details">
                      <span className="med-name">{iv.fluidType}</span>
                      <span className="med-dosage">{iv.rate}</span>
                      <span className="med-frequency">
                        <FiClock /> IV Order
                      </span>
                    </div>
                    <div className={`med-status ${iv.status}`}>
                      {iv.status === 'given' ? 'Administered' : 'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="card full-width">
          <div className="card-header">
            <h2>
              <FiBell /> Notifications
            </h2>
          </div>
          <div className="card-body">
            {notifications.length === 0 ? (
              <div className="empty-state-small">
                <FiBell className="empty-icon" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="notification-list-patient">
                {notifications.map((notif) => (
                  <div key={notif._id} className={`notification-item-patient ${notif.type} ${notif.read ? 'read' : ''}`}>
                    {getNotificationIcon(notif.type)}
                    <div className="notif-content">
                      <span className="notif-message">{notif.message}</span>
                      <span className="notif-time">{getTimeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .colored-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .colored-stat {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .colored-stat.blue {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }
        .colored-stat.green {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .colored-stat.orange {
          background: linear-gradient(135deg, #f97316, #ea580c);
        }
        .colored-stat-content {
          display: flex;
          flex-direction: column;
        }
        .colored-stat-content span {
          font-size: 0.85rem;
          opacity: 0.9;
        }
        .colored-stat-content strong {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .colored-stat-icon {
          font-size: 2.5rem;
          opacity: 0.8;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        .card.full-width {
          grid-column: 1 / -1;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 0.5rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .empty-state-small {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: var(--text-muted);
          text-align: center;
        }
        .empty-state-small .empty-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }
        .prescribed-by {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .appointment-list {
          display: flex;
          flex-direction: column;
        }
        .appointment-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.2s;
        }
        .appointment-item:hover {
          background: var(--bg-light);
        }
        .appointment-item:last-child {
          border-bottom: none;
        }
        .appointment-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-md);
          min-width: 80px;
        }
        .appointment-date span {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .appointment-date strong {
          font-size: 0.9rem;
          color: var(--accent-blue);
        }
        .appointment-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .appointment-doctor {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .appointment-specialty {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .appointment-status {
          font-size: 0.8rem;
        }
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.pending {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .status-badge.confirmed {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .appointment-arrow {
          color: var(--text-muted);
        }
        .medications-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .medication-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .medication-item.iv-order {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .med-icon {
          width: 40px;
          height: 40px;
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
        }
        .med-icon.iv {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .med-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .med-name {
          font-weight: 500;
        }
        .med-dosage {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .med-frequency {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .med-status {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
        }
        .med-status.active {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .med-status.given {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .notification-list-patient {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notification-item-patient {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .notification-item-patient.read {
          opacity: 0.7;
        }
        .notification-item-patient.critical {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid var(--accent-red);
        }
        .notification-item-patient.info {
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid var(--accent-blue);
        }
        .notification-item-patient.success {
          background: rgba(34, 197, 94, 0.1);
          border-left: 3px solid var(--accent-green);
        }
        .notification-item-patient.medication {
          background: rgba(139, 92, 246, 0.1);
          border-left: 3px solid #8b5cf6;
        }
        .notification-item-patient.appointment {
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid var(--accent-blue);
        }
        .notif-icon {
          font-size: 1.125rem;
          margin-top: 0.125rem;
        }
        .notif-icon.critical { color: var(--accent-red); }
        .notif-icon.info { color: var(--accent-blue); }
        .notif-icon.success { color: var(--accent-green); }
        .notif-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .notif-message {
          flex: 1;
        }
        .notif-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .colored-stats {
            grid-template-columns: 1fr;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientDashboard;
