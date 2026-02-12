import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { doctorAPI } from '../../services/api';
import { FiUser, FiActivity, FiHeart, FiThermometer, FiWind, FiCheckCircle, FiAlertCircle, FiSearch, FiClock } from 'react-icons/fi';

const DoctorPatients = () => {
  const { user } = useAuth();
  const isEmergencyDoctor = user?.department === 'Emergency';
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [vitals, setVitals] = useState([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);

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

  // Check if a patient's appointment time has arrived
  const isAppointmentReady = (patient) => {
    if (isEmergencyDoctor) return true;
    if (!patient.appointmentDate && !patient.appointmentTime) return true; // no appointment = always active
    if (!patient.appointmentTime) return true;
    const now = new Date();
    const apptDate = patient.appointmentDate ? new Date(patient.appointmentDate) : new Date();
    // Parse time like "09:00 AM"
    const timeParts = patient.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) return true;
    let hours = parseInt(timeParts[1]);
    const minutes = parseInt(timeParts[2]);
    const ampm = timeParts[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    apptDate.setHours(hours, minutes, 0, 0);
    return now >= apptDate;
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

  const openViewDetails = async (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
    setVitalsLoading(true);
    setVitals([]);
    try {
      const res = await doctorAPI.getPatientVitals(patient._id);
      const list = Array.isArray(res.data) ? res.data : [];
      setVitals(list);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
      setVitals([]);
    } finally {
      setVitalsLoading(false);
    }
  };

  const latestVital = vitals.length > 0 ? vitals[0] : null;
  const formatVitalTime = (date) => date ? new Date(date).toLocaleString() : '—';

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
                    {/* <th>Doctor (Appointment)</th> */}
                    <th>Appointment</th>
                    <th>Status</th>
                    <th>Assigned Nurse</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const ready = isAppointmentReady(patient);
                    return (
                    <tr key={patient._id} className={!ready ? 'row-inactive' : ''}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar-sm">
                            <FiUser />
                          </div>
                          <span>{patient.fullName}</span>
                        </div>
                      </td>
                      <td>{patient.nationalID}</td>
                      <td>
                        {formatAppointmentDateTime(patient.appointmentDate, patient.appointmentTime)}
                        {!ready && <span className="waiting-badge"><FiClock /> Waiting</span>}
                      </td>
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
                            disabled={!ready}
                          >
                            Stable
                          </button>
                          <button
                            type="button"
                            className={`status-btn critical ${patient.patientStatus === 'critical' ? 'active' : ''}`}
                            onClick={() => handleSetStatus(patient._id, patient.caseId, 'critical')}
                            disabled={!ready}
                          >
                            Critical
                          </button>
                        </div>
                      </td>
                      <td>{patient.assignedNurse || 'Unassigned'}</td>
                      <td>
                        <button
                          className="action-btn-view"
                          onClick={() => openViewDetails(patient)}
                          title={ready ? "View patient vitals and details" : "Appointment time has not arrived yet"}
                          disabled={!ready}
                        >
                          <FiActivity /> View Details
                        </button>
                      </td>
                    </tr>
                    );
                  })}
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
        .action-btn-view {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-view:hover:not(:disabled) {
          background: #6366f1;
          color: white;
        }
        .action-btn-view:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .row-inactive {
          opacity: 0.5;
          pointer-events: none;
          background: #f8fafc;
        }
        .row-inactive td {
          color: #94a3b8;
        }
        .row-inactive .status-actions button,
        .row-inactive .action-btn-view {
          pointer-events: auto;
          cursor: not-allowed;
        }
        .waiting-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
          padding: 0.2rem 0.5rem;
          background: #fef3c7;
          color: #d97706;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }
      `}</style>

      {showDetailsModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-details" onClick={(e) => e.stopPropagation()}>
            <h3>Patient Details – {selectedPatient.fullName}</h3>
            <p className="modal-sub">Vital signs (from sensors)</p>

            {vitalsLoading ? (
              <p className="vitals-loading">Loading vitals...</p>
            ) : !latestVital ? (
              <div className="vitals-empty">
                <FiActivity size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                <p>No vitals recorded yet for this patient.</p>
                <p className="vitals-hint">Data will appear when sensors or nurses record vitals.</p>
              </div>
            ) : (
              <div className="vitals-grid-doc">
                {(latestVital.bloodPressure?.systolic != null || latestVital.bloodPressure?.diastolic != null) && (
                  <div className="vital-item">
                    <FiHeart /> <span>Blood Pressure:</span> {latestVital.bloodPressure?.systolic}/{latestVital.bloodPressure?.diastolic} mmHg
                  </div>
                )}
                {latestVital.heartRate != null && (
                  <div className="vital-item">
                    <FiActivity /> <span>Heart Rate:</span> {latestVital.heartRate} bpm
                  </div>
                )}
                {latestVital.temperature != null && (
                  <div className="vital-item">
                    <FiThermometer /> <span>Temperature:</span> {latestVital.temperature} °F
                  </div>
                )}
                {(latestVital.oxygenSaturation != null || latestVital.spo2 != null) && (
                  <div className="vital-item">
                    <FiWind /> <span>O₂ Saturation:</span> {latestVital.oxygenSaturation ?? latestVital.spo2}%
                  </div>
                )}
                {latestVital.respiratoryRate != null && (
                  <div className="vital-item">
                    <FiActivity /> <span>Resp. Rate:</span> {latestVital.respiratoryRate} /min
                  </div>
                )}
                {!latestVital.bloodPressure?.systolic && latestVital.heartRate == null && latestVital.temperature == null && latestVital.oxygenSaturation == null && latestVital.spo2 == null && latestVital.respiratoryRate == null && (
                  <p className="vitals-hint">No vital values in this record.</p>
                )}
              </div>
            )}
            <p className="vital-time">Last updated: {formatVitalTime(latestVital?.createdAt)}</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-details { background: white; border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 480px; }
        .modal-details h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
        .modal-sub { margin: 0 0 1rem 0; font-size: 0.85rem; color: #64748b; }
        .vitals-loading { color: #64748b; padding: 1rem; }
        .vitals-empty { text-align: center; padding: 1.5rem; color: #64748b; font-size: 0.9rem; }
        .vitals-hint { font-size: 0.8rem; margin-top: 0.5rem; color: #94a3b8; }
        .vitals-grid-doc { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
        .vital-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: #f8fafc; border-radius: 8px; font-size: 0.9rem; }
        .vital-item span { font-weight: 600; color: #475569; min-width: 120px; }
        .vital-time { font-size: 0.8rem; color: #94a3b8; margin: 0 0 1rem 0; }
        .modal-actions { display: flex; justify-content: flex-end; }
        .modal-actions button { padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; background: #6366f1; color: white; border: none; }
      `}</style>
    </Layout>
  );
};

export default DoctorPatients;
