import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI } from '../../services/api';
import { FiFileText, FiCalendar, FiUser, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const PatientHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await patientAPI.getMedicalHistory();
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medical History</h1>
        <p>View your complete medical history across all visits</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading medical history...</p>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <FiFileText className="empty-icon" />
              <h3>No Medical History</h3>
              <p>Your medical history will appear here after your first visit</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((record) => (
                <div key={record._id} className="history-item">
                  <div
                    className="history-header"
                    onClick={() => toggleExpand(record._id)}
                  >
                    <div className="history-date">
                      <FiCalendar />
                      <span>{formatDate(record.visitDate)}</span>
                    </div>
                    <div className="history-summary">
                      <span className="diagnosis">{record.diagnosis || 'General Checkup'}</span>
                      <span className="doctor">
                        <FiUser /> {record.doctorName || 'Dr. Unknown'}
                      </span>
                    </div>
                    {expandedId === record._id ? <FiChevronUp /> : <FiChevronDown />}
                  </div>

                  {expandedId === record._id && (
                    <div className="history-details">
                      <div className="detail-section">
                        <h4>Diagnosis</h4>
                        <p>{record.diagnosis || 'N/A'}</p>
                      </div>
                      <div className="detail-section">
                        <h4>Treatment Plan</h4>
                        <p>{record.treatmentPlan || 'N/A'}</p>
                      </div>
                      <div className="detail-section">
                        <h4>Prescribed Medications</h4>
                        <ul>
                          {record.medications?.length > 0 ? (
                            record.medications.map((med, i) => (
                              <li key={i}>{med}</li>
                            ))
                          ) : (
                            <li>No medications prescribed</li>
                          )}
                        </ul>
                      </div>
                      <div className="detail-section">
                        <h4>Notes</h4>
                        <p>{record.notes || 'No additional notes'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .history-item {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .history-header {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .history-header:hover {
          background: var(--bg-light);
        }
        .history-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 180px;
          color: var(--accent-blue);
          font-weight: 500;
        }
        .history-summary {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .diagnosis {
          font-weight: 500;
        }
        .doctor {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .history-details {
          padding: 1.25rem;
          background: var(--bg-light);
          border-top: 1px solid var(--border-color);
        }
        .detail-section {
          margin-bottom: 1rem;
        }
        .detail-section:last-child {
          margin-bottom: 0;
        }
        .detail-section h4 {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }
        .detail-section p {
          font-size: 0.9rem;
        }
        .detail-section ul {
          list-style: disc;
          margin-left: 1.25rem;
          font-size: 0.9rem;
        }
        .detail-section li {
          margin-bottom: 0.25rem;
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

export default PatientHistory;
