import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { doctorAPI } from '../../services/api';
import { FiUser, FiClock, FiMapPin, FiActivity, FiPlus, FiMessageSquare, FiChevronDown, FiChevronUp, FiPackage, FiDroplet, FiTrash2 } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { Link, useNavigate } from 'react-router-dom';

const shiftLabel = (s) => {
  if (!s) return '—';
  const map = { morning: 'Morning (7 AM - 3 PM)'};
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
  const [showRxModal, setShowRxModal] = useState(false);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState(null);
  const [rxRows, setRxRows] = useState([{ medicineName: '', timesPerDay: '', note: '' }]);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [showIvModal, setShowIvModal] = useState(false);
  const [selectedPatientForIv, setSelectedPatientForIv] = useState(null);
  const [ivForm, setIvForm] = useState({ fluidName: '', volume: '', rate: '', instructions: '' });
  const [ivSubmitting, setIvSubmitting] = useState(false);

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

  const openAddRx = (patient) => {
    setSelectedPatientForRx(patient);
    setRxRows([{ medicineName: '', timesPerDay: '', note: '' }]);
    setShowRxModal(true);
  };

  const addRxRow = () => {
    setRxRows((prev) => [...prev, { medicineName: '', timesPerDay: '', note: '' }]);
  };

  const removeRxRow = (index) => {
    setRxRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateRxRow = (index, field, value) => {
    setRxRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const generatePrescriptionPdf = (patientName, medications) => {
    const doc = new jsPDF();
    const yStart = 20;
    let y = yStart;
    doc.setFontSize(18);
    doc.text('Prescription', 105, y, { align: 'center' });
    y += 12;
    doc.setFontSize(11);
    doc.text(`Patient: ${patientName}`, 20, y);
    y += 8;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 15;
    doc.setFontSize(12);
    doc.text('Medications', 20, y);
    y += 8;
    doc.setFontSize(10);
    medications.forEach((m, i) => {
      doc.text(`${i + 1}. ${m.medicineName}`, 25, y);
      doc.text(`${m.timesPerDay}x per day`, 120, y);
      if (m.note) {
        y += 5;
        doc.setFontSize(9);
        doc.text(`   Note: ${m.note}`, 25, y);
        doc.setFontSize(10);
        y += 5;
      }
      y += 8;
    });
    return doc;
  };

  const handleRxSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientForRx) return;
    const medications = rxRows
      .filter((r) => String(r.medicineName || '').trim() && (r.timesPerDay != null && r.timesPerDay !== ''))
      .map((r) => ({
        medicineName: String(r.medicineName || '').trim(),
        timesPerDay: Number(r.timesPerDay),
        note: String(r.note || '').trim()
      }));
    if (medications.length === 0) {
      alert('Add at least one medicine with name and times per day.');
      return;
    }
    try {
      setRxSubmitting(true);
      await doctorAPI.addPrescription({ patientId: selectedPatientForRx._id, medications });
      const doc = generatePrescriptionPdf(selectedPatientForRx.fullName || 'Patient', medications);
      doc.save(`prescription-${(selectedPatientForRx.fullName || 'patient').replace(/\s+/g, '-')}.pdf`);
      setShowRxModal(false);
      setSelectedPatientForRx(null);
      // Refresh staff data to update prescription counts
      await fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add prescription');
    } finally {
      setRxSubmitting(false);
    }
  };

  const openAddIv = (patient) => {
    setSelectedPatientForIv(patient);
    setIvForm({ fluidName: '', volume: '', rate: '', instructions: '' });
    setShowIvModal(true);
  };

  const handleIvSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientForIv || !ivForm.fluidName?.trim()) {
      alert('Please enter the IV fluid name.');
      return;
    }
    try {
      setIvSubmitting(true);
      await doctorAPI.addIvOrder({
        patientId: selectedPatientForIv._id,
        fluidName: ivForm.fluidName.trim(),
        volume: ivForm.volume.trim(),
        rate: ivForm.rate.trim(),
        instructions: ivForm.instructions.trim()
      });
      setShowIvModal(false);
      setSelectedPatientForIv(null);
      setIvForm({ fluidName: '', volume: '', rate: '', instructions: '' });
      // Refresh staff data to update IV order counts
      await fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to add IV order');
    } finally {
      setIvSubmitting(false);
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
                              <button type="button" className="btn-add-rx" title="Add prescription" onClick={() => openAddRx(patient)}>
                                <FiPackage size={14} /> Add Rx
                              </button>
                              <button type="button" className="btn-add-iv" title="Add IV order" onClick={() => openAddIv(patient)}>
                                <FiDroplet size={14} /> Add IV
                              </button>
                            </div>
                          </div>
                          <div className="patient-sections-header" onClick={() => togglePatient(patient._id)}>
                            <div className="patient-section-item">
                              <FiPackage size={14} /> Prescriptions ({patient.prescriptionsCount || 0})
                            </div>
                            <div className="patient-section-item">
                              <FiDroplet size={14} /> IV Orders ({patient.ivOrdersCount || 0})
                            </div>
                            <div className="expand-icon">
                              {isPatientOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isPatientOpen && (
                            <div className="patient-orders-details">
                              {/* Prescriptions List */}
                              <div className="orders-section">
                                <h5><FiPackage size={14} /> Prescriptions</h5>
                                {patient.prescriptions && patient.prescriptions.length > 0 ? (
                                  <div className="orders-list">
                                    {patient.prescriptions.map((rx, idx) => (
                                      <div key={rx._id || idx} className={`order-item ${rx.status === 'given' ? 'given' : ''}`}>
                                        <div className="order-main">
                                          <span className="order-name">{rx.medicineName}</span>
                                          <span className="order-dosage">{rx.timesPerDay}x per day</span>
                                        </div>
                                        {rx.note && <p className="order-note">{rx.note}</p>}
                                        {rx.status === 'given' && (
                                          <span className="status-badge given">Given</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="no-orders">No prescriptions yet</p>
                                )}
                              </div>

                              {/* IV Orders List */}
                              <div className="orders-section">
                                <h5><FiDroplet size={14} /> IV Orders</h5>
                                {patient.ivOrders && patient.ivOrders.length > 0 ? (
                                  <div className="orders-list">
                                    {patient.ivOrders.map((iv, idx) => (
                                      <div key={iv._id || idx} className={`order-item iv ${iv.status === 'given' ? 'given' : ''}`}>
                                        <div className="order-main">
                                          <span className="order-name">{iv.fluidName}</span>
                                          {iv.volume && <span className="order-dosage">{iv.volume}{iv.rate ? ` @ ${iv.rate}` : ''}</span>}
                                        </div>
                                        {iv.instructions && <p className="order-note">{iv.instructions}</p>}
                                        {iv.status === 'given' && (
                                          <span className="status-badge given">Given</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="no-orders">No IV orders yet</p>
                                )}
                              </div>
                            </div>
                          )}
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
        .patient-sections-header { border-top: 1px solid #f1f5f9; display: flex; align-items: center; padding: 0.6rem 1.25rem; cursor: pointer; }
        .patient-sections-header:hover { background: #f8fafc; }
        .patient-section-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b; margin-right: 1.5rem; }
        .expand-icon { margin-left: auto; color: #94a3b8; }

        .patient-orders-details { border-top: 1px solid #f1f5f9; padding: 1rem 1.25rem; background: #fafbfc; }
        .orders-section { margin-bottom: 1rem; }
        .orders-section:last-child { margin-bottom: 0; }
        .orders-section h5 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #475569; margin: 0 0 0.75rem 0; }
        .orders-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .order-item { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; position: relative; }
        .order-item.given { opacity: 0.7; background: #f0fdf4; border-color: #bbf7d0; }
        .order-item.iv { border-left: 3px solid #0ea5e9; }
        .order-item:not(.iv) { border-left: 3px solid #8b5cf6; }
        .order-main { display: flex; justify-content: space-between; align-items: center; }
        .order-name { font-weight: 500; color: #1e293b; font-size: 0.9rem; }
        .order-dosage { font-size: 0.8rem; color: #64748b; }
        .order-note { font-size: 0.8rem; color: #64748b; margin: 0.35rem 0 0 0; font-style: italic; }
        .status-badge { position: absolute; top: 0.5rem; right: 0.5rem; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; }
        .status-badge.given { background: #dcfce7; color: #16a34a; }
        .no-orders { font-size: 0.85rem; color: #94a3b8; margin: 0; padding: 0.5rem; text-align: center; }
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

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" disabled={assignSubmitting}>{assignSubmitting ? 'Assigning...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRxModal && selectedPatientForRx && (
        <div className="modal-overlay" onClick={() => setShowRxModal(false)}>
          <div className="modal-rx" onClick={(e) => e.stopPropagation()}>
            <h3>Add Prescription – {selectedPatientForRx.fullName}</h3>
            <p className="rx-subtitle">Assigned by doctor</p>
            <form onSubmit={handleRxSubmit}>
              <div className="rx-table-wrap">
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th>Medicine name</th>
                      <th>Times per day</th>
                      <th>Note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rxRows.map((row, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            value={row.medicineName}
                            onChange={(e) => updateRxRow(index, 'medicineName', e.target.value)}
                            placeholder="e.g. Paracetamol"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            value={row.timesPerDay}
                            onChange={(e) => updateRxRow(index, 'timesPerDay', e.target.value)}
                            placeholder="e.g. 2"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => updateRxRow(index, 'note', e.target.value)}
                            placeholder="Optional note"
                          />
                        </td>
                        <td>
                          <button type="button" className="btn-remove-row" onClick={() => removeRxRow(index)} title="Remove row">
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn-add-row" onClick={addRxRow}>
                <FiPlus size={14} /> Add row
              </button>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRxModal(false)}>Cancel</button>
                <button type="submit" disabled={rxSubmitting}>{rxSubmitting ? 'Saving...' : 'Save & Download PDF'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showIvModal && selectedPatientForIv && (
        <div className="modal-overlay" onClick={() => setShowIvModal(false)}>
          <div className="modal-rx modal-iv" onClick={(e) => e.stopPropagation()}>
            <h3>Add IV Order – {selectedPatientForIv.fullName}</h3>
            <p className="rx-subtitle">IV fluid order – notifies assigned nurse(s)</p>
            <form onSubmit={handleIvSubmit}>
              <div className="form-group">
                <label>IV Fluid Name *</label>
                <input
                  type="text"
                  value={ivForm.fluidName}
                  onChange={(e) => setIvForm(f => ({ ...f, fluidName: e.target.value }))}
                  placeholder="e.g. Normal Saline 0.9%, Ringer's Lactate"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Volume</label>
                  <input
                    type="text"
                    value={ivForm.volume}
                    onChange={(e) => setIvForm(f => ({ ...f, volume: e.target.value }))}
                    placeholder="e.g. 500ml, 1L"
                  />
                </div>
                <div className="form-group">
                  <label>Rate</label>
                  <input
                    type="text"
                    value={ivForm.rate}
                    onChange={(e) => setIvForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="e.g. 100ml/hr"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Instructions</label>
                <textarea
                  value={ivForm.instructions}
                  onChange={(e) => setIvForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="Additional instructions for the nurse..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowIvModal(false)}>Cancel</button>
                <button type="submit" disabled={ivSubmitting}>{ivSubmitting ? 'Sending...' : 'Send IV Order'}</button>
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
        .modal-rx { background: white; border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 640px; max-height: 90vh; overflow-y: auto; }
        .modal-rx h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
        .modal-rx .rx-subtitle { margin: 0 0 1rem 0; font-size: 0.85rem; color: #64748b; }
        .modal-rx .rx-table-wrap { overflow-x: auto; margin-bottom: 0.75rem; }
        .modal-rx .rx-table { width: 100%; border-collapse: collapse; }
        .modal-rx .rx-table th, .modal-rx .rx-table td { padding: 0.5rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .modal-rx .rx-table th { font-size: 0.8rem; font-weight: 600; color: #64748b; }
        .modal-rx .rx-table input { width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; }
        .modal-rx .btn-remove-row { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.25rem; }
        .modal-rx .btn-remove-row:hover { color: #ef4444; }
        .modal-rx .btn-add-row { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.75rem; margin-bottom: 1rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
        .modal-rx .btn-add-row:hover { background: #e2e8f0; }
        .modal-rx .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; }
        .modal-rx .modal-actions button { padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
        .modal-rx .modal-actions button[type=submit] { background: #0ea5e9; color: white; border: none; }
        .modal-iv { max-width: 420px; }
        .modal-iv .form-group { margin-bottom: 1rem; }
        .modal-iv label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; }
        .modal-iv input, .modal-iv textarea { width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .form-row { display: flex; gap: 1rem; }
        .form-row .form-group { flex: 1; }
      `}</style>
    </Layout>
  );
};

export default DoctorNurses;
