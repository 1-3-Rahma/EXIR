import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import { receptionistAPI } from '../../services/api';
import {
  FiUsers, FiAlertCircle, FiDollarSign, FiCalendar, FiSearch,
  FiPlus, FiUserPlus, FiClock, FiCheckCircle, FiLoader
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    pendingArrivals: 0,
    outstandingBills: 0,
    appointmentsToday: 0
  });
  const [searchTab, setSearchTab] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [todayArrivals, setTodayArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [arrivalsRes, statsRes] = await Promise.all([
        receptionistAPI.getTodayArrivals().catch(() => ({ data: [] })),
        receptionistAPI.getDashboardStats().catch(() => ({ data: {} }))
      ]);

      setTodayArrivals(arrivalsRes.data || []);
      setStats({
        todayCheckIns: statsRes.data?.todayCheckIns ,
        pendingArrivals: statsRes.data?.pendingArrivals ,
        outstandingBills: statsRes.data?.outstandingBills ,
        appointmentsToday: statsRes.data?.appointmentsToday 
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      let response;
      switch (searchTab) {
        case 'nationalID':
          response = await receptionistAPI.searchPatient(searchTerm);
          break;
        case 'phone':
          response = await receptionistAPI.searchByPhone(searchTerm);
          break;
        default:
          response = await receptionistAPI.searchByName(searchTerm);
      }
      setSearchResults(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePatientClick = (patientId) => {
    navigate(`/receptionist/patients/${patientId}`);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'checked-in': return 'green';
      case 'waiting': return 'orange';
      case 'completed': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <div className="header-with-date">
          <div>
            <h1>Hospital Management System</h1>
          </div>
          <div className="header-date">
            <span className="role-badge">Receptionist</span>
            <span className="date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="Today's Check-ins"
          value={stats.todayCheckIns}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title="Pending Arrivals"
          value={stats.pendingArrivals}
          icon={FiClock}
          color="orange"
        />
        <StatCard
          title="Outstanding Bills"
          value={`$${stats.outstandingBills.toLocaleString()}`}
          icon={FiDollarSign}
          color="green"
        />
        <StatCard
          title="Appointments Today"
          value={stats.appointmentsToday}
          icon={FiCalendar}
          color="cyan"
        />
      </div>

      {/* Quick Actions */}
      <div className="card quick-actions-section">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="quick-actions-grid">
            <Link to="/receptionist/patients/register" className="quick-action-card purple">
              <FiUserPlus className="action-icon" />
              <span>Register New Patient</span>
            </Link>
            <Link to="/receptionist/checkin" className="quick-action-card cyan">
              <FiCheckCircle className="action-icon" />
              <span>Check-in Arrivals</span>
            </Link>
            <Link to="/receptionist/appointments/new" className="quick-action-card orange">
              <FiCalendar className="action-icon" />
              <span>Schedule Appointment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Patient Search */}
      <div className="search-section">
        <div className="search-header">
          <FiSearch />
          <h2>Quick Patient Search</h2>
        </div>
        <div className="search-tabs">
          <button
            className={`search-tab ${searchTab === 'name' ? 'active' : ''}`}
            onClick={() => { setSearchTab('name'); setSearchResults([]); }}
          >
            By Name
          </button>
          <button
            className={`search-tab ${searchTab === 'phone' ? 'active' : ''}`}
            onClick={() => { setSearchTab('phone'); setSearchResults([]); }}
          >
            By Phone
          </button>
          <button
            className={`search-tab ${searchTab === 'nationalID' ? 'active' : ''}`}
            onClick={() => { setSearchTab('nationalID'); setSearchResults([]); }}
          >
            By National ID
          </button>
        </div>
        <div className="search-input-row">
          <div className="search-input-wrapper">
            <FiSearch />
            <input
              type="text"
              placeholder={`Search patient by ${searchTab === 'nationalID' ? 'National ID' : searchTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="search-btn" onClick={handleSearch} disabled={searching}>
            {searching ? <FiLoader className="spin" /> : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((patient) => (
              <div
                key={patient._id}
                className="search-result-item"
                onClick={() => handlePatientClick(patient._id)}
              >
                <div className="result-avatar">
                  {patient.fullName?.charAt(0) || 'P'}
                </div>
                <div className="result-info">
                  <span className="result-name">{patient.fullName}</span>
                  <span className="result-details">
                    ID: {patient.nationalID} | Phone: {patient.phone || 'N/A'}
                  </span>
                </div>
                <FiCheckCircle className="result-action" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Arrivals */}
      <div className="card arrivals-section">
        <div className="card-header">
          <h2>
            <FiClock /> Today's Arrivals
          </h2>
          <Link to="/receptionist/arrivals" className="view-all">
            View All →
          </Link>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading arrivals...</div>
          ) : todayArrivals.length === 0 ? (
            <div className="empty-arrivals">
              <FiUsers className="empty-icon" />
              <p>No arrivals scheduled for today</p>
            </div>
          ) : (
            <div className="arrivals-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayArrivals.slice(0, 5).map((arrival, index) => (
                    <tr key={arrival._id || index}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar-sm">
                            {arrival.patientName?.charAt(0) || 'P'}
                          </div>
                          <span>{arrival.patientName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{arrival.time || '09:00 AM'}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(arrival.status)}`}>
                          {arrival.status || 'Waiting'}
                        </span>
                      </td>
                      <td>
                        {arrival.status !== 'Checked-in' && (
                          <button className="checkin-btn">Check In</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .header-with-date {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-date {
          text-align: right;
        }
        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .header-date .date {
          display: block;
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }
        .quick-actions-section {
          margin-bottom: 1.5rem;
        }
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .quick-action-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          color: white;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          transition: transform 0.2s, opacity 0.2s;
          text-align: center;
        }
        .quick-action-card:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        .quick-action-card.purple {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }
        .quick-action-card.cyan {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
        }
        .quick-action-card.orange {
          background: linear-gradient(135deg, #f97316, #ea580c);
        }
        .quick-action-card .action-icon {
          font-size: 2rem;
        }
        .quick-action-card span {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .search-section {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
        }
        .search-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .search-header h2 {
          font-size: 1rem;
          font-weight: 600;
        }
        .search-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .search-tab {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          background: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .search-tab:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .search-tab.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
        }
        .search-input-row {
          display: flex;
          gap: 1rem;
        }
        .search-input-row .search-input-wrapper {
          flex: 1;
        }
        .search-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0 1.5rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .search-btn:disabled {
          opacity: 0.7;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .search-results {
          margin-top: 1rem;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }
        .search-result-item:hover {
          background: var(--bg-light);
        }
        .result-avatar {
          width: 40px;
          height: 40px;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .result-info {
          flex: 1;
        }
        .result-name {
          display: block;
          font-weight: 500;
        }
        .result-details {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .result-action {
          color: var(--accent-green);
          font-size: 1.25rem;
        }
        .arrivals-section {
          margin-bottom: 1.5rem;
        }
        .arrivals-table {
          overflow-x: auto;
        }
        .arrivals-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .arrivals-table th,
        .arrivals-table td {
          padding: 0.875rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .arrivals-table th {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .patient-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .patient-avatar-sm {
          width: 32px;
          height: 32px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .status-badge.green {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-badge.orange {
          background: rgba(249, 115, 22, 0.1);
          color: var(--accent-orange);
        }
        .status-badge.blue {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .status-badge.gray {
          background: var(--bg-light);
          color: var(--text-secondary);
        }
        .checkin-btn {
          background: var(--accent-green);
          color: white;
          border: none;
          padding: 0.375rem 0.875rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .checkin-btn:hover {
          opacity: 0.9;
        }
        .empty-arrivals {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        .empty-arrivals .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .loading-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
          .search-input-row {
            flex-direction: column;
          }
          .search-btn {
            width: 100%;
            justify-content: center;
            padding: 0.75rem;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistDashboard;
