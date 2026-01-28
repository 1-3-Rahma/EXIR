import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { doctorAPI } from '../../services/api';
import { FiUser, FiClock, FiCheckCircle } from 'react-icons/fi';

const DoctorNurses = () => {
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchNurses();
  }, []);

  const fetchNurses = async () => {
    try {
      const response = await doctorAPI.getNursesOnShift();
      setNurses(response.data);
    } catch (error) {
      console.error('Failed to fetch nurses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout appName="Doctor's Hospital" role="doctor">
      <div className="page-header">
        <h1>Nurses on Duty</h1>
        <p>View and assign nurses to patients</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading nurses...</p>
          ) : nurses.length === 0 ? (
            <p className="no-notifications">No nurses currently on shift</p>
          ) : (
            <div className="nurse-grid">
              {nurses.map((nurse) => (
                <div key={nurse._id} className="nurse-card">
                  <div className="nurse-avatar">
                    <FiUser />
                  </div>
                  <div className="nurse-info">
                    <h3>{nurse.fullName}</h3>
                    <p className="nurse-id">ID: {nurse.identifier}</p>
                    <div className="nurse-meta">
                      <span><FiClock /> {nurse.shift}</span>
                      <span className="patients-count">
                        {nurse.assignedPatientsCount || 0} patients
                      </span>
                    </div>
                  </div>
                  <div className="nurse-status">
                    <span className={`status-indicator ${nurse.isActive ? 'active' : ''}`}>
                      <FiCheckCircle />
                      {nurse.isActive ? 'On Duty' : 'Off Duty'}
                    </span>
                  </div>
                  <button
                    className="assign-btn"
                    onClick={() => {
                      setSelectedNurse(nurse);
                      setShowAssignModal(true);
                    }}
                  >
                    Assign Patient
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .nurse-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .nurse-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.2s;
        }
        .nurse-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .nurse-avatar {
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
        .nurse-info h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .nurse-id {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .nurse-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .nurse-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .patients-count {
          color: var(--accent-blue);
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .status-indicator.active {
          color: var(--accent-green);
        }
        .assign-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .assign-btn:hover {
          background: var(--primary-blue);
        }
      `}</style>
    </Layout>
  );
};

export default DoctorNurses;
