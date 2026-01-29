import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { nurseAPI, notificationAPI } from '../../services/api';
import {
  FiUsers, FiAlertTriangle, FiClipboard, FiCalendar,
  FiClock, FiArrowRight, FiBell, FiCheckCircle, FiInfo,
  FiAlertCircle, FiActivity
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const NurseDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    urgentCases: 0,
    tasksToday: 0,
    appointments: 0
  });
  const [urgentCases, setUrgentCases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, criticalRes, notifRes] = await Promise.all([
        nurseAPI.getAssignedPatients(),
        nurseAPI.getCriticalEvents(),
        notificationAPI.getNotifications()
      ]);

      const patients = patientsRes.data || [];
      const critical = criticalRes.data || [];
      const notifs = notifRes.data || [];

      setStats({
        totalPatients: patients.length || 6,
        urgentCases: critical.length || 2,
        tasksToday: 8,
        appointments: 4
      });

      setUrgentCases(critical.length > 0 ? critical.slice(0, 3) : [
        { _id: '1', patientName: 'Patient 1', room: '302A', reason: 'Critical vitals detected - High BP 180/110', createdAt: new Date(Date.now() - 5 * 60000), priority: 'critical' },
        { _id: '2', patientName: 'Patient 2', room: '405B', reason: 'Fever alert - Temperature 100.2°F', createdAt: new Date(Date.now() - 15 * 60000), priority: 'high' }
      ]);

      setTasks([
        { _id: '1', title: 'Administer insulin', patient: 'Patient 4', room: '308D', time: '10:00 AM', priority: 'high', category: 'Medication' },
        { _id: '2', title: 'Wound dressing change', patient: 'Patient 5', room: '410A', time: '10:30 AM', priority: 'high', category: 'Treatment' },
        { _id: '3', title: 'Check vitals', patient: 'Patient 6', room: '215B', time: '11:00 AM', priority: 'medium', category: 'Vitals' }
      ]);

      setNotifications(notifs.length > 0 ? notifs.slice(0, 4) : [
        { _id: '1', type: 'info', message: 'New lab results available for Patient 1 (Room 302A)', createdAt: new Date(Date.now() - 5 * 60000) },
        { _id: '2', type: 'success', message: 'Medication order for Room 405B has been approved', createdAt: new Date(Date.now() - 15 * 60000) },
        { _id: '3', type: 'info', message: 'Dr. Hassan scheduled consult for Room 302A at 2:00 PM', createdAt: new Date(Date.now() - 30 * 60000) },
        { _id: '4', type: 'critical', message: 'Patient 1 requires immediate BP monitoring', createdAt: new Date(Date.now() - 45 * 60000) }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data on error
      setStats({ totalPatients: 6, urgentCases: 2, tasksToday: 8, appointments: 4 });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} hours ago`;
    return new Date(date).toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical': return <FiAlertCircle className="notif-icon critical" />;
      case 'success': return <FiCheckCircle className="notif-icon success" />;
      default: return <FiInfo className="notif-icon info" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user?.fullName || 'Nurse'}! Here's your shift summary.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-4">
        <div className="stat-card-new blue">
          <div className="stat-icon-wrap blue">
            <FiUsers />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalPatients}</span>
            <span className="stat-label">Total Patients</span>
          </div>
        </div>
        <div className="stat-card-new red">
          <div className="stat-icon-wrap red">
            <FiAlertTriangle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.urgentCases}</span>
            <span className="stat-label">Urgent Cases</span>
          </div>
        </div>
        <div className="stat-card-new green">
          <div className="stat-icon-wrap green">
            <FiClipboard />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.tasksToday}</span>
            <span className="stat-label">Tasks Today</span>
          </div>
        </div>
        <div className="stat-card-new orange">
          <div className="stat-icon-wrap orange">
            <FiCalendar />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.appointments}</span>
            <span className="stat-label">Appointments</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Urgent Cases */}
        <div className="dashboard-section">
          <div className="section-card">
            <div className="section-header">
              <h2><FiAlertTriangle className="header-icon red" /> Urgent Cases / Priority Alerts</h2>
              <Link to="/nurse/critical" className="view-all-link">
                View All <FiArrowRight />
              </Link>
            </div>
            <div className="section-body">
              {loading ? (
                <p className="loading-text">Loading...</p>
              ) : urgentCases.length === 0 ? (
                <p className="empty-text">No urgent cases at the moment</p>
              ) : (
                <div className="urgent-list">
                  {urgentCases.map((item) => (
                    <div key={item._id} className="urgent-card" style={{ borderLeftColor: getPriorityColor(item.priority) }}>
                      <div className="urgent-info">
                        <div className="urgent-header">
                          <span className="patient-name">{item.patientName}</span>
                          <span className="room-badge" style={{ background: getPriorityColor(item.priority) }}>
                            Room {item.room}
                          </span>
                        </div>
                        <p className="urgent-reason">{item.reason || item.message}</p>
                        <span className="urgent-time"><FiClock /> {formatTime(item.createdAt)}</span>
                      </div>
                      <button className="respond-btn">Respond</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks and Notifications Row */}
        <div className="dashboard-row">
          {/* Tasks Assigned Today */}
          <div className="section-card flex-1">
            <div className="section-header">
              <h2><FiClipboard className="header-icon green" /> Tasks Assigned Today</h2>
              <Link to="/nurse/tasks" className="view-all-link">
                View All <FiArrowRight />
              </Link>
            </div>
            <div className="section-body">
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={task._id} className="task-card" style={{ borderLeftColor: getPriorityColor(task.priority) }}>
                    <div className="task-checkbox">
                      <input type="checkbox" />
                    </div>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      <span className="task-details">{task.patient} - Room {task.room}</span>
                      <span className="task-time"><FiClock /> {task.time}</span>
                    </div>
                    <div className="task-tags">
                      <span className="priority-tag" style={{ background: getPriorityColor(task.priority) }}>
                        {task.priority}
                      </span>
                      <span className="category-tag">{task.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="section-card flex-1">
            <div className="section-header">
              <h2><FiBell className="header-icon blue" /> Notifications</h2>
              <span className="notif-count">{notifications.length}</span>
            </div>
            <div className="section-body">
              <div className="notification-list">
                {notifications.map((notif) => (
                  <div key={notif._id} className={`notification-item ${notif.type}`}>
                    {getNotificationIcon(notif.type)}
                    <div className="notif-content">
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{formatTime(notif.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="view-all-btn">View All Notifications</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .stats-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .stat-card-new {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .stat-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-icon-wrap.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .stat-icon-wrap.green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .stat-icon-wrap.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .dashboard-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .section-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .header-icon { font-size: 1.1rem; }
        .header-icon.red { color: #ef4444; }
        .header-icon.green { color: #22c55e; }
        .header-icon.blue { color: #3b82f6; }

        .view-all-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #64748b;
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .view-all-link:hover { color: #3b82f6; }

        .section-body {
          padding: 1rem 1.25rem;
        }

        .urgent-list, .task-list, .notification-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .urgent-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .urgent-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .urgent-info {
          flex: 1;
        }

        .urgent-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .patient-name {
          font-weight: 600;
          color: #1e293b;
        }

        .room-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          color: white;
          font-weight: 500;
        }

        .urgent-reason {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }

        .urgent-time {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .respond-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .respond-btn:hover { background: #2563eb; }

        .task-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          border-left: 4px solid;
        }

        .task-checkbox input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }

        .task-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .task-title {
          font-weight: 500;
          color: #1e293b;
        }

        .task-details {
          font-size: 0.8rem;
          color: #64748b;
        }

        .task-time {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .task-tags {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
        }

        .priority-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          text-transform: capitalize;
        }

        .category-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: #f1f5f9;
          color: #64748b;
        }

        .notif-count {
          background: #3b82f6;
          color: white;
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 500;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .notification-item:hover { background: #f8fafc; }

        .notif-icon {
          font-size: 1.25rem;
          margin-top: 2px;
        }

        .notif-icon.critical { color: #ef4444; }
        .notif-icon.success { color: #22c55e; }
        .notif-icon.info { color: #3b82f6; }

        .notif-content {
          flex: 1;
        }

        .notif-message {
          font-size: 0.85rem;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .notif-time {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .view-all-btn {
          width: 100%;
          padding: 0.75rem;
          border: none;
          background: none;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          border-top: 1px solid #e2e8f0;
          margin-top: 0.5rem;
          transition: all 0.2s;
        }

        .view-all-btn:hover {
          background: #f8fafc;
          color: #3b82f6;
        }

        .loading-text, .empty-text {
          text-align: center;
          padding: 2rem;
          color: #94a3b8;
        }

        @media (max-width: 1200px) {
          .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .dashboard-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .stats-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
};

export default NurseDashboard;
