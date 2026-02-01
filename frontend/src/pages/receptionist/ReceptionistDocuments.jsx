import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import {
  FiSearch, FiFileText, FiX, FiDownload,
  FiCheckCircle, FiAlertCircle, FiUpload, FiEye, FiTrash2
} from 'react-icons/fi';

const ReceptionistDocuments = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async (search = '') => {
    setLoading(true);
    try {
      const response = await receptionistAPI.getAllPatientsWithDocuments(search);
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadPatients(searchTerm);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openPatientDocuments = async (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    setLoadingDocuments(true);
    try {
      const response = await receptionistAPI.getPatientDocuments(patient._id);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments(null);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
    setDocuments(null);
    setViewingDocument(null);
  };

  const handleFileUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      await receptionistAPI.uploadPatientDocument(selectedPatient._id, formData);

      // Refresh documents
      const response = await receptionistAPI.getPatientDocuments(selectedPatient._id);
      setDocuments(response.data);

      // Refresh patients list to update status
      loadPatients(searchTerm);

      alert(`${documentType === 'nationalID' ? 'National ID' : 'Insurance Card'} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleViewDocument = async (documentType) => {
    try {
      const response = await receptionistAPI.downloadPatientDocument(selectedPatient._id, documentType);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);

      // Check if it's an image or PDF
      const contentType = response.headers['content-type'];
      if (contentType.startsWith('image/') || contentType === 'application/pdf') {
        setViewingDocument({
          type: documentType,
          url: url,
          contentType: contentType
        });
      } else {
        // Download instead
        const link = document.createElement('a');
        link.href = url;
        link.download = documents.documents[documentType]?.originalName || `${documentType}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (documentType) => {
    try {
      const response = await receptionistAPI.downloadPatientDocument(selectedPatient._id, documentType);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documents.documents[documentType]?.originalName || `${documentType}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentType) => {
    if (documentType === 'nationalID') {
      alert('National ID document cannot be deleted. It can only be replaced.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await receptionistAPI.deletePatientDocument(selectedPatient._id, documentType);

      // Refresh documents
      const response = await receptionistAPI.getPatientDocuments(selectedPatient._id);
      setDocuments(response.data);

      // Refresh patients list
      loadPatients(searchTerm);

      alert('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const closeDocumentViewer = () => {
    if (viewingDocument?.url) {
      URL.revokeObjectURL(viewingDocument.url);
    }
    setViewingDocument(null);
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Patient Documents</h1>
        <p>Manage patient identification documents</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          Search
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <FiFileText className="empty-icon" />
          <p>No patients found</p>
        </div>
      ) : (
        <div className="patients-grid">
          {patients.map((patient) => (
            <div
              key={patient._id}
              className="patient-card"
              onClick={() => openPatientDocuments(patient)}
            >
              <div className="patient-avatar">
                {patient.fullName?.charAt(0) || 'P'}
              </div>
              <div className="patient-info">
                <span className="patient-name">{patient.fullName}</span>
                <span className="patient-id">ID: {patient.nationalID}</span>
                <span className="patient-phone">{patient.phone}</span>
              </div>
              <div className="document-status">
                <div className={`status-item ${patient.hasNationalID ? 'has-doc' : 'no-doc'}`}>
                  <FiFileText />
                  <span>National ID</span>
                  {patient.hasNationalID ? <FiCheckCircle className="check" /> : <FiAlertCircle className="alert" />}
                </div>
                <div className={`status-item ${patient.hasInsuranceCard ? 'has-doc' : 'no-doc'}`}>
                  <FiFileText />
                  <span>Insurance</span>
                  {patient.hasInsuranceCard ? <FiCheckCircle className="check" /> : <span className="optional">(Optional)</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Modal */}
      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content documents-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Patient Documents</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {loadingDocuments ? (
                <div className="loading-state">Loading documents...</div>
              ) : !documents ? (
                <div className="error-state">Failed to load documents</div>
              ) : (
                <>
                  <div className="patient-header">
                    <div className="patient-avatar-large">
                      {documents.patientName?.charAt(0) || 'P'}
                    </div>
                    <div className="patient-details">
                      <h3>{documents.patientName}</h3>
                      <span>National ID: {documents.nationalIDNumber}</span>
                    </div>
                  </div>

                  <div className="documents-section">
                    {/* National ID Document */}
                    <div className="document-card">
                      <div className="document-header">
                        <FiFileText className="doc-icon" />
                        <div className="doc-info">
                          <h4>National ID</h4>
                          <span className="required-badge">Required</span>
                        </div>
                      </div>
                      {documents.documents.nationalID ? (
                        <div className="document-details">
                          <p className="file-name">{documents.documents.nationalID.originalName}</p>
                          <p className="file-meta">
                            Uploaded: {new Date(documents.documents.nationalID.uploadedAt).toLocaleDateString()}
                          </p>
                          <div className="document-actions">
                            <button className="action-btn view" onClick={() => handleViewDocument('nationalID')}>
                              <FiEye /> View
                            </button>
                            <button className="action-btn download" onClick={() => handleDownloadDocument('nationalID')}>
                              <FiDownload /> Download
                            </button>
                            <label className="action-btn upload">
                              <FiUpload /> Replace
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleFileUpload(e, 'nationalID')}
                                disabled={uploading}
                                hidden
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="no-document">
                          <FiAlertCircle className="warning-icon" />
                          <p>No document uploaded</p>
                          <label className="upload-btn">
                            <FiUpload /> Upload National ID
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => handleFileUpload(e, 'nationalID')}
                              disabled={uploading}
                              hidden
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Insurance Card Document */}
                    <div className="document-card">
                      <div className="document-header">
                        <FiFileText className="doc-icon" />
                        <div className="doc-info">
                          <h4>Insurance Card</h4>
                          <span className="optional-badge">Optional</span>
                        </div>
                      </div>
                      {documents.documents.insuranceCard ? (
                        <div className="document-details">
                          <p className="file-name">{documents.documents.insuranceCard.originalName}</p>
                          <p className="file-meta">
                            Uploaded: {new Date(documents.documents.insuranceCard.uploadedAt).toLocaleDateString()}
                          </p>
                          <div className="document-actions">
                            <button className="action-btn view" onClick={() => handleViewDocument('insuranceCard')}>
                              <FiEye /> View
                            </button>
                            <button className="action-btn download" onClick={() => handleDownloadDocument('insuranceCard')}>
                              <FiDownload /> Download
                            </button>
                            <label className="action-btn upload">
                              <FiUpload /> Replace
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => handleFileUpload(e, 'insuranceCard')}
                                disabled={uploading}
                                hidden
                              />
                            </label>
                            <button className="action-btn delete" onClick={() => handleDeleteDocument('insuranceCard')}>
                              <FiTrash2 /> Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="no-document optional">
                          <p>No insurance card uploaded</p>
                          <label className="upload-btn secondary">
                            <FiUpload /> Upload Insurance Card
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => handleFileUpload(e, 'insuranceCard')}
                              disabled={uploading}
                              hidden
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="file-format-info">
                    <p>Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="modal-overlay viewer-overlay" onClick={closeDocumentViewer}>
          <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <h3>{viewingDocument.type === 'nationalID' ? 'National ID' : 'Insurance Card'}</h3>
              <button className="modal-close" onClick={closeDocumentViewer}>
                <FiX />
              </button>
            </div>
            <div className="viewer-content">
              {viewingDocument.contentType === 'application/pdf' ? (
                <iframe
                  src={viewingDocument.url}
                  title="Document Viewer"
                  className="pdf-viewer"
                />
              ) : (
                <img src={viewingDocument.url} alt="Document" className="image-viewer" />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-white);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0 1rem;
        }
        .search-input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          padding: 0.75rem 0;
          font-size: 0.9rem;
          background: transparent;
        }
        .search-btn {
          padding: 0.75rem 1.5rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
        }
        .search-btn:disabled {
          opacity: 0.6;
        }
        .loading-state, .empty-state, .error-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .patients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .patient-card {
          background: var(--bg-white);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .patient-card:hover {
          border-color: var(--accent-blue);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .patient-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .patient-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .patient-name {
          font-weight: 600;
          font-size: 1rem;
        }
        .patient-id, .patient-phone {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .document-status {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
        }
        .status-item.has-doc {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-item.no-doc {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .status-item .check {
          color: var(--accent-green);
        }
        .status-item .alert {
          color: #ef4444;
        }
        .status-item .optional {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: white;
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: white;
          z-index: 1;
        }
        .modal-header h2 {
          font-size: 1.1rem;
          font-weight: 600;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .patient-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .patient-avatar-large {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .patient-details h3 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .patient-details span {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .documents-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .document-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }
        .document-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .doc-icon {
          font-size: 1.5rem;
          color: var(--accent-blue);
        }
        .doc-info h4 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .required-badge {
          font-size: 0.7rem;
          padding: 0.125rem 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: var(--radius-full);
        }
        .optional-badge {
          font-size: 0.7rem;
          padding: 0.125rem 0.5rem;
          background: var(--bg-light);
          color: var(--text-secondary);
          border-radius: var(--radius-full);
        }
        .document-details .file-name {
          font-weight: 500;
          margin-bottom: 0.25rem;
          word-break: break-all;
        }
        .document-details .file-meta {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        .document-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          cursor: pointer;
          border: 1px solid var(--border-color);
          background: white;
          transition: all 0.2s;
        }
        .action-btn.view {
          color: var(--accent-blue);
          border-color: var(--accent-blue);
        }
        .action-btn.view:hover {
          background: rgba(59, 130, 246, 0.1);
        }
        .action-btn.download {
          color: var(--accent-green);
          border-color: var(--accent-green);
        }
        .action-btn.download:hover {
          background: rgba(34, 197, 94, 0.1);
        }
        .action-btn.upload {
          color: var(--accent-orange);
          border-color: var(--accent-orange);
        }
        .action-btn.upload:hover {
          background: rgba(249, 115, 22, 0.1);
        }
        .action-btn.delete {
          color: #ef4444;
          border-color: #ef4444;
        }
        .action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        .no-document {
          text-align: center;
          padding: 1.5rem;
          background: rgba(239, 68, 68, 0.05);
          border-radius: var(--radius-md);
        }
        .no-document.optional {
          background: var(--bg-light);
        }
        .no-document .warning-icon {
          font-size: 2rem;
          color: #ef4444;
          margin-bottom: 0.5rem;
        }
        .no-document p {
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }
        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.9rem;
          transition: opacity 0.2s;
        }
        .upload-btn:hover {
          opacity: 0.9;
        }
        .upload-btn.secondary {
          background: var(--text-secondary);
        }
        .file-format-info {
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .file-format-info p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .viewer-overlay {
          z-index: 1100;
          background: rgba(0, 0, 0, 0.85);
        }
        .viewer-modal {
          background: white;
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .viewer-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .viewer-content {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: #f1f5f9;
        }
        .pdf-viewer {
          width: 100%;
          height: 70vh;
          border: none;
        }
        .image-viewer {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: var(--radius-md);
        }
        @media (max-width: 768px) {
          .patients-grid {
            grid-template-columns: 1fr;
          }
          .document-actions {
            flex-direction: column;
          }
          .action-btn {
            justify-content: center;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistDocuments;
