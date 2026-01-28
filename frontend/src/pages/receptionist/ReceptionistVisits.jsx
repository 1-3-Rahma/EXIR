import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI, visitAPI } from '../../services/api';
import { FiSearch, FiClock, FiCheckCircle, FiUser, FiCalendar } from 'react-icons/fi';

const ReceptionistVisits = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const patientRes = await receptionistAPI.searchPatient(searchTerm);
      const patient = patientRes.data;
      setPatientInfo(patient);

      const visitsRes = await receptionistAPI.getPatientVisits(patient._id);
      setVisits(visitsRes.data);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisits([]);
      setPatientInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Visit History</h1>
        <p>Search and manage patient visits</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patient by National ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {patientInfo && (
        <div className="patient-header">
          <div className="patient-avatar">
            <FiUser />
          </div>
          <div className="patient-details">
            <h2>{patientInfo.fullName}</h2>
            <p>National ID: {patientInfo.nationalID}</p>
          </div>
          <button className="start-visit-btn">
            <FiCalendar /> Start New Visit
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading visits...</p>
          ) : visits.length === 0 ? (
            <div className="empty-state">
              <FiClock className="empty-icon" />
              <h3>{patientInfo ? 'No Visit History' : 'Search for Patient'}</h3>
              <p>{patientInfo ? 'This patient has no recorded visits' : 'Enter a National ID to view visit history'}</p>
            </div>
          ) : (
            <div className="visits-timeline">
              {visits.map((visit, index) => (
                <div key={visit.visitId || index} className="visit-item">
                  <div className="visit-marker">
                    <div className={`marker-dot ${visit.status === 'active' ? 'active' : ''}`} />
                    {index < visits.length - 1 && <div className="marker-line" />}
                  </div>
                  <div className="visit-content">
                    <div className="visit-header">
                      <span className="visit-date">
                        <FiCalendar /> {formatDate(visit.admissionDate)}
                      </span>
                      <span className={`visit-status ${visit.status}`}>
                        {visit.status === 'active' ? (
                          <><FiClock /> Active</>
                        ) : (
                          <><FiCheckCircle /> Completed</>
                        )}
                      </span>
                    </div>
                    <div className="visit-details">
                      <p>
                        <strong>Admission:</strong> {formatDate(visit.admissionDate)}
                      </p>
                      {visit.dischargeDate && (
                        <p>
                          <strong>Discharge:</strong> {formatDate(visit.dischargeDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .search-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .search-section .search-input-wrapper {
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
        }
        .patient-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--bg-white);
          padding: 1.25rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
        }
        .patient-avatar {
          width: 56px;
          height: 56px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: var(--text-secondary);
        }
        .patient-details {
          flex: 1;
        }
        .patient-details h2 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .patient-details p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .start-visit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent-green);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .visits-timeline {
          position: relative;
        }
        .visit-item {
          display: flex;
          gap: 1rem;
        }
        .visit-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
        }
        .marker-dot {
          width: 12px;
          height: 12px;
          background: var(--border-color);
          border-radius: 50%;
          border: 3px solid var(--bg-white);
          box-shadow: 0 0 0 2px var(--border-color);
        }
        .marker-dot.active {
          background: var(--accent-green);
          box-shadow: 0 0 0 2px var(--accent-green);
        }
        .marker-line {
          width: 2px;
          flex: 1;
          background: var(--border-color);
          margin: 4px 0;
        }
        .visit-content {
          flex: 1;
          padding-bottom: 1.5rem;
        }
        .visit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .visit-date {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .visit-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
        }
        .visit-status.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .visit-status.completed {
          background: rgba(100, 116, 139, 0.1);
          color: var(--text-secondary);
        }
        .visit-details {
          background: var(--bg-light);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
        }
        .visit-details p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }
        .visit-details p:last-child {
          margin-bottom: 0;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistVisits;
