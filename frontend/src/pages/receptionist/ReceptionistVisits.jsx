import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { visitAPI } from '../../services/api';
import { FiSearch, FiClock, FiUser, FiCalendar, FiPhone, FiCreditCard } from 'react-icons/fi';

const ReceptionistVisits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [allVisits, setAllVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveVisits();
  }, []);

  const fetchActiveVisits = async () => {
    try {
      setLoading(true);
      const response = await visitAPI.getActiveVisits();
      setAllVisits(response.data || []);
    } catch (error) {
      console.error('Error fetching active visits:', error);
      setAllVisits([]);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic filtering based on search term
  const filteredVisits = useMemo(() => {
    if (!searchTerm.trim()) {
      return allVisits;
    }

    const term = searchTerm.toLowerCase().trim();
    return allVisits.filter(visit => {
      const patient = visit.patientId;
      if (!patient) return false;

      const fullName = (patient.fullName || '').toLowerCase();
      const nationalID = (patient.nationalID || '').toLowerCase();
      const phone = (patient.phone || '').toLowerCase();

      return fullName.includes(term) ||
             nationalID.includes(term) ||
             phone.includes(term);
    });
  }, [allVisits, searchTerm]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSinceAdmission = (admissionDate) => {
    const now = new Date();
    const admission = new Date(admissionDate);
    const diffMs = now - admission;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
  };

  const handlePatientClick = (patientId) => {
    navigate(`/receptionist/patients/${patientId}`);
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Active Visits</h1>
        <p>Currently admitted patients in the hospital</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, National ID, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="stats-badge">
          <FiUser /> {filteredVisits.length} Active Visit{filteredVisits.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="visits-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading active visits...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="empty-state">
            <FiClock className="empty-icon" />
            <h3>{searchTerm ? 'No Matching Visits' : 'No Active Visits'}</h3>
            <p>
              {searchTerm
                ? 'Try a different search term'
                : 'There are currently no patients admitted in the hospital'}
            </p>
          </div>
        ) : (
          <div className="visits-grid">
            {filteredVisits.map((visit) => (
              <div
                key={visit._id}
                className="visit-card"
                onClick={() => handlePatientClick(visit.patientId?._id)}
              >
                <div className="visit-card-header">
                  <div className="patient-avatar">
                    {visit.patientId?.fullName?.charAt(0) || 'P'}
                  </div>
                  <div className="patient-info">
                    <h3>{visit.patientId?.fullName || 'Unknown Patient'}</h3>
                    <span className="admission-time">
                      <FiClock /> Admitted {getTimeSinceAdmission(visit.admissionDate)}
                    </span>
                  </div>
                  <div className="status-indicator">
                    <span className="pulse"></span>
                    Active
                  </div>
                </div>

                <div className="visit-card-body">
                  <div className="info-row">
                    <FiCreditCard />
                    <span className="label">National ID:</span>
                    <span className="value">{visit.patientId?.nationalID || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <FiPhone />
                    <span className="label">Phone:</span>
                    <span className="value">{visit.patientId?.phone || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <FiCalendar />
                    <span className="label">Admission:</span>
                    <span className="value">
                      {formatDate(visit.admissionDate)} at {formatTime(visit.admissionDate)}
                    </span>
                  </div>
                </div>

                <div className="visit-card-footer">
                  <button className="view-profile-btn">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .search-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
        }
        .search-section .search-input-wrapper {
          flex: 1;
        }
        .stats-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .visits-container {
          min-height: 400px;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-muted);
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        .empty-icon {
          font-size: 3.5rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .empty-state h3 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .visits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.25rem;
        }
        .visit-card {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .visit-card:hover {
          border-color: var(--accent-blue);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
          transform: translateY(-2px);
        }
        .visit-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
          border-bottom: 1px solid var(--border-color);
        }
        .patient-avatar {
          width: 48px;
          height: 48px;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        .patient-info {
          flex: 1;
          min-width: 0;
        }
        .patient-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admission-time {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
          flex-shrink: 0;
        }
        .pulse {
          width: 8px;
          height: 8px;
          background: var(--accent-green);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .visit-card-body {
          padding: 1.25rem;
        }
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-row svg {
          color: var(--text-muted);
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .info-row .label {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .info-row .value {
          color: var(--text-primary);
          font-weight: 500;
          margin-left: auto;
          text-align: right;
        }
        .visit-card-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-light);
        }
        .view-profile-btn {
          width: 100%;
          padding: 0.625rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .view-profile-btn:hover {
          background: var(--primary-blue);
        }

        @media (max-width: 768px) {
          .search-section {
            flex-direction: column;
          }
          .stats-badge {
            width: 100%;
            justify-content: center;
          }
          .visits-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistVisits;
