import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI, medicalRecordAPI } from '../../services/api';
import {
  FiFileText, FiCalendar, FiUser, FiChevronDown, FiChevronUp,
  FiClock, FiDollarSign, FiActivity, FiClipboard, FiHeart,
  FiCheckCircle, FiAlertCircle, FiXCircle, FiDownload, FiMapPin,
  FiImage, FiFile
} from 'react-icons/fi';

const PatientHistory = () => {
  const [activeTab, setActiveTab] = useState('visits');
  const [history, setHistory] = useState({
    visits: [],
    appointments: [],
    cases: []
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await patientAPI.getMedicalHistory();
      setHistory({
        visits: response.data.visits || [],
        appointments: response.data.appointments || [],
        cases: response.data.cases || []
      });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownload = async (record) => {
    try {
      const response = await medicalRecordAPI.downloadFile(record._id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    }
  };

  const getReasonBadgeClass = (reason) => {
    switch (reason) {
      case 'emergency': return 'danger';
      case 'surgery': return 'warning';
      case 'consultation': return 'info';
      case 'test': return 'purple';
      case 'checkup': return 'success';
      case 'follow-up': return 'secondary';
      default: return '';
    }
  };

  const getRecordIcon = (type) => {
    switch (type) {
      case 'lab': return <FiFileText className="record-icon lab" />;
      case 'imaging': return <FiImage className="record-icon imaging" />;
      case 'report': return <FiFileText className="record-icon report" />;
      default: return <FiFile className="record-icon" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'discharged':
      case 'paid':
        return <FiCheckCircle className="status-icon success" />;
      case 'pending':
      case 'admitted':
      case 'partial':
        return <FiClock className="status-icon warning" />;
      case 'cancelled':
      case 'no-show':
        return <FiXCircle className="status-icon danger" />;
      default:
        return <FiAlertCircle className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
      case 'discharged':
      case 'paid':
      case 'closed':
        return 'success';
      case 'pending':
      case 'admitted':
      case 'partial':
      case 'open':
      case 'confirmed':
        return 'warning';
      case 'cancelled':
      case 'no-show':
        return 'danger';
      default:
        return '';
    }
  };

  const renderVisitsTab = () => (
    <div className="history-list">
      {history.visits.length === 0 ? (
        <div className="empty-state">
          <FiActivity className="empty-icon" />
          <h3>No Visit History</h3>
          <p>Your visit history will appear here</p>
        </div>
      ) : (
        history.visits.map((visit) => (
          <div key={visit._id} className="history-item">
            <div
              className="history-header"
              onClick={() => toggleExpand(visit._id)}
            >
              <div className="history-date">
                <FiCalendar />
                <div className="date-info">
                  <span>{formatDate(visit.admissionDate)}</span>
                  <span className={`reason-badge ${getReasonBadgeClass(visit.reason)}`}>
                    {visit.reason}
                  </span>
                </div>
              </div>
              <div className="history-summary">
                <span className="visit-title">
                  {visit.title || `${visit.reason.charAt(0).toUpperCase() + visit.reason.slice(1)} Visit`}
                </span>
                <div className="visit-meta">
                  {visit.supervisingDoctor && (
                    <span className="doctor-info">
                      <FiUser /> Dr. {visit.supervisingDoctor.fullName}
                    </span>
                  )}
                  <span className="hospital-info">
                    <FiMapPin /> {visit.hospitalName || 'EXIR Medical Center'}
                  </span>
                </div>
              </div>
              <span className={`status-badge ${getStatusClass(visit.status)}`}>
                {visit.status === 'admitted' ? 'Active' : 'Discharged'}
              </span>
              {expandedId === visit._id ? <FiChevronUp /> : <FiChevronDown />}
            </div>

            {expandedId === visit._id && (
              <div className="history-details">
                {/* Visit Information */}
                <div className="visit-info-section">
                  <div className="detail-row">
                    <div className="detail-section">
                      <h4>Visit Title</h4>
                      <p>{visit.title || 'General Visit'}</p>
                    </div>
                    <div className="detail-section">
                      <h4>Reason</h4>
                      <span className={`reason-badge large ${getReasonBadgeClass(visit.reason)}`}>
                        {visit.reason}
                      </span>
                    </div>
                    <div className="detail-section">
                      <h4>Hospital</h4>
                      <p><FiMapPin className="inline-icon" /> {visit.hospitalName || 'EXIR Medical Center'}</p>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-section">
                      <h4>Admission Date</h4>
                      <p>{formatDateTime(visit.admissionDate)}</p>
                    </div>
                    {visit.dischargeDate && (
                      <div className="detail-section">
                        <h4>Discharge Date</h4>
                        <p>{formatDateTime(visit.dischargeDate)}</p>
                      </div>
                    )}
                    {visit.supervisingDoctor && (
                      <div className="detail-section">
                        <h4>Supervising Doctor</h4>
                        <p>Dr. {visit.supervisingDoctor.fullName}</p>
                        <span className="sub-info">{visit.supervisingDoctor.specialization}</span>
                      </div>
                    )}
                  </div>

                  {visit.description && (
                    <div className="detail-section">
                      <h4>Description</h4>
                      <p className="description-text">{visit.description}</p>
                    </div>
                  )}
                </div>

                {/* Medical Records Section */}
                {visit.medicalRecords && visit.medicalRecords.length > 0 && (
                  <div className="records-section">
                    <h4><FiFileText /> Test Results & Documents</h4>
                    <div className="records-grid">
                      {visit.medicalRecords.map((record) => (
                        <div key={record._id} className="record-card">
                          <div className="record-header">
                            {getRecordIcon(record.recordType)}
                            <div className="record-info">
                              <span className="record-name">{record.fileName}</span>
                              <span className={`record-type-badge ${record.recordType}`}>
                                {record.recordType}
                              </span>
                            </div>
                          </div>
                          {record.description && (
                            <p className="record-description">{record.description}</p>
                          )}
                          <div className="record-footer">
                            <span className="record-meta">
                              <FiUser /> {record.uploadedBy}
                            </span>
                            <span className="record-date">{formatDate(record.createdAt)}</span>
                          </div>
                          <button
                            className="download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(record);
                            }}
                          >
                            <FiDownload /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing Section */}
                {visit.billing && (
                  <div className="billing-section">
                    <h4><FiDollarSign /> Billing Information</h4>
                    <div className="billing-grid">
                      <div className="billing-item">
                        <span className="label">Total Amount</span>
                        <span className="value">{visit.billing.totalAmount} EGP</span>
                      </div>
                      <div className="billing-item">
                        <span className="label">Paid Amount</span>
                        <span className="value success">{visit.billing.paidAmount} EGP</span>
                      </div>
                      <div className="billing-item">
                        <span className="label">Due Amount</span>
                        <span className={`value ${visit.billing.dueAmount > 0 ? 'danger' : 'success'}`}>
                          {visit.billing.dueAmount} EGP
                        </span>
                      </div>
                      <div className="billing-item">
                        <span className="label">Status</span>
                        <span className={`status-badge ${getStatusClass(visit.billing.paymentStatus)}`}>
                          {visit.billing.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {visit.billing.items && visit.billing.items.length > 0 && (
                      <div className="billing-items">
                        <h5>Billing Items</h5>
                        <table>
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visit.billing.items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.description}</td>
                                <td>{item.amount} EGP</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderAppointmentsTab = () => (
    <div className="history-list">
      {history.appointments.length === 0 ? (
        <div className="empty-state">
          <FiCalendar className="empty-icon" />
          <h3>No Appointments</h3>
          <p>Your appointment history will appear here</p>
        </div>
      ) : (
        history.appointments.map((apt) => (
          <div key={apt._id} className="history-item">
            <div
              className="history-header"
              onClick={() => toggleExpand(apt._id)}
            >
              <div className="history-date">
                <FiCalendar />
                <div className="date-time">
                  <span>{formatDate(apt.date)}</span>
                  <span className="time">{apt.time}</span>
                </div>
              </div>
              <div className="history-summary">
                <span className="appointment-doctor">
                  <FiUser /> {apt.doctorId?.fullName || apt.doctorName || 'Doctor'}
                </span>
                <span className="appointment-dept">{apt.department}</span>
              </div>          
              {expandedId === apt._id ? <FiChevronUp /> : <FiChevronDown />}
            </div>

            {expandedId === apt._id && (
              <div className="history-details">
                <div className="detail-row">
                  <div className="detail-section">
                    <h4>Doctor</h4>
                    <p>{apt.doctorId?.fullName || apt.doctorName}</p>
                  </div>
                  <div className="detail-section">
                    <h4>Specialization</h4>
                    <p>{apt.doctorId?.specialization || apt.department}</p>
                  </div>
                  <div className="detail-section">
                    <h4>Department</h4>
                    <p>{apt.department}</p>
                  </div>
                </div>

                <div className="detail-section notes-section">
                  <h4><FiClipboard /> Doctor's Notes</h4>
                  <div className="notes-content">
                    {apt.notes ? (
                      <p>{apt.notes}</p>
                    ) : (
                      <p className="no-notes">No notes available for this appointment</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderCasesTab = () => (
    <div className="history-list">
      {history.cases.length === 0 ? (
        <div className="empty-state">
          <FiFileText className="empty-icon" />
          <h3>No Medical Cases</h3>
          <p>Your medical cases will appear here</p>
        </div>
      ) : (
        history.cases.map((caseItem) => (
          <div key={caseItem._id} className="history-item">
            <div
              className="history-header"
              onClick={() => toggleExpand(caseItem._id)}
            >
              <div className="history-date">
                <FiActivity />
                <span>{formatDate(caseItem.createdAt)}</span>
              </div>
              <div className="history-summary">
                {/* <span className="case-diagnosis">
                  {caseItem.diagnosis || 'No diagnosis recorded'}
                </span> */}
                <span className="case-doctor">
                  <FiUser /> Dr. {caseItem.doctor?.fullName || 'Unknown'}
                </span>
              </div>
              <span className={`status-badge ${getStatusClass(caseItem.status)}`}>
                {caseItem.status}
              </span>
              {expandedId === caseItem._id ? <FiChevronUp /> : <FiChevronDown />}
            </div>

            {expandedId === caseItem._id && (
              <div className="history-details">
                <div className="detail-row">
                  <div className="detail-section">
                    <h4>Doctor</h4>
                    <p>Dr. {caseItem.doctor?.fullName || 'Unknown'}</p>
                    <span className="sub-info">{caseItem.doctor?.specialization}</span>
                  </div>
                  <div className="detail-section">
                    <h4>Patient Status</h4>
                    <span className={`status-badge ${caseItem.patientStatus === 'critical' ? 'danger' : 'success'}`}>
                      {caseItem.patientStatus}
                    </span>
                  </div>
                  {caseItem.closedAt && (
                    <div className="detail-section">
                      <h4>Closed At</h4>
                      <p>{formatDateTime(caseItem.closedAt)}</p>
                    </div>
                  )}
                </div>

                {/* <div className="detail-section">
                  <h4>Diagnosis</h4>
                  <p>{caseItem.diagnosis || 'No diagnosis recorded'}</p>
                </div>

                <div className="detail-section">
                  <h4>Treatment Plan</h4>
                  <p>{caseItem.treatmentPlan || 'No treatment plan recorded'}</p>
                </div> */}

                {caseItem.notes && (
                  <div className="detail-section notes-section">
                    <h4><FiClipboard /> Doctor's Notes</h4>
                    <div className="notes-content">
                      <p>{caseItem.notes}</p>
                    </div>
                  </div>
                )}

                {caseItem.medications && caseItem.medications.length > 0 && (
                  <div className="medications-section">
                    <h4><FiHeart /> Medications</h4>
                    <div className="medications-grid">
                      {caseItem.medications.map((med, idx) => (
                        <div key={idx} className="medication-card">
                          <div className="med-name">{med.medicineName}</div>
                          <div className="med-info">
                            <span>{med.timesPerDay}x daily</span>
                            <span className={`status-badge small ${getStatusClass(med.status === 'given' ? 'completed' : 'pending')}`}>
                              {med.status}
                            </span>
                          </div>
                          {med.note && <div className="med-note">{med.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medical History</h1>
        <p>View your complete medical history, visits, and billing</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'visits' ? 'active' : ''}`}
          onClick={() => setActiveTab('visits')}
        >
          <FiActivity /> Visits ({history.visits.length})
        </button>
        <button
          className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <FiCalendar /> Appointments ({history.appointments.length})
        </button>
        <button
          className={`tab ${activeTab === 'cases' ? 'active' : ''}`}
          onClick={() => setActiveTab('cases')}
        >
          <FiFileText /> Medical Cases ({history.cases.length})
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading medical history...</p>
            </div>
          ) : (
            <>
              {activeTab === 'visits' && renderVisitsTab()}
              {activeTab === 'appointments' && renderAppointmentsTab()}
              {activeTab === 'cases' && renderCasesTab()}
            </>
          )}
        </div>
      </div>

      <style>{`
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 0;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: none;
          border: none;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }
        .tab:hover {
          color: var(--accent-blue);
        }
        .tab.active {
          color: var(--accent-blue);
          border-bottom-color: var(--accent-blue);
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-muted);
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
          gap: 1rem;
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
          min-width: 140px;
          color: var(--accent-blue);
          font-weight: 500;
        }
        .date-time {
          display: flex;
          flex-direction: column;
        }
        .date-time .time {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .history-summary {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .visit-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .billing-preview {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .payment-status {
          font-size: 0.75rem;
        }
        .appointment-doctor, .case-doctor {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-weight: 500;
        }
        .appointment-dept, .case-diagnosis {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .status-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .status-badge.small {
          padding: 0.125rem 0.5rem;
          font-size: 0.7rem;
        }
        .status-icon {
          font-size: 1rem;
        }
        .status-icon.success { color: var(--accent-green); }
        .status-icon.warning { color: var(--accent-orange); }
        .status-icon.danger { color: var(--accent-red); }
        .history-details {
          padding: 1.25rem;
          background: var(--bg-light);
          border-top: 1px solid var(--border-color);
        }
        .detail-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .detail-section {
          margin-bottom: 1rem;
        }
        .detail-section:last-child {
          margin-bottom: 0;
        }
        .detail-section h4 {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .detail-section p {
          font-size: 0.9rem;
        }
        .sub-info {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .notes-section {
          background: white;
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .notes-content {
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .no-notes {
          color: var(--text-muted);
          font-style: italic;
        }
        .billing-section {
          background: white;
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .billing-section h4 {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .billing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .billing-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .billing-item .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .billing-item .value {
          font-weight: 600;
          font-size: 1rem;
        }
        .billing-item .value.success { color: var(--accent-green); }
        .billing-item .value.danger { color: var(--accent-red); }
        .billing-items {
          margin-top: 1rem;
        }
        .billing-items h5 {
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .billing-items table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .billing-items th, .billing-items td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .billing-items th {
          font-weight: 600;
          color: var(--text-secondary);
        }
        .medications-section {
          margin-top: 1rem;
        }
        .medications-section h4 {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 0.75rem;
        }
        .medications-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .medication-card {
          background: white;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .med-name {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .med-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .med-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
          font-style: italic;
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
        .empty-state h3 {
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: var(--text-secondary);
        }

        /* Visit specific styles */
        .date-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .visit-title {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .visit-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .doctor-info, .hospital-info {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .reason-badge {
          display: inline-flex;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: capitalize;
          background: var(--bg-light);
          color: var(--text-secondary);
        }
        .reason-badge.large {
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
        }
        .reason-badge.success { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
        .reason-badge.warning { background: rgba(245, 158, 11, 0.1); color: var(--accent-orange); }
        .reason-badge.danger { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }
        .reason-badge.info { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
        .reason-badge.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .reason-badge.secondary { background: var(--bg-light); color: var(--text-secondary); }

        .visit-info-section {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .description-text {
          background: white;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          line-height: 1.5;
        }
        .inline-icon {
          font-size: 0.85rem;
          vertical-align: middle;
          margin-right: 0.25rem;
        }

        /* Medical Records Section */
        .records-section {
          background: white;
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }
        .records-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .record-card {
          background: var(--bg-light);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all 0.2s;
        }
        .record-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .record-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .record-icon {
          font-size: 1.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: var(--radius-md);
        }
        .record-icon.lab { color: var(--accent-blue); }
        .record-icon.imaging { color: #8b5cf6; }
        .record-icon.report { color: var(--accent-orange); }
        .record-info {
          flex: 1;
        }
        .record-name {
          display: block;
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }
        .record-type-badge {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          text-transform: capitalize;
          background: var(--bg-light);
        }
        .record-type-badge.lab { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
        .record-type-badge.imaging { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .record-type-badge.report { background: rgba(245, 158, 11, 0.1); color: var(--accent-orange); }
        .record-description {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .record-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .record-meta {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .download-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: var(--primary-blue);
        }

        @media (max-width: 768px) {
          .tabs {
            flex-wrap: wrap;
          }
          .tab {
            flex: 1;
            justify-content: center;
            padding: 0.625rem 0.75rem;
            font-size: 0.8rem;
          }
          .history-header {
            flex-wrap: wrap;
          }
          .history-date {
            min-width: 100%;
            margin-bottom: 0.5rem;
          }
          .visit-meta {
            flex-direction: column;
            gap: 0.25rem;
          }
          .detail-row {
            grid-template-columns: 1fr;
          }
          .records-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientHistory;
