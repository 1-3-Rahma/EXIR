import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { receptionistAPI, medicalRecordAPI } from '../../services/api';
import {
  FiFileText, FiUpload, FiDownload, FiTrash2, FiAlertCircle,
  FiCheckCircle, FiSearch, FiFilter, FiArrowLeft, FiFile,
  FiImage, FiPrinter
} from 'react-icons/fi';

const ReceptionistDocuments = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [patient, setPatient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const documentTypes = [
    { value: 'national_id', label: 'National ID', required: true },
    { value: 'insurance_card', label: 'Insurance Card', required: true },
    { value: 'medical_report', label: 'Medical Report', required: false },
    { value: 'lab_result', label: 'Lab Result', required: false },
    { value: 'prescription', label: 'Prescription', required: false },
    { value: 'other', label: 'Other', required: false }
  ];

  useEffect(() => {
    if (patientId) {
      fetchDocuments();
    }
  }, [patientId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [patientRes, docsRes] = await Promise.all([
        receptionistAPI.getPatient(patientId),
        medicalRecordAPI.getPatientRecords(patientId).catch(() => ({ data: [] }))
      ]);

      setPatient(patientRes.data);
      setDocuments(docsRes.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const documentType = prompt(
      'Select document type:\n1. National ID\n2. Insurance Card\n3. Medical Report\n4. Lab Result\n5. Prescription\n6. Other',
      '1'
    );

    const typeMap = {
      '1': 'national_id',
      '2': 'insurance_card',
      '3': 'medical_report',
      '4': 'lab_result',
      '5': 'prescription',
      '6': 'other'
    };

    const recordType = typeMap[documentType] || 'other';

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      formData.append('recordType', recordType);

      await medicalRecordAPI.uploadRecord(formData);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await medicalRecordAPI.deleteRecord(documentId);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getMissingDocuments = () => {
    const uploadedTypes = documents.map(d => d.recordType);
    return documentTypes.filter(dt => dt.required && !uploadedTypes.includes(dt.value));
  };

  const getFileIcon = (type) => {
    if (type?.includes('image')) return <FiImage className="file-icon image" />;
    return <FiFileText className="file-icon" />;
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter !== 'all' && doc.recordType !== filter) return false;
    if (searchTerm && !doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const missingDocs = getMissingDocuments();

  if (loading) {
    return (
      <Layout appName="MedHub" role="receptionist">
        <div className="loading-state">Loading documents...</div>
      </Layout>
    );
  }

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h1>Document Management</h1>
        {patient && <p>Managing documents for: {patient.fullName}</p>}
      </div>

      {/* Missing Documents Alert */}
      {missingDocs.length > 0 && (
        <div className="missing-alert">
          <FiAlertCircle />
          <div className="alert-content">
            <strong>Missing Required Documents</strong>
            <p>{missingDocs.map(d => d.label).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <FiUpload /> {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <button className="print-btn">
          <FiPrinter /> Print Hospital Forms
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All
          </button>
          {documentTypes.map(dt => (
            <button
              key={dt.value}
              className={filter === dt.value ? 'active' : ''}
              onClick={() => setFilter(dt.value)}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="card">
        <div className="card-body">
          {filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <FiFileText className="empty-icon" />
              <h3>No Documents</h3>
              <p>Upload documents using the button above</p>
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <div key={doc._id} className="document-card">
                  <div className="document-icon">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div className="document-info">
                    <span className="document-name">{doc.fileName}</span>
                    <span className="document-type">
                      {documentTypes.find(dt => dt.value === doc.recordType)?.label || doc.recordType}
                    </span>
                    <span className="document-date">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="document-actions">
                    <a
                      href={doc.fileUrl}
                      className="action-btn download"
                      download
                      title="Download"
                    >
                      <FiDownload />
                    </a>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(doc._id)}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div className="card checklist-card">
        <div className="card-header">
          <h2>Required Documents Checklist</h2>
        </div>
        <div className="card-body">
          <div className="checklist">
            {documentTypes.filter(dt => dt.required).map((dt) => {
              const isUploaded = documents.some(d => d.recordType === dt.value);
              return (
                <div key={dt.value} className={`checklist-item ${isUploaded ? 'completed' : ''}`}>
                  {isUploaded ? (
                    <FiCheckCircle className="check-icon success" />
                  ) : (
                    <FiAlertCircle className="check-icon pending" />
                  )}
                  <span>{dt.label}</span>
                  {!isUploaded && (
                    <button
                      className="upload-link"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          cursor: pointer;
          margin-bottom: 1rem;
          padding: 0;
        }
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .missing-alert {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(249, 115, 22, 0.1);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: var(--radius-md);
          color: var(--accent-orange);
          margin-bottom: 1.5rem;
        }
        .missing-alert svg {
          font-size: 1.25rem;
          margin-top: 0.1rem;
        }
        .alert-content strong {
          display: block;
          margin-bottom: 0.25rem;
        }
        .alert-content p {
          font-size: 0.85rem;
          opacity: 0.9;
        }
        .upload-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .upload-btn:disabled {
          opacity: 0.7;
        }
        .print-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-white);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-white);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          min-width: 200px;
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
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-white);
          font-size: 0.8rem;
          cursor: pointer;
        }
        .filter-tabs button.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
        }
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .document-card {
          display: flex;
          flex-direction: column;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }
        .document-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .document-icon {
          margin-bottom: 1rem;
        }
        .file-icon {
          font-size: 2.5rem;
          color: var(--accent-blue);
        }
        .file-icon.image {
          color: var(--accent-purple);
        }
        .document-info {
          flex: 1;
          margin-bottom: 1rem;
        }
        .document-name {
          display: block;
          font-weight: 500;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }
        .document-type {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          background: var(--bg-light);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-right: 0.5rem;
        }
        .document-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .document-actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .action-btn.download {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .action-btn.delete {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
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
        .checklist-card {
          margin-top: 1.5rem;
        }
        .checklist {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
        }
        .checklist-item.completed {
          background: rgba(34, 197, 94, 0.1);
        }
        .check-icon {
          font-size: 1.25rem;
        }
        .check-icon.success {
          color: var(--accent-green);
        }
        .check-icon.pending {
          color: var(--accent-orange);
        }
        .checklist-item span {
          flex: 1;
        }
        .upload-link {
          background: none;
          border: none;
          color: var(--accent-blue);
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistDocuments;
