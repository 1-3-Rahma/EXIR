import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/common/Layout';
import {
  FiSearch, FiUser, FiActivity,
  FiMessageSquare, FiEdit2, FiX, FiDroplet, FiSend
} from 'react-icons/fi';
import { nurseAPI } from '../../services/api';

const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

const BP_REGEX = /^\d{2,3}\/\d{2,3}$/;

const NursePatients = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Room modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [roomInput, setRoomInput] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  // BP modal
  const [showBPModal, setShowBPModal] = useState(false);
  const [bpPatient, setBpPatient] = useState(null);
  const [bpInput, setBpInput] = useState('');
  const [bpError, setBpError] = useState('');
  const [savingBP, setSavingBP] = useState(false);

  // Comment modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentPatient, setCommentPatient] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const onFocus = () => fetchPatients();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchPatients, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const normalizeStatus = (status) => String(status || '').toLowerCase();

  const isPatientCritical = (patient) =>
    patient.latestVitals?.riskLevel === 'Critical' || patient.latestVitals?.isCritical === true;

  const formatConfidence = (score) => {
    if (score === undefined || score === null || Number.isNaN(Number(score))) return 'N/A';
    const numericScore = Number(score);
    return numericScore <= 1 ? `${Math.round(numericScore * 100)}%` : `${Math.round(numericScore)}%`;
  };

  const fetchPatients = async () => {
    try {
      const [patientsRes, vitalsRes] = await Promise.all([
        fetch(`${API_URL}/nurse/assigned-patients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/nurse/vitals-formatted`, { headers: getAuthHeaders() })
      ]);

      const patientsData = patientsRes.ok ? await patientsRes.json() : [];
      const vitalsData = vitalsRes.ok ? await vitalsRes.json() : { data: [] };

      const patientsList = Array.isArray(patientsData) ? patientsData : (patientsData.data || []);
      const vitalsList = vitalsData.data || [];

      const enrichedPatients = patientsList.map(patient => {
        const vitalData = vitalsList.find(v => v._id === patient._id);
        const vitals = vitalData?.vitals;
        const latestVitals = vitalData?.latestVitals || null;

        const status = latestVitals?.riskLevel || patient.patientStatus || 'stable';

        const age = patient.dateOfBirth
          ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : 'N/A';

        return {
          _id: patient._id,
          fullName: patient.fullName,
          age,
          gender: patient.gender || 'N/A',
          room: patient.room || vitalData?.room || 'N/A',
          condition: patient.condition || patient.diagnosis || 'Under Observation',
          status,
          latestVitals,
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
    switch (normalizeStatus(status)) {
      case 'critical': return { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' };
      case 'abnormal':
      case 'moderate': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' };
      case 'stable': return { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' };
      default: return { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b' };
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.room?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'critical' ? isPatientCritical(patient) : normalizeStatus(patient.status) === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // ── Room modal ──────────────────────────────────────────────────────────────
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

  // ── BP modal ────────────────────────────────────────────────────────────────
  const openBPModal = (patient) => {
    setBpPatient(patient);
    setBpInput(patient.vitals?.bp !== 'N/A' ? patient.vitals?.bp || '' : '');
    setBpError('');
    setShowBPModal(true);
  };

  const validateBP = (value) => {
    if (!value.trim()) return 'Please enter blood pressure in this format: 120/80';
    if (!BP_REGEX.test(value.trim())) return 'Please enter blood pressure in this format: 120/80';
    const [sys, dia] = value.trim().split('/').map(Number);
    if (sys < 50 || sys > 250) return 'Please enter blood pressure in this format: 120/80';
    if (dia < 30 || dia > 150) return 'Please enter blood pressure in this format: 120/80';
    if (sys <= dia) return 'Please enter blood pressure in this format: 120/80';
    return '';
  };

  const handleSaveBP = async () => {
    const error = validateBP(bpInput);
    if (error) { setBpError(error); return; }
    try {
      setSavingBP(true);
      await nurseAPI.updatePatientBloodPressure(bpPatient._id, bpInput.trim());
      setPatients(patients.map(p =>
        p._id === bpPatient._id
          ? { ...p, vitals: { ...(p.vitals || {}), bp: bpInput.trim() } }
          : p
      ));
      setShowBPModal(false);
      setBpPatient(null);
    } catch (err) {
      setBpError(err.response?.data?.message || 'Please enter blood pressure in this format: 120/80');
    } finally {
      setSavingBP(false);
    }
  };

  // ── Comment modal ───────────────────────────────────────────────────────────
  const openCommentModal = async (patient) => {
    setCommentPatient(patient);
    setCommentText('');
    setShowCommentModal(true);
    setLoadingComments(true);
    try {
      const res = await nurseAPI.getPatientComments(patient._id);
      setComments(res.data?.data || []);
    } catch (e) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSaveComment = async () => {
    if (!commentText.trim()) return;
    try {
      setSavingComment(true);
      const res = await nurseAPI.addPatientComment(commentPatient._id, commentText.trim());
      setComments([res.data?.data, ...comments].filter(Boolean));
      setCommentText('');
    } catch (e) {
      console.error('Failed to save comment:', e);
    } finally {
      setSavingComment(false);
    }
  };

  const formatCommentDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>{t('patients.title')}</h1>
        <p>{t('patients.myPatients')}</p>
      </div>

      {/* Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder={t('patients.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="status-pills">
        <button className={`pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
          {t('common.all')} ({patients.length})
        </button>
        <button className={`pill critical ${statusFilter === 'critical' ? 'active' : ''}`} onClick={() => setStatusFilter('critical')}>
          {t('common.critical')} ({patients.filter(isPatientCritical).length})
        </button>
        <button className={`pill stable ${statusFilter === 'stable' ? 'active' : ''}`} onClick={() => setStatusFilter('stable')}>
          {t('common.stable')} ({patients.filter(p => normalizeStatus(p.status) === 'stable').length})
        </button>
      </div>

      <p className="results-count">Showing {filteredPatients.length} of {patients.length} patients</p>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="loading-state">{t('common.loading')}</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <FiUser style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
          <h3>{t('patients.noPatients')}</h3>
          <p>{t('vitals.noPatients')}</p>
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
                  <div className="patient-avatar"><FiUser /></div>
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
                    <span className="label">{t('common.room')}:</span>
                    <span className="value room-value">
                      {t('common.room')} {patient.room || t('common.na')}
                      <button
                        className="edit-inline-btn"
                        onClick={(e) => { e.stopPropagation(); openRoomModal(patient); }}
                        title="Edit room number"
                      >
                        <FiEdit2 size={12} />
                      </button>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('history.diagnosis')}:</span>
                    <span className="value condition">{patient.condition}</span>
                  </div>
                </div>

                <div className="vitals-section">
                  <h4>{t('vitals.latestReading')}</h4>
                  <div className="vitals-grid">
                    <div className="vital-item">
                      <span className="vital-label">AI Risk</span>
                      <span className="vital-value">{patient.latestVitals?.riskLevel || 'N/A'}</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">AI Conf.</span>
                      <span className="vital-value">{formatConfidence(patient.latestVitals?.confidenceScore)}</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">BP</span>
                      <span className="vital-value bp-value">
                        {patient.vitals?.bp || 'N/A'}
                        <button
                          className="edit-inline-btn"
                          onClick={(e) => { e.stopPropagation(); openBPModal(patient); }}
                          title="Edit blood pressure"
                        >
                          <FiEdit2 size={10} />
                        </button>
                      </span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">HR</span>
                      <span className="vital-value">{patient.vitals?.hr || 'N/A'} bpm</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Temp</span>
                      <span className="vital-value">{patient.vitals?.temp || 'N/A'}°C</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">O₂</span>
                      <span className="vital-value">{patient.vitals?.o2 || 'N/A'}%</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="action-btn action-btn--primary"
                    onClick={() => navigate(`/nurse/patient/${patient._id}/vitals-history`, {
                      state: { patientName: patient.fullName, room: patient.room }
                    })}
                  >
                    <FiActivity /> {t('vitals.history')}
                  </button>
                  <button
                    className="action-btn action-btn--iv"
                    onClick={() => navigate(`/nurse/iv-regulator/${patient._id}`, {
                      state: { patientName: patient.fullName, room: patient.room }
                    })}
                    title="Open IV Regulator for this patient"
                  >
                    <FiDroplet /> IV
                  </button>
                  <button
                    className="action-btn icon-only"
                    onClick={(e) => { e.stopPropagation(); openCommentModal(patient); }}
                    title="Patient comments"
                  >
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
        .search-box input:focus { outline: none; border-color: #3b82f6; }
        .status-pills { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
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
        .pill.stable.active { background: #22c55e; border-color: #22c55e; }
        .results-count { color: #64748b; font-size: 0.9rem; margin-bottom: 1rem; }
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
        .patient-info { flex: 1; }
        .patient-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }
        .patient-meta { font-size: 0.8rem; color: #64748b; }
        .status-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
          color: white;
          font-weight: 500;
          text-transform: capitalize;
        }
        .card-details { margin-bottom: 1rem; }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.375rem;
        }
        .detail-row .label { color: #64748b; font-size: 0.85rem; }
        .detail-row .value { font-weight: 500; color: #1e293b; font-size: 0.85rem; }
        .detail-row .value.condition { font-weight: 600; }
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
        .vital-item { display: flex; flex-direction: column; }
        .vital-label { font-size: 0.7rem; color: #94a3b8; }
        .vital-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }
        .card-actions { display: flex; gap: 0.5rem; }
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
        .action-btn:hover { background: #f8fafc; border-color: #3b82f6; color: #3b82f6; }
        .action-btn--primary { background: #1e3a5f; color: white; border-color: #1e3a5f; }
        .action-btn--primary:hover { background: #2d4a6f; border-color: #2d4a6f; color: white; }
        .action-btn--iv:hover { border-color: #6366f1 !important; color: #6366f1 !important; }
        .action-btn.icon-only { flex: 0; padding: 0.625rem; }
        .loading-state, .empty-state { text-align: center; padding: 3rem; color: #94a3b8; }
        .empty-state {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
        }
        .empty-state h3 { color: #1e293b; font-size: 1.25rem; margin-bottom: 0.5rem; }
        .empty-state p { color: #64748b; font-size: 0.9rem; }
        @media (max-width: 1200px) { .patients-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .patients-grid { grid-template-columns: 1fr; }
          .filter-bar { flex-direction: column; }
          .search-box { max-width: 100%; }
        }
        .room-value, .bp-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .edit-inline-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .edit-inline-btn:hover { background: #e2e8f0; color: #3b82f6; }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-box {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-box--wide { max-width: 520px; }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .modal-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #64748b;
          padding: 0.25rem;
        }
        .close-btn:hover { color: #1e293b; }
        .modal-subtitle { font-size: 0.9rem; color: #64748b; margin-bottom: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          box-sizing: border-box;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .input-error { border-color: #ef4444 !important; }
        .error-text { color: #ef4444; font-size: 0.8rem; margin-top: 0.25rem; }
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
        .btn-cancel { background: white; border: 1px solid #e2e8f0; color: #64748b; }
        .btn-cancel:hover { background: #f8fafc; }
        .btn-save { background: #3b82f6; color: white; border: none; }
        .btn-save:hover { background: #2563eb; }
        .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Comment section */
        .comment-input-row {
          display: flex;
          gap: 0.5rem;
          align-items: flex-end;
          margin-bottom: 1rem;
        }
        .comment-input-row textarea {
          flex: 1;
          padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          resize: none;
          min-height: 60px;
        }
        .comment-input-row textarea:focus { outline: none; border-color: #3b82f6; }
        .btn-send {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .btn-send:hover { background: #2563eb; }
        .btn-send:disabled { opacity: 0.6; cursor: not-allowed; }
        .comments-list {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .comment-item {
          background: #f8fafc;
          border-radius: 8px;
          padding: 0.75rem;
          border-left: 3px solid #3b82f6;
        }
        .comment-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.375rem;
          gap: 0.5rem;
        }
        .comment-author {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1e293b;
        }
        .comment-role {
          font-size: 0.75rem;
          color: #64748b;
          background: #e2e8f0;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .comment-date { font-size: 0.75rem; color: #94a3b8; }
        .comment-text { font-size: 0.85rem; color: #334155; line-height: 1.5; }
        .comments-empty { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1.5rem 0; }
        .comments-loading { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem 0; }
      `}</style>

      {/* Room Edit Modal */}
      {showRoomModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowRoomModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('patients.editRoom')}</h3>
              <button className="close-btn" onClick={() => setShowRoomModal(false)}><FiX /></button>
            </div>
            <p className="modal-subtitle">{selectedPatient.fullName}</p>
            <div className="form-group">
              <label>{t('patients.roomNumber')}</label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder={t('patients.enterRoom')}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRoomModal(false)}>{t('common.cancel')}</button>
              <button className="btn-save" onClick={handleSaveRoom} disabled={savingRoom}>
                {savingRoom ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blood Pressure Edit Modal */}
      {showBPModal && bpPatient && (
        <div className="modal-overlay" onClick={() => setShowBPModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('patients.updateBP')}</h3>
              <button className="close-btn" onClick={() => setShowBPModal(false)}><FiX /></button>
            </div>
            <p className="modal-subtitle">{bpPatient.fullName}</p>
            <div className="form-group">
              <label>{t('vitals.bloodPressure')} ({t('patients.enterBP')})</label>
              <input
                type="text"
                value={bpInput}
                onChange={(e) => { setBpInput(e.target.value); setBpError(''); }}
                placeholder={t('patients.enterBP')}
                className={bpError ? 'input-error' : ''}
              />
              {bpError && <p className="error-text">{bpError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowBPModal(false)}>{t('common.cancel')}</button>
              <button className="btn-save" onClick={handleSaveBP} disabled={savingBP}>
                {savingBP ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentModal && commentPatient && (
        <div className="modal-overlay" onClick={() => setShowCommentModal(false)}>
          <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('patients.comments')}</h3>
              <button className="close-btn" onClick={() => setShowCommentModal(false)}><FiX /></button>
            </div>
            <p className="modal-subtitle">{commentPatient.fullName}</p>

            <div className="comment-input-row">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('patients.writeComment')}
              />
              <button
                className="btn-send"
                onClick={handleSaveComment}
                disabled={savingComment || !commentText.trim()}
              >
                <FiSend /> {savingComment ? t('common.saving') : t('patients.addComment')}
              </button>
            </div>

            <div className="comments-list">
              {loadingComments ? (
                <div className="comments-loading">{t('common.loading')}</div>
              ) : comments.length === 0 ? (
                <div className="comments-empty">{t('patients.noComments')}</div>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="comment-item">
                    <div className="comment-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="comment-author">{c.authorId?.fullName || 'Unknown'}</span>
                        <span className="comment-role">{c.authorRole}</span>
                      </div>
                      <span className="comment-date">{formatCommentDate(c.createdAt)}</span>
                    </div>
                    <p className="comment-text">{c.commentText}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default NursePatients;
