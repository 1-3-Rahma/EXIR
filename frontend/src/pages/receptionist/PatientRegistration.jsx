import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMail, FiMapPin, FiCreditCard,
  FiCalendar, FiUsers, FiAlertCircle, FiCheck, FiArrowLeft
} from 'react-icons/fi';

const PatientRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: 'male',
    phone: '',
    email: '',
    nationalID: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.nationalID.trim()) return 'National ID is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (formData.age && (isNaN(formData.age) || formData.age < 0 || formData.age > 150)) {
      return 'Please enter a valid age';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await receptionistAPI.registerPatient({
        ...formData,
        dateOfBirth: formData.age ? calculateDOB(formData.age) : null,
        contactInfo: formData.address,
        emergencyContact: formData.emergencyContactName
          ? `${formData.emergencyContactName} (${formData.emergencyContactRelation}) - ${formData.emergencyContactPhone}`
          : ''
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/receptionist/patients/${response.data.patient._id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const calculateDOB = (age) => {
    const today = new Date();
    return new Date(today.getFullYear() - parseInt(age), 0, 1).toISOString();
  };

  if (success) {
    return (
      <Layout appName="MedHub" role="receptionist">
        <div className="success-screen">
          <div className="success-icon">
            <FiCheck />
          </div>
          <h2>Patient Registered Successfully!</h2>
          <p>Redirecting to patient profile...</p>
        </div>

        <style>{`
          .success-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: var(--accent-green);
            margin-bottom: 1.5rem;
          }
          .success-screen h2 {
            margin-bottom: 0.5rem;
            color: var(--accent-green);
          }
          .success-screen p {
            color: var(--text-secondary);
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h1>Register New Patient</h1>
        <p>Enter patient information to create a new record</p>
      </div>

      {error && (
        <div className="error-banner">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        {/* Personal Information */}
        <div className="form-section">
          <h3><FiUser /> Personal Information</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age"
                min="0"
                max="150"
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>National ID *</label>
              <div className="input-with-icon">
                <FiCreditCard />
                <input
                  type="text"
                  name="nationalID"
                  value={formData.nationalID}
                  onChange={handleChange}
                  placeholder="Enter national ID number"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h3><FiPhone /> Contact Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Phone Number *</label>
              <div className="input-with-icon">
                <FiPhone />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <FiMail />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <div className="input-with-icon">
                <FiMapPin />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="form-section">
          <h3><FiUsers /> Emergency Contact</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
              />
            </div>

            <div className="form-group">
              <label>Relationship</label>
              <select
                name="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Contact Phone</label>
              <div className="input-with-icon">
                <FiPhone />
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>

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
        .back-btn:hover {
          color: var(--accent-blue);
        }
        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: var(--accent-red);
          margin-bottom: 1.5rem;
        }
        .registration-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-section {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }
        .form-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-with-icon input,
        .input-with-icon textarea {
          width: 100%;
          padding-left: 2.75rem;
        }
        .input-with-icon textarea + svg,
        .input-with-icon svg:has(+ textarea) {
          top: 1rem;
          transform: none;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
        }
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cancel-btn:hover {
          border-color: var(--text-secondary);
        }
        .submit-btn {
          padding: 0.75rem 2rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--primary-blue);
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: 1;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientRegistration;
