import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import NotificationPanel from '../../components/common/NotificationPanel';
import { useAuth } from '../../context/AuthContext';
import { nurseAPI } from '../../services/api';
import { FiUsers, FiAlertTriangle, FiClipboard, FiCalendar, FiClock, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const NurseDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    urgentCases: 0,
    tasksToday: 0,
    appointments: 0
  });
  const [criticalEvents, setCriticalEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, criticalRes] = await Promise.all([
        nurseAPI.getAssignedPatients(),
        nurseAPI.getCriticalEvents()
      ]);

      const patients = patientsRes.data;
      const critical = criticalRes.data;

      setStats({
        totalPatients: patients.length,
        urgentCases: critical.length,
        tasksToday: 12,
        appointments: 8
      });

      setCriticalEvents(critical.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
    return `${hours} hours ago`;
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user?.fullName || 'Nurse'}! Here's your shift summary.</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title="Urgent Cases"
          value={stats.urgentCases}
          icon={FiAlertTriangle}
          color="red"
          trend={stats.urgentCases > 0 ? 'critical' : null}
        />
        <StatCard
          title="Tasks Today"
          value={stats.tasksToday}
          icon={FiClipboard}
          color="green"
        />
        <StatCard
          title="Appointments"
          value={stats.appointments}
          icon={FiCalendar}
          color="orange"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>
              <FiAlertTriangle />
              Urgent Cases / Priority Alerts
            </h2>
            <Link to="/nurse/critical" className="view-all">
              View All <FiArrowRight />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <p>Loading...</p>
            ) : criticalEvents.length === 0 ? (
              <p className="no-notifications">No urgent cases at the moment</p>
            ) : (
              <div className="alert-list">
                {criticalEvents.map((event, index) => (
                  <div key={event._id || index} className="alert-card">
                    <div className="alert-info">
                      <div className="alert-patient">
                        {event.patientName || `Patient ${index + 1}`}
                        <span className={`room-badge ${index % 2 === 0 ? '' : 'orange'}`}>
                          Room {event.room || `${300 + index}A`}
                        </span>
                      </div>
                      <span className="alert-reason">{event.reason || event.message}</span>
                      <span className="alert-time">
                        <FiClock /> {formatTime(event.createdAt)}
                      </span>
                    </div>
                    <button className="respond-btn">Respond</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <NotificationPanel limit={4} />
      </div>
    </Layout>
  );
};

export default NurseDashboard;
