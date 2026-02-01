import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import { receptionistAPI } from '../../services/api';
import {
  FiUsers, FiAlertCircle, FiDollarSign, FiCalendar, FiSearch,
  FiPlus, FiUserPlus, FiClock, FiCheckCircle, FiLoader, FiX
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
  const [showArrivalsModal, setShowArrivalsModal] = useState(false);

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

  // Dynamic search function
  const performSearch = useCallback(async (term, tab) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      let response;
      switch (tab) {
        case 'nationalID':
          response = await receptionistAPI.searchPatient(term);
          break;
        case 'phone':
          response = await receptionistAPI.searchByPhone(term);
          break;
        default:
          response = await receptionistAPI.searchByName(term);
      }
      setSearchResults(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search effect - triggers search as user types
  useEffect(() => {
    // Clear results if search term is empty
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce: wait 300ms after user stops typing before searching
    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm, searchTab);
    }, 300);

    // Cleanup: cancel the timer if user types again before 300ms
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchTab, performSearch]);

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
            onClick={() => setSearchTab('name')}
          >
            By Name
          </button>
          <button
            className={`search-tab ${searchTab === 'phone' ? 'active' : ''}`}
            onClick={() => setSearchTab('phone')}
          >
            By Phone
          </button>
          <button
            className={`search-tab ${searchTab === 'nationalID' ? 'active' : ''}`}
            onClick={() => setSearchTab('nationalID')}
          >
            By National ID
          </button>
        </div>
        <div className="search-input-row">
          <div className="search-input-wrapper full-width">
            <FiSearch />
            <input
              type="text"
              placeholder={`Start typing to search by ${searchTab === 'nationalID' ? 'National ID' : searchTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {searching && <FiLoader className="search-loader spin" />}
          </div>
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
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading arrivals...</div>
          ) : todayArrivals.length === 0 ? (
            <div className="empty-arrivals">
              <FiUsers className="empty-icon" />
              <p>No arrivals today</p>
            </div>
          ) : (
            <div className="arrivals-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {todayArrivals.slice(0, 5).map((arrival, index) => (
                    <tr key={arrival._id || index}>
                      <td>
                        <div
                          className="patient-cell clickable"
                          onClick={() => navigate(`/receptionist/patients/${arrival.patientId}`)}
                        >
                          <div className="patient-avatar-sm">
                            {arrival.patientName?.charAt(0) || 'P'}
                          </div>
                          <span className="patient-name-link">{arrival.patientName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{arrival.registrationTime ? new Date(arrival.registrationTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todayArrivals.length > 5 && (
                <div className="view-more-row">
                  <button className="view-more-btn" onClick={() => setShowArrivalsModal(true)}>
                    View More ({todayArrivals.length - 5} more)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Arrivals Modal */}
      {showArrivalsModal && (
        <div className="modal-overlay" onClick={() => setShowArrivalsModal(false)}>
          <div className="modal-content arrivals-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiClock /> Today's Arrivals</h3>
              <button className="modal-close" onClick={() => setShowArrivalsModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {todayArrivals.length === 0 ? (
                <div className="empty-arrivals">
                  <FiUsers className="empty-icon" />
                  <p>No arrivals today</p>
                </div>
              ) : (
                <div className="arrivals-list">
                  {todayArrivals.map((arrival, index) => (
                    <div
                      key={arrival._id || index}
                      className="arrival-item"
                      onClick={() => {
                        navigate(`/receptionist/patients/${arrival.patientId}`);
                        setShowArrivalsModal(false);
                      }}
                    >
                      <div className="arrival-avatar">
                        {arrival.patientName?.charAt(0) || 'P'}
                      </div>
                      <div className="arrival-info">
                        <span className="arrival-name">{arrival.patientName || 'Unknown'}</span>
                        <span className="arrival-time">
                          Registered: {arrival.registrationTime ? new Date(arrival.registrationTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span className="total-count">{todayArrivals.length} arrival(s) today</span>
            </div>
          </div>
        </div>
      )}

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
          grid-template-columns: repeat(2, 1fr);
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
          position: relative;
        }
        .search-input-row .search-input-wrapper.full-width {
          width: 100%;
        }
        .search-input-wrapper input {
          padding-right: 2.5rem;
        }
        .search-loader {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--accent-blue);
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
        .patient-cell.clickable {
          cursor: pointer;
          padding: 0.25rem;
          margin: -0.25rem;
          border-radius: var(--radius-md);
          transition: background 0.2s;
        }
        .patient-cell.clickable:hover {
          background: var(--bg-light);
        }
        .patient-cell.clickable:hover .patient-name-link {
          color: var(--accent-blue);
        }
        .patient-name-link {
          transition: color 0.2s;
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
        .arrivals-section .card-header {
          display: flex;
          align-items: center;
        }
        .arrivals-section .card-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }
        .view-more-row {
          display: flex;
          justify-content: flex-end;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-color);
        }
        .view-more-btn {
          background: none;
          border: none;
          color: var(--accent-blue);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          transition: background 0.2s, color 0.2s;
          font-weight: 500;
        }
        .view-more-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          color: #1d4ed8;
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
        .modal-content {
          background: white;
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .modal-close:hover {
          background: var(--bg-light);
          color: var(--text-primary);
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }
        .arrivals-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .arrival-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .arrival-item:hover {
          background: #e2e8f0;
          transform: translateX(4px);
        }
        .arrival-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .arrival-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .arrival-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .arrival-time {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .status-pill {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-pill.pending {
          background: rgba(249, 115, 22, 0.1);
          color: #ea580c;
        }
        .status-pill.checked-in {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        }
        .status-pill.completed {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        }
        .status-pill.cancelled {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          text-align: center;
        }
        .total-count {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        @media (max-width: 768px) {
          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
          .search-tabs {
            flex-wrap: wrap;
          }
          .modal-content {
            max-height: 90vh;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistDashboard;
