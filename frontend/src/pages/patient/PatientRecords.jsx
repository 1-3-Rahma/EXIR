import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/common/Layout';
import { patientAPI, medicalRecordAPI } from '../../services/api';
import {
  FiDownload, FiFile, FiImage, FiFileText,
  FiHeart, FiUser, FiCheckCircle, FiClock, FiActivity
} from 'react-icons/fi';

const formatBP = (bp) => {
  const { t } = useTranslation();
  if (!bp) return 'N/A';
  if (bp.systolic != null && bp.diastolic != null) return `${bp.systolic}/${bp.diastolic}`;
  return 'N/A';
};

const getRiskColor = (risk) => {
  const r = String(risk || '').toLowerCase();
  if (r === 'critical') return '#ef4444';
  if (r === 'abnormal') return '#f59e0b';
  if (r === 'normal' || r === 'stable') return '#22c55e';
  return '#64748b';
};

const PatientRecords = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('lab');

  const [vitals, setVitals] = useState([]);
  const [vitalsLoading, setVitalsLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
    fetchVitals();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await patientAPI.downloadRecords();
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVitals = async () => {
    try {
      const response = await patientAPI.getVitals();
      setVitals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
    } finally {
      setVitalsLoading(false);
    }
  };

  const getFileIcon = (type, source) => {
    if (source === 'prescription') return <FiHeart className="file-icon prescription" />;
    switch (type) {
      case 'lab': return <FiFileText className="file-icon lab" />;
      case 'imaging': return <FiImage className="file-icon imaging" />;
      case 'report': return <FiFileText className="file-icon report" />;
      default: return <FiFile className="file-icon" />;
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatDateTime = (date) =>
    date ? new Date(date).toLocaleString() : 'N/A';

  const handleDownload = async (record) => {
    if (record.source === 'prescription') return;
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

  const filteredRecords = records.filter(r => {
    if (filter !== 'vitals' && r.recordType !== filter) return false;
    return true;
  });

  const getRecordTypeBadgeClass = (type) => {
    switch (type) {
      case 'lab': return 'lab';
      case 'imaging': return 'imaging';
      case 'prescription': return 'prescription';
      case 'report': return 'report';
      default: return '';
    }
  };

  const showVitalsTab = filter === 'vitals';
  const showRecordsTab = !showVitalsTab;

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>{t('medicalRecords.title')}</h1>
        <p>{t('medicalRecords.viewMedicalDocs')}</p>
      </div>

      <div className="records-toolbar">
        <div className="filter-tabs">
          <button className={filter === 'lab' ? 'active' : ''} onClick={() => setFilter('lab')}>
            {t('medicalRecords.labResults')}
          </button>
          <button className={filter === 'imaging' ? 'active' : ''} onClick={() => setFilter('imaging')}>
            {t('medicalRecords.imaging')}
          </button>
          <button className={filter === 'prescription' ? 'active' : ''} onClick={() => setFilter('prescription')}>
            {t('medicalRecords.prescriptions')}
          </button>
          <button className={filter === 'report' ? 'active' : ''} onClick={() => setFilter('report')}>
            {t('medicalRecords.reports')}
          </button>
          <button className={filter === 'vitals' ? 'active' : ''} onClick={() => setFilter('vitals')}>
            {t('medicalRecords.vitalsHistory')} ({vitals.length})
          </button>
        </div>
      </div>

      {/* ── Vitals History Section ─────────────────────────────────────────── */}
      {showVitalsTab && (
        <div className="card">
          <div className="card-body">
            {vitalsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{t('medicalRecords.loadingVitalsHistory')}</p>
              </div>
            ) : vitals.length === 0 ? (
              <div className="empty-state">
                <FiActivity className="empty-icon" />
                <h3>{t('medicalRecords.noVitalsFound')}</h3>
                <p>{t('medicalRecords.vitalsWillAppear')}</p>
              </div>
            ) : (
              <div className="vitals-table-wrapper">
                <table className="vitals-hist-table">
                  <thead>
                    <tr>
                      <th>{t('medicalRecords.dateTime')}</th>
                      <th>{t('medicalRecords.heartRate')}</th>
                      <th>{t('medicalRecords.spo2')}</th>
                      <th>{t('medicalRecords.temperature')}</th>
                      <th>{t('medicalRecords.bloodPressure')}</th>
                      <th>{t('medicalRecords.riskLevel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.map((v) => (
                      <tr key={v._id}>
                        <td className="td-date">{formatDateTime(v.createdAt)}</td>
                        <td>{v.heartRate != null ? `${v.heartRate} bpm` : 'N/A'}</td>
                        <td>{v.spo2 != null ? `${v.spo2}%` : 'N/A'}</td>
                        <td>{v.temperature != null ? `${v.temperature}°C` : 'N/A'}</td>
                        <td>{formatBP(v.bloodPressure)}</td>
                        <td>
                          <span
                            className="risk-badge"
                            style={{ color: getRiskColor(v.riskLevel) }}
                          >
                            {v.riskLevel || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Medical Records Section ───────────────────────────────────────── */}
      {showRecordsTab && (
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{t('medicalRecords.loadingRecords')}</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state">
                <FiFile className="empty-icon" />
                <h3>{t('medicalRecords.noRecordsFound')}</h3>
                <p>{t('medicalRecords.noRecordsAvailable', { filter })}</p>
              </div>
            ) : (
              <div className="records-grid">
                {filteredRecords.map((record) => (
                  <div key={record._id} className={`record-card ${record.source === 'prescription' ? 'prescription-card' : ''}`}>
                    <div className="record-icon">
                      {getFileIcon(record.recordType, record.source)}
                    </div>
                    <div className="record-info">
                      <h3>{record.fileName}</h3>
                      <div className="record-meta">
                        <span className={`record-type ${getRecordTypeBadgeClass(record.recordType)}`}>
                          {record.recordType}
                        </span>
                        {record.source === 'prescription' && record.status && (
                          <span className={`status-badge ${record.status === 'given' ? 'success' : 'warning'}`}>
                            {record.status === 'given' ? <FiCheckCircle /> : <FiClock />}
                            {record.status}
                          </span>
                        )}
                      </div>
                      {record.description && (
                        <p className="record-description">{record.description}</p>
                      )}
                      {record.diagnosis && (
                        <p className="record-diagnosis">{t('medicalRecords.diagnosisLabel')} {record.diagnosis}</p>
                      )}
                      <div className="record-footer">
                        <span className="record-date">{formatDate(record.createdAt)}</span>
                        <span className="record-doctor">
                          <FiUser /> {record.uploadedBy}
                          {record.doctorSpecialization && ` (${record.doctorSpecialization})`}
                        </span>
                      </div>
                    </div>
                    {record.source === 'file' && (
                      <button className="download-btn" onClick={() => handleDownload(record)}>
                        <FiDownload /> {t('common.download')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showRecordsTab && (
        <div className="records-count">
          {records.length !== 1
            ? t('medicalRecords.showingPlural', { count: filteredRecords.length, total: records.length })
            : t('medicalRecords.showing', { count: filteredRecords.length, total: records.length })}
        </div>
      )}

      <style>{`
        .records-toolbar {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .filter-tabs button {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-white);
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-tabs button:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .filter-tabs button.active { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .record-card {
          display: flex;
          flex-direction: column;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }
        .record-card:hover { border-color: var(--accent-blue); box-shadow: var(--shadow-sm); }
        .record-card.prescription-card {
          border-left: 3px solid var(--accent-green);
          background: rgba(34, 197, 94, 0.02);
        }
        .record-icon { margin-bottom: 1rem; }
        .file-icon { font-size: 2rem; color: var(--text-muted); }
        .file-icon.lab { color: var(--accent-blue); }
        .file-icon.imaging { color: #8b5cf6; }
        .file-icon.prescription { color: var(--accent-green); }
        .file-icon.report { color: var(--accent-orange); }
        .record-info { flex: 1; margin-bottom: 1rem; }
        .record-info h3 { font-size: 0.95rem; font-weight: 500; margin-bottom: 0.5rem; word-break: break-word; }
        .record-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .record-type {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: var(--bg-light);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
        }
        .record-type.lab { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
        .record-type.imaging { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .record-type.prescription { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
        .record-type.report { background: rgba(245, 158, 11, 0.1); color: var(--accent-orange); }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.success { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
        .status-badge.warning { background: rgba(245, 158, 11, 0.1); color: var(--accent-orange); }
        .record-description { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.4; }
        .record-diagnosis { font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-bottom: 0.5rem; }
        .record-footer { display: flex; flex-direction: column; gap: 0.25rem; }
        .record-date { font-size: 0.75rem; color: var(--text-muted); }
        .record-doctor { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8rem; color: var(--text-secondary); }
        .download-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .download-btn:hover { background: var(--primary-blue); }
        .empty-state { text-align: center; padding: 3rem; }
        .empty-icon { font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem; }
        .records-count { text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.9rem; }

        /* Vitals table */
        .vitals-table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .vitals-hist-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .vitals-hist-table th {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 0.8rem;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .vitals-hist-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          white-space: nowrap;
        }
        .vitals-hist-table tbody tr:last-child td { border-bottom: none; }
        .vitals-hist-table tbody tr:hover { background: #f8fafc; }
        .td-date { color: #64748b; font-size: 0.8rem; }
        .risk-badge { font-weight: 600; }

        @media (max-width: 768px) {
          .filter-tabs { justify-content: flex-start; flex-wrap: wrap; }
          .records-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
};

export default PatientRecords;
