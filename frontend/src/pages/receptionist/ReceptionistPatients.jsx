import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import { FiUser, FiSearch, FiPlus, FiPhone, FiCalendar } from 'react-icons/fi';

const ReceptionistPatients = () => {
  const navigate = useNavigate();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nationalID: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: ''
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async (search = '') => {
    setLoading(true);
    try {
      const response = await receptionistAPI.getAllPatients(search);
      setPatients(response.data);
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

  const handlePatientClick = (patientId) => {
    navigate(`/receptionist/patients/${patientId}`);
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
        email: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
      });
      loadPatients();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Patient Management</h1>
        <p>View, search, and manage all patients</p>
      </div>

      <div className="action-bar">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
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
            <div className="loading-state">
              <p>Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <FiUser className="empty-icon" />
              <h3>No Patients Found</h3>
              <p>{searchTerm ? 'Try a different search term' : 'Register your first patient to get started'}</p>
            </div>
          ) : (
            <div className="patients-list">
              <div className="list-header">
                <span className="col-name">Patient Name</span>
                <span className="col-id">National ID</span>
                <span className="col-phone">Phone</span>
                <span className="col-visits">Visits</span>
                <span className="col-last-visit">Last Visit</span>
              </div>
              {patients.map((patient) => (
                <div
                  key={patient._id}
                  className="patient-row"
                  onClick={() => handlePatientClick(patient._id)}
                >
                  <div className="col-name">
                    <div className="patient-avatar">
                      <FiUser />
                    </div>
                    <div className="patient-info">
                      <span className="patient-name">{patient.fullName}</span>
                      <span className="patient-gender">{patient.gender}</span>
                    </div>
                  </div>
                  <span className="col-id">{patient.nationalID}</span>
                  <span className="col-phone">
                    <FiPhone className="icon-small" />
                    {patient.phone || 'N/A'}
                  </span>
                  <span className="col-visits">{patient.totalVisits || 1}</span>
                  <span className="col-last-visit">
                    <FiCalendar className="icon-small" />
                    {formatDate(patient.lastVisitDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="patients-count">
        Showing {patients.length} patient{patients.length !== 1 ? 's' : ''}
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
                  <label>Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="11 digits"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="section-title">Emergency Contact</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone *</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="11 digits"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Relationship *</label>
                <input
                  type="text"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  required
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
        .search-box button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
        .register-btn:hover {
          opacity: 0.9;
        }
        .loading-state,
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .patients-list {
          display: flex;
          flex-direction: column;
        }
        .list-header {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1fr 0.5fr 1fr;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .patient-row {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1fr 0.5fr 1fr;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .patient-row:hover {
          background-color: var(--bg-light);
        }
        .patient-row:last-child {
          border-bottom: none;
        }
        .col-name {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .patient-avatar {
          width: 40px;
          height: 40px;
          background: var(--bg-light);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          color: var(--text-secondary);
        }
        .patient-info {
          display: flex;
          flex-direction: column;
        }
        .patient-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .patient-gender {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .col-id {
          font-family: monospace;
          font-size: 0.9rem;
        }
        .col-phone,
        .col-last-visit {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .col-visits {
          font-weight: 500;
          text-align: center;
        }
        .icon-small {
          font-size: 0.85rem;
        }
        .patients-count {
          text-align: center;
          padding: 1rem;
          color: var(--text-muted);
          font-size: 0.9rem;
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
          margin-bottom: 1rem;
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
        .section-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin: 1.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
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
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistPatients;
