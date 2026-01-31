import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import {
  FiUser, FiPhone, FiCreditCard, FiCalendar, FiDollarSign,
  FiFileText, FiAlertCircle, FiCheckCircle, FiArrowLeft, FiUsers
} from 'react-icons/fi';

const PatientProfile = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [billing, setBilling] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const [patientRes, billingRes, visitsRes] = await Promise.all([
        receptionistAPI.getPatient(patientId),
        receptionistAPI.getPatientBilling(patientId).catch(() => ({ data: null })),
        receptionistAPI.getPatientVisits(patientId).catch(() => ({ data: [] }))
      ]);

      setPatient(patientRes.data);
      setBilling(billingRes.data);
      setVisits(visitsRes.data || []);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const formatGender = (gender) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const getStatus = () => {
    const activeVisit = visits.find(v => v.status === 'active');
    if (activeVisit) return { label: 'Admitted', color: 'blue' };
    return { label: 'Active', color: 'green' };
  };

  const hasPendingDocuments = () => {
    return false;
  };

  const hasPendingPayments = () => {
    return billing?.dueAmount > 0;
  };

  const getLastVisitDate = () => {
    if (patient?.lastVisitDate) {
      return new Date(patient.lastVisitDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    // Fallback to registration date if no lastVisitDate
    if (patient?.createdAt) {
      return new Date(patient.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return 'No visits yet';
  };

  if (loading) {
    return (
      <Layout appName="MedHub" role="receptionist">
        <div className="loading-state">Loading patient profile...</div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout appName="MedHub" role="receptionist">
        <div className="error-state">
          <FiAlertCircle className="error-icon" />
          <h2>Patient Not Found</h2>
          <button onClick={() => navigate('/receptionist/patients')}>
            Back to Patients
          </button>
        </div>
      </Layout>
    );
  }

  const status = getStatus();
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <h1>Patient Profile</h1>
      </div>

      {/* Patient Header Card */}
      <div className="profile-header">
        <div className="profile-avatar">
          {patient.fullName?.charAt(0) || 'P'}
        </div>
        <div className="profile-info">
          <h2>{patient.fullName}</h2>
          <p className="patient-id">
            <FiCreditCard /> {patient.nationalID}
          </p>
          {age !== null && (
            <p className="patient-age">{age} years old</p>
          )}
        </div>
        <div className="profile-status">
          <span className={`status-badge ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="status-indicators">
        {hasPendingDocuments() && (
          <div className="indicator warning">
            <FiFileText />
            <span>Pending Documents</span>
          </div>
        )}
        {hasPendingPayments() && (
          <div className="indicator danger">
            <FiDollarSign />
            <span>Pending Payments: ${billing?.dueAmount?.toLocaleString()}</span>
          </div>
        )}
        {!hasPendingDocuments() && !hasPendingPayments() && (
          <div className="indicator success">
            <FiCheckCircle />
            <span>All Clear</span>
          </div>
        )}
      </div>

      <div className="profile-grid">
        {/* Personal Information */}
        <div className="profile-section">
          <h3><FiUser /> Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Full Name</span>
              <span className="info-value">{patient.fullName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">National ID / Passport</span>
              <span className="info-value">{patient.nationalID}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender</span>
              <span className="info-value">{formatGender(patient.gender)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Date of Birth</span>
              <span className="info-value">
                {patient.dateOfBirth
                  ? `${new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} (${age} years)`
                  : 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="profile-section">
          <h3><FiPhone /> Contact Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Phone Number</span>
              <span className="info-value">{patient.phone || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email Address</span>
              <span className="info-value">{patient.email || 'N/A'}</span>
            </div>
            <div className="info-item full-width">
              <span className="info-label">Address</span>
              <span className="info-value">{patient.address || patient.contactInfo || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="profile-section">
          <h3><FiUsers /> Emergency Contact</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Contact Name</span>
              <span className="info-value">{patient.emergencyContactName || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Relationship</span>
              <span className="info-value">{patient.emergencyContactRelation || 'N/A'}</span>
            </div>
            <div className="info-item full-width">
              <span className="info-label">Contact Phone</span>
              <span className="info-value">{patient.emergencyContactPhone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Visit Summary */}
        <div className="profile-section">
          <h3><FiCalendar /> Visit Summary</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Last Visit</span>
              <span className="info-value">{getLastVisitDate()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Visits</span>
              <span className="info-value highlight">{patient.totalVisits || 1}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Registration Date</span>
              <span className="info-value">
                {patient.createdAt
                  ? new Date(patient.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Status</span>
              <span className={`info-value ${status.color === 'blue' ? 'warning' : 'success'}`}>
                {status.label}
              </span>
            </div>
          </div>
          <Link to={`/receptionist/patients/${patientId}/visits`} className="section-link">
            View Full Visit History →
          </Link>
        </div>

        {/* Financial Summary */}
        <div className="profile-section">
          <h3><FiDollarSign /> Financial Summary</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Total Billed</span>
              <span className="info-value">${billing?.totalAmount?.toLocaleString() || '0'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Paid</span>
              <span className="info-value success">${billing?.paidAmount?.toLocaleString() || '0'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Outstanding</span>
              <span className={`info-value ${billing?.dueAmount > 0 ? 'danger' : ''}`}>
                ${billing?.dueAmount?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={`info-value ${billing?.paymentStatus === 'paid' ? 'success' : 'warning'}`}>
                {billing?.paymentStatus || 'No bills'}
              </span>
            </div>
          </div>
          <Link to={`/receptionist/patients/${patientId}/billing`} className="section-link">
            View Full Billing Details →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-bar">
        <Link to={`/receptionist/appointments/new?patient=${patientId}`} className="action-btn">
          <FiCalendar /> Schedule Appointment
        </Link>
        <Link to={`/receptionist/patients/${patientId}/documents`} className="action-btn">
          <FiFileText /> Manage Documents
        </Link>
        <Link to={`/receptionist/patients/${patientId}/billing`} className="action-btn primary">
          <FiDollarSign /> Process Payment
        </Link>
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
        .back-btn:hover {
          color: var(--accent-blue);
        }
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
        }
        .error-state {
          text-align: center;
          padding: 3rem;
        }
        .error-icon {
          font-size: 3rem;
          color: var(--accent-red);
          margin-bottom: 1rem;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: var(--bg-white);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }
        .profile-avatar {
          width: 72px;
          height: 72px;
          background: var(--accent-blue);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 600;
        }
        .profile-info {
          flex: 1;
        }
        .profile-info h2 {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }
        .patient-id {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .patient-age {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }
        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .status-badge.green {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-badge.blue {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .status-indicators {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .indicator.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .indicator.warning {
          background: rgba(249, 115, 22, 0.1);
          color: var(--accent-orange);
        }
        .indicator.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .profile-section {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          border: 1px solid var(--border-color);
        }
        .profile-section h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .info-item.full-width {
          grid-column: 1 / -1;
        }
        .info-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .info-value {
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .info-value.highlight {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--accent-blue);
        }
        .info-value.success { color: var(--accent-green); }
        .info-value.warning { color: var(--accent-orange); }
        .info-value.danger { color: var(--accent-red); }
        .section-link {
          display: inline-block;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: var(--accent-blue);
          text-decoration: none;
        }
        .section-link:hover {
          text-decoration: underline;
        }
        .quick-actions-bar {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        .quick-actions-bar .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-white);
          color: var(--text-primary);
          font-size: 0.9rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-actions-bar .action-btn:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        .quick-actions-bar .action-btn.primary {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: white;
        }
        .quick-actions-bar .action-btn.primary:hover {
          background: var(--primary-blue);
        }
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .quick-actions-bar {
            flex-direction: column;
          }
          .status-indicators {
            flex-direction: column;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientProfile;
