import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/common/Layout';
import { doctorAPI } from '../../services/api';
import { FiUser, FiFileText, FiEdit, FiCheckCircle, FiAlertCircle, FiSearch } from 'react-icons/fi';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  const fetchPatients = useCallback(async (search) => {
    try {
      setLoading(true);
      const response = await doctorAPI.getPatients(search || undefined);
      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dynamic search: debounced API call when user types (and initial load)
  useEffect(() => {
    const timer = setTimeout(
      () => fetchPatients(searchTerm || undefined),
      searchTerm ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [searchTerm, fetchPatients]);

  const formatAppointmentDateTime = (date, time) => {
    if (!date && !time) return '—';
    const d = date ? new Date(date).toLocaleDateString() : '';
    return [d, time].filter(Boolean).join(' ');
  };

  const handleCloseCase = async (patientId, caseId) => {
    try {
      await doctorAPI.closeCase({ patientId, caseId });
      fetchPatients();
    } catch (error) {
      console.error('Failed to close case:', error);
    }
  };

  const handleSetStatus = async (patientId, caseId, status) => {
    try {
      await doctorAPI.setPatientStatus({ patientId, caseId, status });
      fetchPatients();
    } catch (error) {
      console.error('Failed to set patient status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <Layout appName="Doctor's Hospital" role="doctor">
      <div className="page-header">
        <h1>My Patients</h1>
        <p>View and manage your patients' treatment plans</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patients by name or National ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading patients...</p>
          ) : patients.length === 0 ? (
            <p className="no-notifications">No patients found</p>
          ) : (
            <div className="patients-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>National ID</th>
                    <th>Doctor (Appointment)</th>
                    <th>Appointment</th>
                    <th>Status</th>
                    <th>Assigned Nurse</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar-sm">
                            <FiUser />
                          </div>
                          <span>{patient.fullName}</span>
                        </div>
                      </td>
                      <td>{patient.nationalID}</td>
                      <td>{patient.appointmentDoctorName || '—'}</td>
                      <td>{formatAppointmentDateTime(patient.appointmentDate, patient.appointmentTime)}</td>
                      <td>
                        <span className={`status-pill ${patient.patientStatus === 'critical' ? 'critical' : 'stable'}`}>
                          {patient.patientStatus === 'critical' ? (
                            <><FiAlertCircle /> Critical</>
                          ) : (
                            <><FiCheckCircle /> Stable</>
                          )}
                        </span>
                        <div className="status-actions">
                          <button
                            type="button"
                            className={`status-btn ${patient.patientStatus !== 'critical' ? 'active' : ''}`}
                            onClick={() => handleSetStatus(patient._id, patient.caseId, 'stable')}
                          >
                            Stable
                          </button>
                          <button
                            type="button"
                            className={`status-btn critical ${patient.patientStatus === 'critical' ? 'active' : ''}`}
                            onClick={() => handleSetStatus(patient._id, patient.caseId, 'critical')}
                          >
                            Critical
                          </button>
                        </div>
                      </td>
                      <td>{patient.assignedNurse || 'Unassigned'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn-sm edit"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowTreatmentModal(true);
                            }}
                            title="Update Treatment"
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="action-btn-sm view"
                            title="View Records"
                          >
                            <FiFileText />
                          </button>
                          {patient.caseStatus === 'open' && patient.caseId && (
                            <button
                              className="action-btn-sm close"
                              onClick={() => handleCloseCase(patient._id, patient.caseId)}
                              title="Close Case"
                            >
                              <FiCheckCircle />
                            </button>
                          )}
                        </div>
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
        .patients-table {
          overflow-x: auto;
        }
        .patients-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .patients-table th,
        .patients-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .patients-table th {
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
          width: 36px;
          height: 36px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .status-pill.stable, .status-pill.open {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-pill.critical, .status-pill:has(.FiAlertCircle) {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .status-actions {
          display: flex;
          gap: 0.35rem;
          margin-top: 0.35rem;
        }
        .status-btn {
          padding: 0.25rem 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          background: #fff;
          color: #64748b;
        }
        .status-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .status-btn.active { background: #22c55e; color: white; border-color: #22c55e; }
        .status-btn.critical.active { background: #ef4444; color: white; border-color: #ef4444; }
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn-sm {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-sm.edit {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .action-btn-sm.edit:hover {
          background: var(--accent-blue);
          color: white;
        }
        .action-btn-sm.view {
          background: rgba(139, 92, 246, 0.1);
          color: var(--accent-purple);
        }
        .action-btn-sm.view:hover {
          background: var(--accent-purple);
          color: white;
        }
        .action-btn-sm.close {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .action-btn-sm.close:hover {
          background: var(--accent-green);
          color: white;
        }
      `}</style>
    </Layout>
  );
};

export default DoctorPatients;
