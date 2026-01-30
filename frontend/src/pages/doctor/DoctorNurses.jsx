import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { doctorAPI } from '../../services/api';
import { FiUser, FiClock, FiMapPin, FiActivity, FiPlus, FiMessageSquare, FiChevronDown, FiChevronUp, FiPackage, FiDroplet } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const shiftLabel = (s) => {
  if (!s) return '—';
  const map = { morning: 'Morning (7 AM - 3 PM)', afternoon: 'Afternoon (3 PM - 11 PM)', night: 'Night (11 PM - 7 AM)' };
  return map[s] || s;
};

const DoctorNurses = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNurse, setExpandedNurse] = useState(null);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [assignPatientId, setAssignPatientId] = useState('');
  const [assignShift, setAssignShift] = useState('morning');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchPatients();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await doctorAPI.getNursingStaff();
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch nursing staff:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await doctorAPI.getPatients();
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setPatients([]);
    }
  };

  const toggleNurse = (id) => {
    setExpandedNurse((prev) => (prev === id ? null : id));
    setExpandedPatient(null);
  };

  const togglePatient = (id) => {
    setExpandedPatient((prev) => (prev === id ? null : id));
  };

  const openAssign = (nurse) => {
    setSelectedNurse(nurse);
    setAssignPatientId('');
    setAssignShift('morning');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNurse || !assignPatientId) {
      alert('Please select a patient');
      return;
    }
    try {
      setAssignSubmitting(true);
      await doctorAPI.assignPatient({
        nurseId: selectedNurse._id,
        patientId: assignPatientId,
        shift: assignShift
      });
      await fetchStaff();
      setShowAssignModal(false);
      setSelectedNurse(null);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to assign patient');
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <Layout appName="EXIR" role="doctor">
      <div className="page-header">
        <h1>Nursing Staff</h1>
        <p>Manage nurses and their assigned patients</p>
      </div>

      {loading ? (
        <p className="text-muted">Loading nursing staff...</p>
      ) : staff.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="no-data">No nursing staff in the system yet.</p>
          </div>
        </div>
      ) : (
        <div className="nursing-staff-list">
          {staff.map((nurse) => {
            const patients = nurse.assignedPatients || [];
            const isNurseOpen = expandedNurse === nurse._id;
            return (
              <div key={nurse._id} className="nurse-card-outer">
                <div className="nurse-card">
                  <div className="nurse-card-left">
                    <div className="nurse-avatar">
                      <FiUser size={24} />
                    </div>
                    <div className="nurse-details">
                      <h3 className="nurse-name">{nurse.fullName}</h3>
                      <div className="nurse-meta">
                        <span className="nurse-dept">
                          <FiActivity size={14} /> General Care
                        </span>
                        <span className="nurse-shift">
                          <FiClock size={14} /> {shiftLabel(nurse.shift)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="nurse-actions">
                    <button type="button" className="btn-add-patient" onClick={() => openAssign(nurse)}>
                      <FiPlus size={16} /> Add Patient
                    </button>
                    <Link to="/doctor/messages" className="btn-message" onClick={() => { try { localStorage.setItem('chatOpenContactId', nurse._id); } catch (_) {} }}>
                      <FiMessageSquare size={16} /> Message
                    </Link>
                  </div>
                  <div className="nurse-assigned-header" onClick={() => toggleNurse(nurse._id)}>
                    <span>Assigned Patients</span>
                    <span className="assigned-count">{patients.length} patients</span>
                    {isNurseOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </div>
                </div>

                {isNurseOpen && patients.length > 0 && (
                  <div className="patients-list">
                    {patients.map((patient) => {
                      const isPatientOpen = expandedPatient === patient._id;
                      return (
                        <div key={patient._id} className="patient-card-outer">
                          <div className="patient-card">
                            <div className="patient-card-left">
                              <div className="patient-avatar">
                                <FiUser size={20} />
                              </div>
                              <div className="patient-details">
                                <h4 className="patient-name">{patient.fullName}</h4>
                                <div className="patient-meta">
                                  {patient.age != null && <span>{patient.age} years old</span>}
                                  <span><FiMapPin size={12} /> {patient.room || '—'}</span>
                                  <span><FiActivity size={12} /> {patient.condition || '—'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="patient-actions">
                              <button type="button" className="btn-add-rx" title="Add prescription">
                                <FiPackage size={14} /> Add Rx
                              </button>
                              <button type="button" className="btn-add-iv" title="Add IV order">
                                <FiDroplet size={14} /> Add IV
                              </button>
                            </div>
                          </div>
                          <div className="patient-sections" onClick={() => togglePatient(patient._id)}>
                            <div className="patient-section-item">
                              <FiPackage size={14} /> Prescriptions (0)
                              {isPatientOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </div>
                            <div className="patient-section-item">
                              <FiDroplet size={14} /> IV Orders (0)
                              {isPatientOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .page-header { margin-bottom: 1.5rem; }
        .page-header h1 { font-size: 1.75rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; }
        .page-header p { color: #64748b; font-size: 0.9rem; }
        .text-muted { color: #64748b; padding: 1rem; }
        .no-data { color: #64748b; padding: 1rem; margin: 0; }
        .nursing-staff-list { display: flex; flex-direction: column; gap: 1rem; }
        .nurse-card-outer { border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .nurse-card { padding: 1.25rem 1.5rem; display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; border-bottom: 1px solid #f1f5f9; }
        .nurse-card-left { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 200px; }
        .nurse-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nurse-details { min-width: 0; }
        .nurse-name { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0 0 0.35rem 0; }
        .nurse-meta { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; font-size: 0.85rem; color: #64748b; }
        .nurse-meta span { display: inline-flex; align-items: center; gap: 0.35rem; }
        .nurse-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .btn-add-patient { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
        .btn-add-patient:hover { background: #0284c7; }
        .btn-message { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #22c55e; color: white; border-radius: 10px; font-size: 0.9rem; font-weight: 500; text-decoration: none; }
        .btn-message:hover { background: #16a34a; }
        .nurse-assigned-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; cursor: pointer; background: #f8fafc; font-size: 0.9rem; color: #475569; }
        .nurse-assigned-header .assigned-count { color: #0ea5e9; font-weight: 500; margin-left: auto; margin-right: 0.25rem; }
        .patients-list { padding: 1rem 1.5rem; background: #fafafa; display: flex; flex-direction: column; gap: 0.75rem; }
        .patient-card-outer { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
        .patient-card { padding: 1rem 1.25rem; display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
        .patient-card-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 180px; }
        .patient-avatar { width: 44px; height: 44px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .patient-name { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 0.25rem 0; }
        .patient-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; font-size: 0.8rem; color: #64748b; }
        .patient-actions { display: flex; gap: 0.5rem; }
        .btn-add-rx, .btn-add-iv { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 0.8rem; color: #475569; cursor: pointer; }
        .btn-add-rx:hover, .btn-add-iv:hover { background: #f8fafc; border-color: #0ea5e9; color: #0ea5e9; }
        .patient-sections { border-top: 1px solid #f1f5f9; }
        .patient-section-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem; font-size: 0.85rem; color: #64748b; cursor: pointer; }
        .patient-section-item:hover { background: #f8fafc; }
      `}</style>

      {showAssignModal && selectedNurse && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-assign" onClick={(e) => e.stopPropagation()}>
            <h3>Add Patient to {selectedNurse.fullName}</h3>
            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Patient</label>
                <select value={assignPatientId} onChange={(e) => setAssignPatientId(e.target.value)} required>
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Shift</label>
                <select value={assignShift} onChange={(e) => setAssignShift(e.target.value)}>
                  <option value="morning">Morning (7 AM - 3 PM)</option>
                  <option value="afternoon">Afternoon (3 PM - 11 PM)</option>
                  <option value="night">Night (11 PM - 7 AM)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" disabled={assignSubmitting}>{assignSubmitting ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-assign { background: white; border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 400px; }
        .modal-assign h3 { margin: 0 0 1rem 0; font-size: 1.1rem; }
        .modal-assign .form-group { margin-bottom: 1rem; }
        .modal-assign label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; }
        .modal-assign select { width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modal-assign .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
        .modal-assign .modal-actions button { padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
        .modal-assign .modal-actions button[type=submit] { background: #0ea5e9; color: white; border: none; }
      `}</style>
    </Layout>
  );
};

export default DoctorNurses;
