import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { nurseAPI } from '../../services/api';
import { FiSearch, FiUser, FiActivity, FiAlertCircle } from 'react-icons/fi';

const NursePatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await nurseAPI.getAssignedPatients();
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nationalID?.includes(searchTerm)
  );

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>My Patients</h1>
        <p>View and manage your assigned patients</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patients by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading patients...</p>
          ) : filteredPatients.length === 0 ? (
            <p className="no-notifications">No patients found</p>
          ) : (
            <div className="patient-list">
              {filteredPatients.map((patient) => (
                <div key={patient._id} className="patient-card">
                  <div className="patient-avatar">
                    <FiUser />
                  </div>
                  <div className="patient-info">
                    <h3>{patient.fullName}</h3>
                    <p>ID: {patient.nationalID}</p>
                    <p>Room: {patient.room || 'N/A'}</p>
                  </div>
                  <div className="patient-status">
                    {patient.hasCriticalVitals ? (
                      <span className="status-badge critical">
                        <FiAlertCircle /> Critical
                      </span>
                    ) : (
                      <span className="status-badge stable">
                        <FiActivity /> Stable
                      </span>
                    )}
                  </div>
                  <button className="view-btn">View Details</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .patient-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .patient-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }
        .patient-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .patient-avatar {
          width: 48px;
          height: 48px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--text-secondary);
        }
        .patient-info {
          flex: 1;
        }
        .patient-info h3 {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .patient-info p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .status-badge.critical {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .status-badge.stable {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .view-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .view-btn:hover {
          background: var(--primary-blue);
        }
      `}</style>
    </Layout>
  );
};

export default NursePatients;
