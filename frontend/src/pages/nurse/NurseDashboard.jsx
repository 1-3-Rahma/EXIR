import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI, tasksAPI, nurseAPI } from '../../services/api';
import {
  FiUsers, FiAlertTriangle, FiClipboard,
  FiClock, FiArrowRight, FiBell, FiCheckCircle, FiInfo,
  FiAlertCircle, FiX
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const NurseDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    urgentCases: 0,
    tasksToday: 0
  });
  const [urgentCases, setUrgentCases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time: when doctor changes patient status, show alert and refetch immediately (no refresh)
  useEffect(() => {
    const handler = (e) => {
      const payload = e?.detail;
      if (payload?.message) {
        setLiveAlert({ message: payload.message, status: payload.status });
        setTimeout(() => setLiveAlert(null), 8000);
      }
      fetchDashboardData();
    };
    window.addEventListener('patientStatusChanged', handler);
    return () => window.removeEventListener('patientStatusChanged', handler);
  }, []);

  // Real-time: when doctor adds prescription/IV order, show alert and refetch immediately
  useEffect(() => {
    const handler = (e) => {
      const payload = e?.detail;
      if (payload?.message) {
        setLiveAlert({ message: payload.message, status: payload.type === 'prescription' ? 'prescription' : 'iv_order' });
        setTimeout(() => setLiveAlert(null), 8000);
      }
      fetchDashboardData();
    };
    window.addEventListener('newNotification', handler);
    return () => window.removeEventListener('newNotification', handler);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchDashboardData = async () => {
    try {
      // One source of truth: urgent-cases = doctor-marked critical + vital alerts (e.g. Dr. Ahmed Hassan → Nurse Fatima)
      const [dashboardRes, urgentRes, tasksTodayRes, notifRes] = await Promise.all([
        fetch(`${API_URL}/nurse/dashboard`, { headers: getAuthHeaders() }),
        nurseAPI.getUrgentCases(),
        tasksAPI.getTodayTasks(),
        notificationAPI.getNotifications()
      ]);

      const dashboardData = dashboardRes.ok ? await dashboardRes.json() : null;
      const urgentData = urgentRes?.data || {};
      const urgentList = Array.isArray(urgentData.list) ? urgentData.list : [];
      const urgentCount = typeof urgentData.count === 'number' ? urgentData.count : urgentList.length;

      const tasksTodayRaw = tasksTodayRes?.data;
      const tasksTodayList = Array.isArray(tasksTodayRaw) ? tasksTodayRaw : (tasksTodayRaw?.data || []);
      const pendingToday = tasksTodayList.filter(t =>
        t.status === 'pending' || t.status === 'in_progress'
      );

      const notifRaw = notifRes?.data;
      const notifList = Array.isArray(notifRaw) ? notifRaw : (notifRaw?.data || []);

      setStats({
        totalPatients: dashboardData?.data?.assignedPatients || 0,
        urgentCases: urgentCount,
        tasksToday: pendingToday.length
      });

      setUrgentCases(urgentList.slice(0, 5).map(c => ({
        _id: c._id,
        patientName: c.patientName || 'Unknown Patient',
        room: c.room || 'N/A',
        reason: c.reason || (c.source === 'doctor' ? 'Marked critical by doctor' : 'Critical alert'),
        priority: 'critical',
        source: c.source,
        createdAt: c.createdAt
      })));

      setTasks(tasksTodayList.slice(0, 6));
      setAllNotifications(notifList);
      setNotifications(notifList.slice(0, 4));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats({ totalPatients: 0, urgentCases: 0, tasksToday: 0 });
      setUrgentCases([]);
      setTasks([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.read) return;
    try {
      await notificationAPI.markAsRead(notif._id);
      setNotifications(prev =>
        prev.map(n => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setAllNotifications(prev =>
        prev.map(n => (n._id === notif._id ? { ...n, read: true } : n))
      );
      window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const allUnreadCount = allNotifications.filter(n => !n.read).length;

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
      case 'assignment': return <FiAlertCircle className="notif-icon assignment" />;
      default: return <FiInfo className="notif-icon info" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
      {liveAlert && (
        <div
          className="live-alert-banner"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: liveAlert.status === 'critical' ? '#fee2e2'
              : (liveAlert.status === 'prescription' || liveAlert.status === 'iv_order') ? '#dbeafe'
              : '#dcfce7',
            border: `1px solid ${liveAlert.status === 'critical' ? '#ef4444'
              : (liveAlert.status === 'prescription' || liveAlert.status === 'iv_order') ? '#3b82f6'
              : '#22c55e'}`,
            color: liveAlert.status === 'critical' ? '#991b1b'
              : (liveAlert.status === 'prescription' || liveAlert.status === 'iv_order') ? '#1e40af'
              : '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiAlertCircle size={20} />
          <span>{liveAlert.message}</span>
        </div>
      )}
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user?.fullName || 'Nurse'}! Here's your shift summary.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-3">
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
      </div>

      <div className="dashboard-content">
        {/* Main Row: Urgent Cases (Left) and Notifications (Right) */}
        <div className="dashboard-row">
          {/* Urgent Cases - Left */}
          <div className="section-card flex-1">
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
                          {item.source === 'doctor' && (
                            <span className="source-badge doctor">Doctor</span>
                          )}
                          {item.source === 'vitals' && (
                            <span className="source-badge vitals">Vitals</span>
                          )}
                        </div>
                        <p className="urgent-reason">{item.reason}</p>
                        <span className="urgent-time"><FiClock /> {formatTime(item.createdAt)}</span>
                      </div>
                      <Link to="/nurse/patients" className="respond-btn">Respond</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notifications Panel - Right */}
          <div className="section-card flex-1">
            <div className="section-header">
              <h2><FiBell className="header-icon blue" /> Notifications</h2>
              {unreadCount > 0 && (
                <span className="notif-count unread-badge">{unreadCount}</span>
              )}
            </div>
            <div className="section-body">
              {notifications.length === 0 ? (
                <p className="empty-text">No notifications yet</p>
              ) : (
                <>
                  <div className="notification-list">
                    {notifications.map((notif) => (
                      <div
                        key={notif._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(notif)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
                        className={`notification-item ${notif.type} ${notif.read ? 'read' : ''}`}
                      >
                        {getNotificationIcon(notif.type)}
                        <div className="notif-content">
                          <p className="notif-message">{notif.message}</p>
                          <span className="notif-time">{formatTime(notif.createdAt)}</span>
                        </div>
                        {!notif.read && <span className="unread-dot" />}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="view-all-btn" onClick={() => setShowNotifModal(true)}>View All Notifications ({allNotifications.length})</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .stats-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
        .source-badge {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .source-badge.doctor { background: #0ea5e9; color: white; }
        .source-badge.vitals { background: #f59e0b; color: white; }

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
          display: inline-block;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          text-decoration: none;
        }

        .respond-btn:hover { background: #2563eb; color: white; }

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

        .notification-item { cursor: pointer; }
        .notification-item.read { opacity: 0.75; }
        .notification-item:hover { background: #f8fafc; }
        .notif-count.unread-badge { background: #ef4444; }
        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
          margin-left: auto;
        }

        .notif-icon {
          font-size: 1.25rem;
          margin-top: 2px;
        }

        .notif-icon.critical { color: #ef4444; }
        .notif-icon.success { color: #22c55e; }
        .notif-icon.info { color: #3b82f6; }
        .notif-icon.assignment { color: #0ea5e9; }

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
          .stats-grid-3 { grid-template-columns: repeat(2, 1fr); }
          .dashboard-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .stats-grid-3 { grid-template-columns: 1fr; }
        }

        /* Notifications Modal */
        .notif-modal-overlay {
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

        .notif-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }

        .notif-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .notif-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .notif-modal-header .unread-count {
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-weight: 500;
        }

        .notif-modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .notif-modal-close:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .notif-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }

        .notif-modal-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .notif-modal-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notif-modal-item:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .notif-modal-item.read {
          opacity: 0.6;
          background: #f8fafc;
        }

        .notif-modal-item .notif-icon {
          font-size: 1.25rem;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .notif-modal-item .notif-content {
          flex: 1;
        }

        .notif-modal-item .notif-message {
          font-size: 0.9rem;
          color: #1e293b;
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        .notif-modal-item .notif-time {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .notif-modal-item .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .notif-modal-empty {
          text-align: center;
          padding: 3rem 1rem;
          color: #94a3b8;
        }

        .notif-modal-empty svg {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
      `}</style>

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="notif-modal-overlay" onClick={() => setShowNotifModal(false)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3>
                <FiBell /> All Notifications
                {allUnreadCount > 0 && <span className="unread-count">{allUnreadCount} unread</span>}
              </h3>
              <button className="notif-modal-close" onClick={() => setShowNotifModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="notif-modal-body">
              {allNotifications.length === 0 ? (
                <div className="notif-modal-empty">
                  <FiBell />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="notif-modal-list">
                  {allNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`notif-modal-item ${notif.read ? 'read' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {getNotificationIcon(notif.type)}
                      <div className="notif-content">
                        <p className="notif-message">{notif.message}</p>
                        <span className="notif-time">{formatTime(notif.createdAt)}</span>
                      </div>
                      {!notif.read && <span className="unread-dot" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default NurseDashboard;
