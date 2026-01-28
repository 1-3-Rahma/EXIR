import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI } from '../../services/api';
import { FiDownload, FiFile, FiImage, FiFileText, FiSearch, FiFilter } from 'react-icons/fi';

const PatientRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const getFileIcon = (type) => {
    switch (type) {
      case 'lab_result':
        return <FiFileText className="file-icon lab" />;
      case 'imaging':
        return <FiImage className="file-icon imaging" />;
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

  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => r.recordType === filter);

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medical Records</h1>
        <p>View and download your medical documents</p>
      </div>

      <div className="records-toolbar">
        <div className="search-box">
          <FiSearch />
          <input type="text" placeholder="Search records..." />
        </div>
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'lab_result' ? 'active' : ''}
            onClick={() => setFilter('lab_result')}
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
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading records...</p>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <FiFile className="empty-icon" />
              <h3>No Records Found</h3>
              <p>Your medical records will appear here</p>
            </div>
          ) : (
            <div className="records-grid">
              {filteredRecords.map((record) => (
                <div key={record._id} className="record-card">
                  <div className="record-icon">
                    {getFileIcon(record.recordType)}
                  </div>
                  <div className="record-info">
                    <h3>{record.fileName}</h3>
                    <span className="record-type">{record.recordType?.replace('_', ' ')}</span>
                    <span className="record-date">{formatDate(record.createdAt)}</span>
                  </div>
                  <a
                    href={record.fileUrl}
                    className="download-btn"
                    download
                  >
                    <FiDownload /> Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
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
        .records-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
        .record-icon {
          margin-bottom: 1rem;
        }
        .file-icon {
          font-size: 2rem;
          color: var(--text-muted);
        }
        .file-icon.lab { color: var(--accent-blue); }
        .file-icon.imaging { color: var(--accent-purple); }
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
        .record-type {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: var(--bg-light);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
          margin-right: 0.5rem;
        }
        .record-date {
          font-size: 0.75rem;
          color: var(--text-muted);
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
      `}</style>
    </Layout>
  );
};

export default PatientRecords;
