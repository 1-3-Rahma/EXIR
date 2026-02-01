import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiPhone, FiMail, FiMapPin, FiCreditCard,
  FiCalendar, FiUsers, FiAlertCircle, FiCheck, FiArrowLeft,
  FiFileText, FiUpload, FiX
} from 'react-icons/fi';

const PatientRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [idType, setIdType] = useState('nationalID'); // 'nationalID' or 'passport'

  // Document uploads
  const [nationalIDFile, setNationalIDFile] = useState(null);
  const [insuranceCardFile, setInsuranceCardFile] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    nationalID: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: ''
  });

  const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Validate National ID: exactly 14 digits
  const validateNationalID = (id) => {
    const nationalIDRegex = /^\d{14}$/;
    return nationalIDRegex.test(id);
  };

  // Validate Passport: 1 letter + 7 or 8 numbers (total 8 or 9 characters)
  const validatePassport = (passport) => {
    const passportRegex = /^[A-Za-z]\d{7,8}$/;
    return passportRegex.test(passport);
  };

  // Validate phone number: exactly 11 digits
  const validatePhone = (phone) => {
    const phoneRegex = /^\d{11}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required';

    if (!formData.nationalID.trim()) {
      return idType === 'nationalID' ? 'National ID is required' : 'Passport number is required';
    }

    // Validate ID based on type
    if (idType === 'nationalID') {
      if (!validateNationalID(formData.nationalID)) {
        return 'National ID must be exactly 14 digits';
      }
    } else {
      if (!validatePassport(formData.nationalID)) {
        return 'Passport must be 1 letter followed by 7 or 8 numbers (e.g., A12345678)';
      }
    }

    if (!formData.gender) return 'Gender is required';
    if (!formData.phone.trim()) return 'Phone number is required';

    // Validate phone number is exactly 11 digits
    if (!validatePhone(formData.phone)) {
      return 'Phone number must be exactly 11 digits';
    }

    if (!formData.dateOfBirth) return 'Date of birth is required';

    // Validate date of birth is not in the future
    const dob = new Date(formData.dateOfBirth);
    if (dob > new Date()) {
      return 'Date of birth cannot be in the future';
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    // Address is required
    if (!formData.address.trim()) return 'Address is required';

    // Emergency contact info is required
    if (!formData.emergencyContactName.trim()) return 'Emergency contact name is required';
    if (!formData.emergencyContactPhone.trim()) return 'Emergency contact phone is required';

    // Validate emergency contact phone is exactly 11 digits
    if (!validatePhone(formData.emergencyContactPhone)) {
      return 'Emergency contact phone must be exactly 11 digits';
    }

    if (!formData.emergencyContactRelation) return 'Emergency contact relationship is required';

    // National ID document is required
    if (!nationalIDFile) return 'National ID document is required';

    return null;
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError('File size exceeds 5MB limit.');
      e.target.value = '';
      return;
    }

    if (type === 'nationalID') {
      setNationalIDFile(file);
    } else {
      setInsuranceCardFile(file);
    }
    setError('');
  };

  const removeFile = (type) => {
    if (type === 'nationalID') {
      setNationalIDFile(null);
    } else {
      setInsuranceCardFile(null);
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
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
        nationalID: formData.nationalID.toUpperCase(),
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        contactInfo: formData.address,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation,
        emergencyContact: formData.emergencyContactName
          ? `${formData.emergencyContactName} (${formData.emergencyContactRelation}) - ${formData.emergencyContactPhone}`
          : ''
      });

      const patientId = response.data.patient._id;

      // Upload National ID document
      if (nationalIDFile) {
        const nationalIDFormData = new FormData();
        nationalIDFormData.append('file', nationalIDFile);
        nationalIDFormData.append('documentType', 'nationalID');
        await receptionistAPI.uploadPatientDocument(patientId, nationalIDFormData);
      }

      // Upload Insurance Card if provided
      if (insuranceCardFile) {
        const insuranceFormData = new FormData();
        insuranceFormData.append('file', insuranceCardFile);
        insuranceFormData.append('documentType', 'insuranceCard');
        await receptionistAPI.uploadPatientDocument(patientId, insuranceFormData);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/receptionist/patients/${patientId}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
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
              <label>Date of Birth *</label>
              <div className="input-with-icon">
                <FiCalendar />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              {formData.dateOfBirth && (
                <span className="age-display">
                  Age: {calculateAge(formData.dateOfBirth)} years
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className={!formData.gender ? 'placeholder' : ''}
              >
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>ID Type *</label>
              <div className="id-type-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${idType === 'nationalID' ? 'active' : ''}`}
                  onClick={() => { setIdType('nationalID'); setFormData(prev => ({ ...prev, nationalID: '' })); }}
                >
                  National ID (14 digits)
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${idType === 'passport' ? 'active' : ''}`}
                  onClick={() => { setIdType('passport'); setFormData(prev => ({ ...prev, nationalID: '' })); }}
                >
                  Passport (1 letter + 7-8 numbers)
                </button>
              </div>
            </div>

            <div className="form-group full-width">
              <label>{idType === 'nationalID' ? 'National ID *' : 'Passport Number *'}</label>
              <div className="input-with-icon">
                <FiCreditCard />
                <input
                  type="text"
                  name="nationalID"
                  value={formData.nationalID}
                  onChange={handleChange}
                  placeholder={idType === 'nationalID' ? 'Enter 14-digit National ID' : 'Enter passport (e.g., A12345678)'}
                  maxLength={idType === 'nationalID' ? 14 : 9}
                  required
                />
              </div>
              <span className="input-hint">
                {idType === 'nationalID'
                  ? `${formData.nationalID.length}/14 digits`
                  : `Format: 1 letter + 7-8 numbers (${formData.nationalID.length}/9 characters)`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h3><FiPhone /> Contact Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Phone Number * (11 digits)</label>
              <div className="input-with-icon">
                <FiPhone />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter 11-digit phone number"
                  maxLength={11}
                  required
                />
              </div>
              <span className="input-hint">{formData.phone.length}/11 digits</span>
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
              <label>Address *</label>
              <div className="input-with-icon textarea-icon">
                <FiMapPin />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="form-section">
          <h3><FiUsers /> Emergency Contact *</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Contact Name *</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact name"
                required
              />
            </div>

            <div className="form-group">
              <label>Relationship *</label>
              <select
                name="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
                required
                className={!formData.emergencyContactRelation ? 'placeholder' : ''}
              >
                <option value="" disabled>Select relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Contact Phone * (11 digits)</label>
              <div className="input-with-icon">
                <FiPhone />
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  maxLength={11}
                  required
                  placeholder="Enter 11-digit phone number"
                />
              </div>
              <span className="input-hint">{formData.emergencyContactPhone.length}/11 digits</span>
            </div>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="form-section">
          <h3><FiFileText /> Document Uploads</h3>
          <p className="section-description">Upload patient identification documents. Accepted formats: JPG, PNG, PDF (Max 5MB)</p>

          <div className="documents-upload-grid">
            {/* National ID Document */}
            <div className="upload-item">
              <div className="upload-label">
                <span className="doc-title">National ID / Passport Document *</span>
                <span className="required-tag">Required</span>
              </div>
              {nationalIDFile ? (
                <div className="file-preview">
                  <FiFileText className="file-icon" />
                  <div className="file-info">
                    <span className="file-name">{nationalIDFile.name}</span>
                    <span className="file-size">{(nationalIDFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button type="button" className="remove-file" onClick={() => removeFile('nationalID')}>
                    <FiX />
                  </button>
                </div>
              ) : (
                <label className="upload-box">
                  <FiUpload className="upload-icon" />
                  <span>Click to upload National ID</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'nationalID')}
                    hidden
                  />
                </label>
              )}
            </div>

            {/* Insurance Card Document */}
            <div className="upload-item">
              <div className="upload-label">
                <span className="doc-title">Insurance Card</span>
                <span className="optional-tag">Optional</span>
              </div>
              {insuranceCardFile ? (
                <div className="file-preview">
                  <FiFileText className="file-icon" />
                  <div className="file-info">
                    <span className="file-name">{insuranceCardFile.name}</span>
                    <span className="file-size">{(insuranceCardFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button type="button" className="remove-file" onClick={() => removeFile('insuranceCard')}>
                    <FiX />
                  </button>
                </div>
              ) : (
                <label className="upload-box optional">
                  <FiUpload className="upload-icon" />
                  <span>Click to upload Insurance Card</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'insuranceCard')}
                    hidden
                  />
                </label>
              )}
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
        .form-group select.placeholder {
          color: var(--text-muted);
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
        .input-with-icon.textarea-icon svg {
          top: 1rem;
          transform: none;
        }
        .input-with-icon input,
        .input-with-icon textarea {
          width: 100%;
          padding-left: 2.75rem;
        }
        .age-display {
          font-size: 0.8rem;
          color: var(--accent-blue);
          font-weight: 500;
        }
        .input-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .id-type-toggle {
          display: flex;
          gap: 0.5rem;
        }
        .toggle-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-light);
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-btn:hover {
          border-color: var(--accent-blue);
        }
        .toggle-btn.active {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
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
        .section-description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
        }
        .documents-upload-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .upload-item {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .upload-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .doc-title {
          font-weight: 500;
          font-size: 0.9rem;
        }
        .required-tag {
          font-size: 0.7rem;
          padding: 0.125rem 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: var(--radius-full);
        }
        .optional-tag {
          font-size: 0.7rem;
          padding: 0.125rem 0.5rem;
          background: var(--bg-light);
          color: var(--text-muted);
          border-radius: var(--radius-full);
        }
        .upload-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-light);
        }
        .upload-box:hover {
          border-color: var(--accent-blue);
          background: rgba(59, 130, 246, 0.05);
        }
        .upload-box.optional {
          border-style: dashed;
        }
        .upload-icon {
          font-size: 1.5rem;
          color: var(--text-muted);
        }
        .upload-box span {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .file-preview {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-lg);
        }
        .file-preview .file-icon {
          font-size: 1.5rem;
          color: var(--accent-green);
        }
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .file-name {
          font-size: 0.85rem;
          font-weight: 500;
          word-break: break-all;
        }
        .file-size {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .remove-file {
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: var(--radius-full);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .remove-file:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: 1;
          }
          .id-type-toggle {
            flex-direction: column;
          }
          .documents-upload-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientRegistration;
