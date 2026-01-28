import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { patientAPI, notificationAPI } from '../../services/api';
import { FiCalendar, FiHeart, FiBell, FiMapPin, FiChevronRight, FiSearch, FiAlertCircle, FiInfo, FiCheckCircle } from 'react-icons/fi';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingAppointments: 2,
    todayMedications: 3,
    unreadNotifications: 3
  });
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [notifRes] = await Promise.all([
        notificationAPI.getNotifications()
      ]);

      setNotifications(notifRes.data.slice(0, 3));
      setStats(prev => ({
        ...prev,
        unreadNotifications: notifRes.data.filter(n => !n.read).length
      }));

      // Mock appointments
      setAppointments([
        {
          id: 1,
          date: 'Dec 6, 2025',
          time: '10:30 AM',
          doctor: 'Dr. Sarah Johnson',
          specialty: 'Cardiologist',
          location: 'Main Hospital - Building A, Room 302'
        },
        {
          id: 2,
          date: 'Dec 10, 2025',
          time: '2:00 PM',
          doctor: 'Dr. Michael Chen',
          specialty: 'General Physician',
          location: 'Community Clinic - 2nd Floor'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical':
        return <FiAlertCircle className="notif-icon critical" />;
      case 'success':
        return <FiCheckCircle className="notif-icon success" />;
      default:
        return <FiInfo className="notif-icon info" />;
    }
  };

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {user?.fullName || 'Patient'}</p>
          </div>
          <div className="header-search">
            <FiSearch />
            <input type="text" placeholder="Search records, medications..." />
            <FiBell className="notification-bell" />
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
        <div className="card">
          <div className="card-header">
            <h2>
              <FiCalendar /> Upcoming Appointments
            </h2>
          </div>
          <div className="appointment-list">
            {appointments.map((apt) => (
              <div key={apt.id} className="appointment-item">
                <div className="appointment-date">
                  <span>{apt.date.split(',')[0]}</span>
                  <strong>{apt.time}</strong>
                </div>
                <div className="appointment-info">
                  <span className="appointment-doctor">{apt.doctor}</span>
                  <span className="appointment-specialty">{apt.specialty}</span>
                  <span className="appointment-location">
                    <FiMapPin /> {apt.location}
                  </span>
                </div>
                <FiChevronRight className="appointment-arrow" />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>
              <FiBell /> Notifications
            </h2>
          </div>
          <div className="card-body">
            {notifications.length === 0 ? (
              <p className="no-notifications">No new notifications</p>
            ) : (
              <div className="notification-list-patient">
                {notifications.map((notif) => (
                  <div key={notif._id} className={`notification-item-patient ${notif.type}`}>
                    {getNotificationIcon(notif.type)}
                    <span className="notif-message">{notif.message}</span>
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
        .header-search {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-white);
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .header-search input {
          border: none;
          outline: none;
          width: 200px;
          font-size: 0.9rem;
        }
        .notification-bell {
          color: var(--text-secondary);
          cursor: pointer;
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
        .notification-list-patient {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notification-item-patient {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
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
        .notif-icon {
          font-size: 1.125rem;
        }
        .notif-icon.critical { color: var(--accent-red); }
        .notif-icon.info { color: var(--accent-blue); }
        .notif-icon.success { color: var(--accent-green); }
        .notif-message {
          flex: 1;
        }
      `}</style>
    </Layout>
  );
};

export default PatientDashboard;
