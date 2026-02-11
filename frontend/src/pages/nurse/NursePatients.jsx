import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import {
  FiSearch, FiFilter, FiUser, FiFileText, FiActivity,
  FiMessageSquare, FiChevronDown, FiEdit2, FiX
} from 'react-icons/fi';
import { nurseAPI } from '../../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const NursePatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [roomInput, setRoomInput] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Refetch when tab gets focus so newly assigned patients and doctor status changes appear
  useEffect(() => {
    const onFocus = () => fetchPatients();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Periodic refetch so when doctor (e.g. Ahmed) re-converts patient (e.g. Reham) to stable, nurse (e.g. Fatima) sees it
  useEffect(() => {
    const interval = setInterval(fetchPatients, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time: when doctor changes patient status, refetch immediately (no refresh)
  useEffect(() => {
    const onStatusChange = () => fetchPatients();
    window.addEventListener('patientStatusChanged', onStatusChange);
    return () => window.removeEventListener('patientStatusChanged', onStatusChange);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchPatients = async () => {
    try {
      // Fetch both patients and their vitals
      const [patientsRes, vitalsRes] = await Promise.all([
        fetch(`${API_URL}/nurse/assigned-patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/nurse/vitals-formatted`, { headers: getAuthHeaders() })
      ]);

      const patientsData = patientsRes.ok ? await patientsRes.json() : [];
      const vitalsData = vitalsRes.ok ? await vitalsRes.json() : { data: [] };

      // Combine patient data with vitals
      const patientsList = Array.isArray(patientsData) ? patientsData : (patientsData.data || []);
      const vitalsList = vitalsData.data || [];

      const enrichedPatients = patientsList.map(patient => {
        const vitalData = vitalsList.find(v => v._id === patient._id);
        const vitals = vitalData?.vitals;

        // Single source of truth: when doctor (e.g. Ahmed) re-converts patient (e.g. Reham) to stable, nurse (Fatima) sees stable here too
        let status = 'stable';
        if (patient.patientStatus === 'critical') {
          status = 'critical';
        } else if (patient.patientStatus === 'stable') {
          status = 'stable';
        } else if (vitals) {
          if (vitals.bp?.status === 'critical' || vitals.hr?.status === 'critical' ||
              vitals.o2?.status === 'critical' || vitals.temp?.status === 'critical') {
            status = 'critical';
          } else if (vitals.bp?.status === 'warning' || vitals.hr?.status === 'warning' ||
                     vitals.o2?.status === 'warning' || vitals.temp?.status === 'warning') {
            status = 'moderate';
          }
        }

        // Calculate age from date of birth
        const age = patient.dateOfBirth
          ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : 'N/A';

        return {
          _id: patient._id,
          fullName: patient.fullName,
          age: age,
          gender: patient.gender || 'N/A',
<<<<<<< HEAD
          room: patient.room || vitalData?.room || 'N/A',
=======
          room:patient.room || 'N/A',
>>>>>>> 3510409b5cb2bc47917ce6f00a9bc953d49ac921
          condition: patient.condition || patient.diagnosis || 'Under Observation',
          status: status,
          assignedDoctor: patient.assignedDoctor,
          vitals: vitals ? {
            bp: vitals.bp ? `${vitals.bp.systolic}/${vitals.bp.diastolic}` : 'N/A',
            hr: vitals.hr?.value || 'N/A',
            temp: vitals.temp?.value || 'N/A',
            o2: vitals.o2?.value || 'N/A'
          } : null
        };
      });

      setPatients(enrichedPatients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' };
      case 'moderate': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' };
      case 'stable': return { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' };
      default: return { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b' };
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.room?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openRoomModal = (patient) => {
    setSelectedPatient(patient);
    setRoomInput(patient.room || '');
    setShowRoomModal(true);
  };

  const handleSaveRoom = async () => {
    if (!selectedPatient) return;
    try {
      setSavingRoom(true);
      await nurseAPI.updatePatientRoom(selectedPatient._id, roomInput.trim());
      setPatients(patients.map(p =>
        p._id === selectedPatient._id ? { ...p, room: roomInput.trim() } : p
      ));
      setShowRoomModal(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Failed to update room:', error);
      alert('Failed to update room number. Please try again.');
    } finally {
      setSavingRoom(false);
    }
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Patient Management</h1>
        <p>View and manage your assigned patients</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by patient name or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
            <FiFilter /> All Patients <FiChevronDown />
          </button>
          <button className="more-filters-btn">
            <FiFilter /> More Filters
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="status-pills">
        <button
          className={`pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({patients.length})
        </button>
        <button
          className={`pill critical ${statusFilter === 'critical' ? 'active' : ''}`}
          onClick={() => setStatusFilter('critical')}
        >
          Critical ({patients.filter(p => p.status === 'critical').length})
        </button>

        <button
          className={`pill stable ${statusFilter === 'stable' ? 'active' : ''}`}
          onClick={() => setStatusFilter('stable')}
        >
          Stable ({patients.filter(p => p.status === 'stable').length})
        </button>
      </div>

      <p className="results-count">Showing {filteredPatients.length} of {patients.length} patients</p>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="loading-state">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <FiUser style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
          <h3>No patients assigned</h3>
          <p>You don't have any patients assigned to your care yet.</p>
        </div>
      ) : (
        <div className="patients-grid">
          {filteredPatients.map((patient) => {
            const statusColors = getStatusColor(patient.status);
            return (
              <div
                key={patient._id}
                className="patient-card"
                style={{ background: statusColors.bg, borderColor: statusColors.border }}
              >
                <div className="card-header">
                  <div className="patient-avatar">
                    <FiUser />
                  </div>
                  <div className="patient-info">
                    <h3>{patient.fullName}</h3>
                    <span className="patient-meta">{patient.age}y · {patient.gender}</span>
                  </div>
                  <span className="status-badge" style={{ background: statusColors.text }}>
                    {patient.status}
                  </span>
                </div>

                <div className="card-details">
                  <div className="detail-row">
                    <span className="label">Room:</span>
                    <span className="value room-value">
                      Room {patient.room || 'N/A'}
                      <button
                        className="edit-room-btn"
                        onClick={(e) => { e.stopPropagation(); openRoomModal(patient); }}
                        title="Edit room number"
                      >
                        <FiEdit2 size={12} />
                      </button>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Condition:</span>
                    <span className="value condition">{patient.condition}</span>
                  </div>
                </div>

                <div className="vitals-section">
                  <h4>Latest Vitals</h4>
                  <div className="vitals-grid">
                    <div className="vital-item">
                      <span className="vital-label">BP</span>
                      <span className="vital-value">{patient.vitals?.bp || 'N/A'}</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">HR</span>
                      <span className="vital-value">{patient.vitals?.hr || 'N/A'} bpm</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Temp</span>
                      <span className="vital-value">{patient.vitals?.temp || 'N/A'}°F</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">O₂</span>
                      <span className="vital-value">{patient.vitals?.o2 || 'N/A'}%</span>
                    </div>
                  </div>
                </div>

                {patient.medication && (
                  <div className="medication-alert">
                    <FiLink className="med-icon" />
                    <span>{patient.medication.name} {patient.medication.time}</span>
                  </div>
                )}

                <div className="card-actions">
                  <button className="action-btn">
                    <FiFileText /> Chart
                  </button>
                  <button className="action-btn">
                    <FiActivity /> Vitals
                  </button>
                  <button className="action-btn icon-only">
                    <FiMessageSquare />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .search-box {
          flex: 1;
          position: relative;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .search-box input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
        }

        .filter-btn, .more-filters-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover, .more-filters-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .more-filters-btn {
          background: #1e3a5f;
          color: white;
          border: none;
        }

        .more-filters-btn:hover {
          background: #2d4a6f;
          color: white;
        }

        .status-pills {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .pill {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pill:hover { border-color: #94a3b8; }
        .pill.active { background: #1e3a5f; color: white; border-color: #1e3a5f; }
        .pill.critical.active { background: #ef4444; border-color: #ef4444; }
        .pill.moderate.active { background: #f59e0b; border-color: #f59e0b; }
        .pill.stable.active { background: #22c55e; border-color: #22c55e; }

        .results-count {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .patients-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .patient-card {
          border-radius: 16px;
          padding: 1.25rem;
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .patient-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .patient-avatar {
          width: 48px;
          height: 48px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .patient-info {
          flex: 1;
        }

        .patient-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .patient-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
          color: white;
          font-weight: 500;
          text-transform: capitalize;
        }

        .card-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.375rem;
        }

        .detail-row .label {
          color: #64748b;
          font-size: 0.85rem;
        }

        .detail-row .value {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.85rem;
        }

        .detail-row .value.condition {
          font-weight: 600;
        }

        .vitals-section {
          background: rgba(255,255,255,0.7);
          border-radius: 10px;
          padding: 0.875rem;
          margin-bottom: 1rem;
        }

        .vitals-section h4 {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .vital-item {
          display: flex;
          flex-direction: column;
        }

        .vital-label {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .vital-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }

        .medication-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .med-icon {
          font-size: 1rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .action-btn.icon-only {
          flex: 0;
          padding: 0.625rem;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem;
          color: #94a3b8;
        }

        .empty-state {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
        }

        .empty-state h3 {
          color: #1e293b;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #64748b;
          font-size: 0.9rem;
        }

        @media (max-width: 1200px) {
          .patients-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .patients-grid { grid-template-columns: 1fr; }
          .filter-bar { flex-direction: column; }
          .search-box { max-width: 100%; }
        }

        .room-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .edit-room-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .edit-room-btn:hover {
          background: #e2e8f0;
          color: #3b82f6;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-room {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .modal-room-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #64748b;
          padding: 0.25rem;
        }

        .close-btn:hover {
          color: #1e293b;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-cancel {
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .btn-cancel:hover {
          background: #f8fafc;
        }

        .btn-save {
          background: #3b82f6;
          color: white;
          border: none;
        }

        .btn-save:hover {
          background: #2563eb;
        }

        .btn-save:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      {/* Room Edit Modal */}
      {showRoomModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowRoomModal(false)}>
          <div className="modal-room" onClick={(e) => e.stopPropagation()}>
            <div className="modal-room-header">
              <h3>Edit Room Number</h3>
              <button className="close-btn" onClick={() => setShowRoomModal(false)}>
                <FiX />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Patient: {selectedPatient.fullName}
            </p>
            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter room number (e.g., 101, ICU-3)"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRoomModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveRoom} disabled={savingRoom}>
                {savingRoom ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default NursePatients;
