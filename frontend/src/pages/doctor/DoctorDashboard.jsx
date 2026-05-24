import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { doctorAPI, tasksAPI, notificationAPI } from '../../services/api';
import { FiUsers, FiAlertTriangle, FiClipboard, FiEdit, FiCalendar, FiBell } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const DoctorDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    criticalCases: 0,
    nursesOnDuty: 0,
    pendingTasks: 0
  });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    loadNotes();
    fetchNotifications();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, nursesRes, tasksRes, criticalRes] = await Promise.all([
        doctorAPI.getPatients(),
        doctorAPI.getNursesOnShift(),
        tasksAPI.getTasks().catch(() => ({ data: [] })),
        doctorAPI.getCriticalCases().catch(() => ({ data: [] }))
      ]);

      const patients = Array.isArray(patientsRes.data) ? patientsRes.data : [];
      const nurses = Array.isArray(nursesRes.data) ? nursesRes.data : [];
      const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      const criticalCases = Array.isArray(criticalRes.data) ? criticalRes.data : [];
      const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

      setStats({
        totalPatients: patients.length,
        criticalCases: criticalCases.length,
        nursesOnDuty: nurses.length,
        pendingTasks
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const loadNotes = () => {
    const savedNotes = localStorage.getItem('doctorNotes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  };

  const saveNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now(),
      text: newNote,
      date: new Date().toISOString()
    };
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem('doctorNotes', JSON.stringify(updatedNotes));
    setNewNote('');
  };

  return (
    <Layout appName="EXIR" role="doctor">
      <div className="page-header">
        <h1>{t('nav.dashboard')}</h1>
        <p>{t('dashboard.welcomeBack')}, Dr. {user?.fullName || t('login.doctor')}</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title={t('dashboard.totalPatients')}
          value={stats.totalPatients}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title={t('dashboard.criticalCases')}
          value={stats.criticalCases}
          icon={FiAlertTriangle}
          color="red"
          trend="critical"
        />
        <StatCard
          title={t('dashboard.nursesOnDuty')}
          value={stats.nursesOnDuty}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title={t('dashboard.pendingTasks')}
          value={stats.pendingTasks}
          icon={FiClipboard}
          color="orange"
          trend="critical"
        />
      </div>

      <div className="dashboard-grid">
        <div className="notes-section">
          <div className="notes-header">
            <h2>{t('dashboard.quickNotes')}</h2>
            <FiClipboard />
          </div>
          <div className="notes-body">
            <textarea
              className="notes-input"
              placeholder={t('dashboard.addNote')}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button className="save-note-btn" onClick={saveNote}>
              {t('dashboard.saveNote')}
            </button>

            {notes.length > 0 && (
              <div className="saved-notes">
                {notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="saved-note">
                    <p>{note.text}</p>
                    <span>{new Date(note.date).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              {/* <Link to="/doctor/patients" className="action-btn primary">
                <div className="action-icon"><FiPlus /></div>
                <div className="action-content">
                  <span>Add New Patient</span>
                  <small>Admit a new patient to the hospital</small>
                </div>
              </Link> */}

              <Link to="/doctor/patients" className="action-btn success">
                <div className="action-icon"><FiEdit /></div>
                <div className="action-content">
                  <span>View Patients</span>
                  <small>View and update patient medications</small>
                </div>
              </Link>

              <Link to="/doctor/nurses" className="action-btn warning">
                <div className="action-icon"><FiCalendar /></div>
                <div className="action-content">
                  <span>View Nursing Staff</span>
                  <small>Check appointments and tasks</small>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiBell />
          <h2 style={{ margin: 0 }}>Notifications</h2>
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="notif-unread-count">{notifications.filter(n => !n.isRead).length} new</span>
          )}
        </div>
        <div className="card-body">
          {notifLoading ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="no-notifications">No notifications yet.</p>
          ) : (
            <div className="notif-list">
              {notifications.map((notif) => (
                <div key={notif._id} className={`notif-item notif-${notif.type} ${notif.isRead ? 'notif-read' : 'notif-unread'}`}>
                  <div className="notif-dot" />
                  <div className="notif-body">
                    <p className="notif-message">{notif.message}</p>
                    <div className="notif-meta">
                      {notif.relatedPatientId?.fullName && (
                        <span className="notif-patient">{notif.relatedPatientId.fullName}</span>
                      )}
                      <span className="notif-time">{new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .notif-unread-count { background: #ef4444; color: white; border-radius: 12px; padding: 0.1rem 0.5rem; font-size: 0.72rem; font-weight: 700; }
        .notif-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .notif-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; border-left: 3px solid transparent; }
        .notif-unread { background: #f8fafc; }
        .notif-read { background: transparent; opacity: 0.7; }
        .notif-critical { border-left-color: #ef4444; }
        .notif-warning { border-left-color: #f59e0b; }
        .notif-update, .notif-assignment { border-left-color: #6366f1; }
        .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; flex-shrink: 0; margin-top: 6px; }
        .notif-unread .notif-dot { background: #6366f1; }
        .notif-critical .notif-dot { background: #ef4444; }
        .notif-warning .notif-dot { background: #f59e0b; }
        .notif-body { flex: 1; }
        .notif-message { margin: 0 0 0.25rem 0; font-size: 0.88rem; color: #334155; }
        .notif-meta { display: flex; gap: 0.75rem; align-items: center; }
        .notif-patient { font-size: 0.75rem; font-weight: 600; color: #6366f1; }
        .notif-time { font-size: 0.72rem; color: #94a3b8; }
      `}</style>
    </Layout>
  );
};

export default DoctorDashboard;
