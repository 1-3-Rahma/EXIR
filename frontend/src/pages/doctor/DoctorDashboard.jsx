import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { doctorAPI, tasksAPI } from '../../services/api';
import { FiUsers, FiAlertTriangle, FiClipboard, FiPlus, FiEdit, FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const DoctorDashboard = () => {
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

  useEffect(() => {
    fetchDashboardData();
    loadNotes();
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
        <h1>Dashboard</h1>
        <p>Welcome back, Dr. {user?.fullName || 'Doctor'}</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title="Critical Cases"
          value={stats.criticalCases}
          icon={FiAlertTriangle}
          color="red"
          trend="critical"
        />
        <StatCard
          title="Nurses on Duty"
          value={stats.nursesOnDuty}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={FiClipboard}
          color="orange"
          trend="critical"
        />
      </div>

      <div className="dashboard-grid">
        <div className="notes-section">
          <div className="notes-header">
            <h2>Notes</h2>
            <FiClipboard />
          </div>
          <div className="notes-body">
            <textarea
              className="notes-input"
              placeholder="Write a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button className="save-note-btn" onClick={saveNote}>
              Save Note
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
    </Layout>
  );
};

export default DoctorDashboard;
