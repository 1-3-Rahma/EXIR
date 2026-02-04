import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI, medicalRecordAPI } from '../../services/api';
import { FiDownload, FiFile, FiImage, FiFileText, FiSearch, FiHeart, FiUser, FiCheckCircle, FiClock } from 'react-icons/fi';

const PatientRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecords();
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

  const getFileIcon = (type, source) => {
    if (source === 'prescription') {
      return <FiHeart className="file-icon prescription" />;
    }
    switch (type) {
      case 'lab':
        return <FiFileText className="file-icon lab" />;
      case 'imaging':
        return <FiImage className="file-icon imaging" />;
      case 'report':
        return <FiFileText className="file-icon report" />;
      default:
        return <FiFile className="file-icon" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownload = async (record) => {
    if (record.source === 'prescription') return; // Prescriptions can't be downloaded as files

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

  // Filter records based on selected filter and search term
  const filteredRecords = records.filter(r => {
    // Filter by type
    if (filter !== 'all' && r.recordType !== filter) {
      return false;
    }
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        (r.fileName || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.uploadedBy || '').toLowerCase().includes(term)
      );
    }
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

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medical Records</h1>
        <p>View and download your medical documents and prescriptions</p>
      </div>

      <div className="records-toolbar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({records.length})
          </button>
          <button
            className={filter === 'lab' ? 'active' : ''}
            onClick={() => setFilter('lab')}
          >
            Lab Results
          </button>
          <button
            className={filter === 'imaging' ? 'active' : ''}
            onClick={() => setFilter('imaging')}
          >
            Imaging
          </button>
          <button
            className={filter === 'prescription' ? 'active' : ''}
            onClick={() => setFilter('prescription')}
          >
            Prescriptions
          </button>
          <button
            className={filter === 'report' ? 'active' : ''}
            onClick={() => setFilter('report')}
          >
            Reports
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <FiFile className="empty-icon" />
              <h3>No Records Found</h3>
              <p>{filter !== 'all' ? `No ${filter} records available` : 'Your medical records will appear here'}</p>
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
                      <p className="record-diagnosis">Diagnosis: {record.diagnosis}</p>
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
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(record)}
                    >
                      <FiDownload /> Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="records-count">
        Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}
      </div>

      <style>{`
        .records-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-white);
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          min-width: 250px;
        }
        .search-box input {
          border: none;
          outline: none;
          font-size: 0.9rem;
          flex: 1;
        }
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
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
        .filter-tabs button:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .filter-tabs button.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
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
        .record-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .record-card.prescription-card {
          border-left: 3px solid var(--accent-green);
          background: rgba(34, 197, 94, 0.02);
        }
        .record-icon {
          margin-bottom: 1rem;
        }
        .file-icon {
          font-size: 2rem;
          color: var(--text-muted);
        }
        .file-icon.lab { color: var(--accent-blue); }
        .file-icon.imaging { color: #8b5cf6; }
        .file-icon.prescription { color: var(--accent-green); }
        .file-icon.report { color: var(--accent-orange); }
        .record-info {
          flex: 1;
          margin-bottom: 1rem;
        }
        .record-info h3 {
          font-size: 0.95rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          word-break: break-word;
        }
        .record-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }
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
        .status-badge.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .record-description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .record-diagnosis {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
          margin-bottom: 0.5rem;
        }
        .record-footer {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .record-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .record-doctor {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
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
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: var(--primary-blue);
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
        .records-count {
          text-align: center;
          padding: 1rem;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .records-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-box {
            min-width: 100%;
          }
          .filter-tabs {
            justify-content: center;
          }
          .records-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientRecords;
