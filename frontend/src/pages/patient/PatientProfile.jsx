import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { patientAPI } from '../../services/api';
import {
  FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiCreditCard,
  FiAlertCircle, FiActivity, FiClock, FiCheckCircle
} from 'react-icons/fi';

const PatientProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await patientAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  if (loading) {
    return (
      <Layout appName="Patient View" role="patient">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
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
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>View your personal and medical information</p>
      </div>

      <div className="profile-layout">
        {/* Profile Card */}
        <div className="profile-card main-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {profile?.fullName?.charAt(0) || user?.fullName?.charAt(0) || 'P'}
            </div>
            <div className="profile-name">
              <h2>{profile?.fullName || user?.fullName || 'Patient'}</h2>
              <span className="profile-id">
                <FiCreditCard /> {profile?.nationalID || 'N/A'}
              </span>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <FiActivity className="stat-icon" />
              <div className="stat-info">
                <span className="stat-value">{profile?.totalVisits || 0}</span>
                <span className="stat-label">Total Visits</span>
              </div>
            </div>
            <div className="stat-item">
              <FiClock className="stat-icon" />
              <div className="stat-info">
                <span className="stat-value">{profile?.lastVisitDate ? formatDate(profile.lastVisitDate) : 'N/A'}</span>
                <span className="stat-label">Last Visit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="card info-card">
          <div className="card-header">
            <h3><FiUser /> Personal Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{profile?.fullName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">National ID</span>
                <span className="info-value">{profile?.nationalID || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">
                  <FiCalendar className="info-icon" />
                  {formatDate(profile?.dateOfBirth)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{calculateAge(profile?.dateOfBirth)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value capitalize">{profile?.gender || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card info-card">
          <div className="card-header">
            <h3><FiPhone /> Contact Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Phone Number</span>
                <span className="info-value">
                  <FiPhone className="info-icon" />
                  {profile?.phone || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">
                  <FiMail className="info-icon" />
                  {profile?.email || 'N/A'}
                </span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Address</span>
                <span className="info-value">
                  <FiMapPin className="info-icon" />
                  {profile?.address || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card info-card">
          <div className="card-header">
            <h3><FiAlertCircle /> Emergency Contact</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Contact Name</span>
                <span className="info-value">{profile?.emergencyContactName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Relationship</span>
                <span className="info-value">{profile?.emergencyContactRelation || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone Number</span>
                <span className="info-value">
                  <FiPhone className="info-icon" />
                  {profile?.emergencyContactPhone || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="card info-card">
          <div className="card-header">
            <h3><FiCheckCircle /> Account Status</h3>
          </div>
          <div className="card-body">
            <div className="status-info">
              <div className="status-badge active">
                <FiCheckCircle />
                <span>Active Patient</span>
              </div>
              <p className="status-text">
                Your account is active and you have access to all patient services.
              </p>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Registered On</span>
                <span className="info-value">{formatDate(profile?.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .main-card {
          grid-column: 1 / -1;
        }
        .profile-card {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          padding: 1.5rem;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .profile-avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--accent-blue), #1d4ed8);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
        }
        .profile-name h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
        }
        .profile-id {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .profile-stats {
          display: flex;
          gap: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .stat-icon {
          font-size: 1.5rem;
          color: var(--accent-blue);
          padding: 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-md);
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-value {
          font-size: 1.125rem;
          font-weight: 600;
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .info-card .card-header {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }
        .info-card .card-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
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
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .info-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .info-value.capitalize {
          text-transform: capitalize;
        }
        .info-icon {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .status-info {
          margin-bottom: 1rem;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }
        .status-badge.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .profile-layout {
            grid-template-columns: 1fr;
          }
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
          .profile-stats {
            flex-direction: column;
            gap: 1rem;
          }
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientProfile;
