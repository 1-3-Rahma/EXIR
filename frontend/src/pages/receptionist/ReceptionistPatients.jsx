import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import { FiUser, FiSearch, FiPlus, FiEdit, FiEye } from 'react-icons/fi';

const ReceptionistPatients = () => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nationalID: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    contactInfo: '',
    emergencyContact: ''
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const response = await receptionistAPI.searchPatient(searchTerm);
      setSearchResults([response.data]);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await receptionistAPI.registerPatient(formData);
      alert('Patient registered successfully!');
      setShowRegisterModal(false);
      setFormData({
        nationalID: '',
        fullName: '',
        dateOfBirth: '',
        gender: 'male',
        phone: '',
        contactInfo: '',
        emergencyContact: ''
      });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Patient Management</h1>
        <p>Search, register, and manage patients</p>
      </div>

      <div className="action-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by National ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}>
            Search
          </button>
        </div>
        <button
          className="register-btn"
          onClick={() => setShowRegisterModal(true)}
        >
          <FiPlus /> Register New Patient
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Searching...</p>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <FiUser className="empty-icon" />
              <h3>Search for a Patient</h3>
              <p>Enter a National ID to find patient records</p>
            </div>
          ) : (
            <div className="results-list">
              {searchResults.map((patient) => (
                <div key={patient._id} className="result-card">
                  <div className="result-avatar">
                    <FiUser />
                  </div>
                  <div className="result-info">
                    <h3>{patient.fullName}</h3>
                    <p>National ID: {patient.nationalID}</p>
                    <p>Phone: {patient.phone || patient.contactInfo || 'N/A'}</p>
                  </div>
                  <div className="result-actions">
                    <button className="action-btn view">
                      <FiEye /> View
                    </button>
                    <button className="action-btn edit">
                      <FiEdit /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Register New Patient</h2>
              <button
                className="close-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRegister} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>National ID *</label>
                  <input
                    type="text"
                    value={formData.nationalID}
                    onChange={(e) => setFormData({ ...formData, nationalID: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }
        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-white);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem;
        }
        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
        }
        .search-box button {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
        }
        .register-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent-green);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
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
        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .result-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }
        .result-avatar {
          width: 56px;
          height: 56px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: var(--text-secondary);
        }
        .result-info {
          flex: 1;
        }
        .result-info h3 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .result-info p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .result-actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
        }
        .action-btn.view {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .action-btn.edit {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
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
        }
        .modal {
          background: var(--bg-white);
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
          padding: 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 {
          font-size: 1.25rem;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-muted);
        }
        .modal-body {
          padding: 1.25rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.625rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .cancel-btn {
          padding: 0.625rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          cursor: pointer;
        }
        .submit-btn {
          padding: 0.625rem 1.25rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistPatients;
