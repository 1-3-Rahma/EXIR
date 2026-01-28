import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { doctorAPI } from '../../services/api';
import { FiAlertTriangle, FiClock, FiUser, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const DoctorPriorityCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriticalCases();
  }, []);

  const fetchCriticalCases = async () => {
    try {
      const response = await doctorAPI.getCriticalCases();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch critical cases:', error);
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
    <Layout appName="Doctor's Hospital" role="doctor">
      <div className="page-header">
        <h1>Priority Cases</h1>
        <p>Patients requiring urgent attention</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading priority cases...</p>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <FiAlertTriangle className="empty-icon success" />
              <h3>No Priority Cases</h3>
              <p>All patients are currently stable</p>
            </div>
          ) : (
            <div className="priority-list">
              {cases.map((caseItem, index) => (
                <div key={caseItem._id || index} className="priority-card">
                  <div className="priority-indicator" />
                  <div className="priority-avatar">
                    <FiUser />
                  </div>
                  <div className="priority-info">
                    <h3>{caseItem.patientName}</h3>
                    <p className="priority-reason">{caseItem.reason}</p>
                    <div className="priority-meta">
                      <span><FiClock /> {formatTime(caseItem.createdAt)}</span>
                      <span className="room">Room {caseItem.room || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="priority-actions">
                    <span className="severity-badge">
                      {caseItem.severity || 'High'}
                    </span>
                    <Link to={`/doctor/patients`} className="view-link">
                      View Patient <FiArrowRight />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .priority-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .priority-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          position: relative;
          transition: all 0.2s;
        }
        .priority-card:hover {
          box-shadow: var(--shadow-md);
        }
        .priority-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--accent-red);
          border-radius: var(--radius-lg) 0 0 var(--radius-lg);
        }
        .priority-avatar {
          width: 48px;
          height: 48px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red);
          font-size: 1.25rem;
        }
        .priority-info {
          flex: 1;
        }
        .priority-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .priority-reason {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .priority-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .priority-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .room {
          color: var(--accent-blue);
        }
        .priority-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
        }
        .severity-badge {
          padding: 0.375rem 0.75rem;
          background: var(--accent-red);
          color: white;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .view-link {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--accent-blue);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .view-link:hover {
          text-decoration: underline;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--accent-red);
          margin-bottom: 1rem;
        }
        .empty-icon.success {
          color: var(--accent-green);
        }
        .empty-state h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: var(--text-secondary);
        }
      `}</style>
    </Layout>
  );
};

export default DoctorPriorityCases;
