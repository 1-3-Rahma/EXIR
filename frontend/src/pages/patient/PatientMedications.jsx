import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI } from '../../services/api';
import { FiClock, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const PatientMedications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await patientAPI.getMedicalHistory();
      const meds = response.data.flatMap(record =>
        (record.medications || []).map(med => ({
          ...med,
          prescribedDate: record.visitDate,
          doctor: record.doctorName
        }))
      );
      setMedications(meds);
    } catch (error) {
      console.error('Failed to fetch medications:', error);
      // Mock data for demo
      setMedications([
        { name: 'Lisinopril 10mg', dosage: '1 tablet daily', time: 'Morning', status: 'active' },
        { name: 'Metformin 500mg', dosage: '2 tablets daily', time: 'Morning & Evening', status: 'active' },
        { name: 'Aspirin 81mg', dosage: '1 tablet daily', time: 'Morning', status: 'active' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeIcon = (time) => {
    return <FiClock className="time-icon" />;
  };

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medications</h1>
        <p>Your current prescriptions and medication schedule</p>
      </div>

      <div className="med-summary">
        <div className="summary-card">
          <FiCheckCircle className="summary-icon active" />
          <div className="summary-info">
            <span className="summary-value">{medications.filter(m => m.status === 'active').length}</span>
            <span className="summary-label">Active Medications</span>
          </div>
        </div>
        <div className="summary-card">
          <FiClock className="summary-icon morning" />
          <div className="summary-info">
            <span className="summary-value">{medications.filter(m => m.time?.includes('Morning')).length}</span>
            <span className="summary-label">Morning Doses</span>
          </div>
        </div>
        <div className="summary-card">
          <FiClock className="summary-icon evening" />
          <div className="summary-info">
            <span className="summary-value">{medications.filter(m => m.time?.includes('Evening')).length}</span>
            <span className="summary-label">Evening Doses</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Current Prescriptions</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Loading medications...</p>
          ) : medications.length === 0 ? (
            <div className="empty-state">
              <FiInfo className="empty-icon" />
              <h3>No Medications</h3>
              <p>You don't have any active prescriptions</p>
            </div>
          ) : (
            <div className="med-list">
              {medications.map((med, index) => (
                <div key={index} className="med-card">
                  <div className={`med-status ${med.status}`}>
                    {med.status === 'active' ? <FiCheckCircle /> : <FiAlertCircle />}
                  </div>
                  <div className="med-info">
                    <h3>{med.name}</h3>
                    <p className="med-dosage">{med.dosage}</p>
                    <div className="med-schedule">
                      <FiClock />
                      <span>{med.time || 'As needed'}</span>
                    </div>
                  </div>
                  <div className="med-actions">
                    <button className="info-btn">
                      <FiInfo /> Info
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Important Reminders</h2>
        </div>
        <div className="card-body">
          <div className="reminder-list">
            <div className="reminder-item">
              <FiAlertCircle className="reminder-icon" />
              <p>Take medications at the same time each day for best results</p>
            </div>
            <div className="reminder-item">
              <FiInfo className="reminder-icon info" />
              <p>Contact your doctor if you experience any side effects</p>
            </div>
            <div className="reminder-item">
              <FiCheckCircle className="reminder-icon success" />
              <p>Don't stop taking medications without consulting your doctor</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .med-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        .summary-icon {
          font-size: 1.5rem;
        }
        .summary-icon.active { color: var(--accent-green); }
        .summary-icon.morning { color: var(--accent-orange); }
        .summary-icon.evening { color: var(--accent-purple); }
        .summary-info {
          display: flex;
          flex-direction: column;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .summary-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .med-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .med-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }
        .med-card:hover {
          border-color: var(--accent-blue);
        }
        .med-status {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .med-status.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .med-status.inactive {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .med-info {
          flex: 1;
        }
        .med-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .med-dosage {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }
        .med-schedule {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .info-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .info-btn:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .reminder-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .reminder-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
        }
        .reminder-icon {
          font-size: 1.125rem;
          color: var(--accent-orange);
        }
        .reminder-icon.info { color: var(--accent-blue); }
        .reminder-icon.success { color: var(--accent-green); }
        .reminder-item p {
          font-size: 0.9rem;
          color: var(--text-secondary);
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

export default PatientMedications;
