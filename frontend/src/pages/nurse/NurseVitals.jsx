import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { nurseAPI } from '../../services/api';
import { FiHeart, FiThermometer, FiDroplet, FiActivity } from 'react-icons/fi';

const NurseVitals = () => {
  const [vitalsOverview, setVitalsOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVitals();
  }, []);

  const fetchVitals = async () => {
    try {
      const response = await nurseAPI.getVitalsOverview();
      setVitalsOverview(response.data);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVitalStatus = (vital) => {
    if (vital.isCritical) return 'critical';
    return 'normal';
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Vitals Overview</h1>
        <p>Monitor patient vitals in real-time</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading vitals...</p>
          ) : vitalsOverview.length === 0 ? (
            <p className="no-notifications">No vitals data available</p>
          ) : (
            <div className="vitals-grid">
              {vitalsOverview.map((patient) => (
                <div key={patient._id} className="vitals-card">
                  <div className="vitals-header">
                    <h3>{patient.patientName}</h3>
                    <span className={`room-badge ${patient.hasCritical ? '' : 'blue'}`}>
                      Room {patient.room || 'N/A'}
                    </span>
                  </div>
                  <div className="vitals-data">
                    <div className={`vital-item ${patient.vitals?.heartRate > 120 || patient.vitals?.heartRate < 50 ? 'critical' : ''}`}>
                      <FiHeart className="vital-icon" />
                      <div className="vital-info">
                        <span className="vital-value">{patient.vitals?.heartRate || '--'}</span>
                        <span className="vital-label">BPM</span>
                      </div>
                    </div>
                    <div className={`vital-item ${patient.vitals?.spo2 < 90 ? 'critical' : ''}`}>
                      <FiDroplet className="vital-icon" />
                      <div className="vital-info">
                        <span className="vital-value">{patient.vitals?.spo2 || '--'}%</span>
                        <span className="vital-label">SpO2</span>
                      </div>
                    </div>
                    <div className={`vital-item ${patient.vitals?.temperature > 39 || patient.vitals?.temperature < 35 ? 'critical' : ''}`}>
                      <FiThermometer className="vital-icon" />
                      <div className="vital-info">
                        <span className="vital-value">{patient.vitals?.temperature || '--'}°C</span>
                        <span className="vital-label">Temp</span>
                      </div>
                    </div>
                  </div>
                  <div className="vitals-footer">
                    <span className="last-updated">
                      Last updated: {patient.vitals?.lastUpdated ? new Date(patient.vitals.lastUpdated).toLocaleTimeString() : 'N/A'}
                    </span>
                    <button className="update-btn">Update Vitals</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .vitals-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          transition: all 0.2s;
        }
        .vitals-card:hover {
          box-shadow: var(--shadow-md);
        }
        .vitals-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .vitals-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .vitals-data {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .vital-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
        }
        .vital-item.critical {
          background: rgba(239, 68, 68, 0.1);
        }
        .vital-item.critical .vital-icon,
        .vital-item.critical .vital-value {
          color: var(--accent-red);
        }
        .vital-icon {
          font-size: 1.25rem;
          color: var(--accent-blue);
        }
        .vital-info {
          display: flex;
          flex-direction: column;
        }
        .vital-value {
          font-weight: 600;
          font-size: 1rem;
        }
        .vital-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .vitals-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }
        .last-updated {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .update-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .update-btn:hover {
          background: var(--primary-blue);
        }
      `}</style>
    </Layout>
  );
};

export default NurseVitals;
