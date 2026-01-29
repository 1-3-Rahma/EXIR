import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiBriefcase } from 'react-icons/fi';

const DoctorProfile = () => {
  const { user } = useAuth();

  return (
    <Layout appName="EXIR" role="doctor">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your profile information</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-large">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div className="profile-title">
              <h2>{user?.fullName || 'Doctor'}</h2>
              <span className="role-badge">Doctor</span>
            </div>
          </div>

          <div className="profile-info">
            <div className="info-item">
              <div className="info-icon">
                <FiUser />
              </div>
              <div className="info-content">
                <label>Full Name</label>
                <span>{user?.fullName || 'Not set'}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                <FiBriefcase />
              </div>
              <div className="info-content">
                <label>Specialization</label>
                <span>{user?.specialization || 'Not set'}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                <FiUser />
              </div>
              <div className="info-content">
                <label>Identifier</label>
                <span>{user?.identifier || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page-header { margin-bottom: 1.5rem; }
        .page-header h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #1e293b; }
        .page-header p { color: #64748b; font-size: 0.9rem; }
        .profile-container { max-width: 500px; }
        .profile-card { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .profile-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .avatar-large { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: 600; flex-shrink: 0; }
        .profile-title h2 { font-size: 1.5rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem; }
        .role-badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }
        .profile-info { display: flex; flex-direction: column; gap: 1.25rem; }
        .info-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .info-icon { width: 44px; height: 44px; border-radius: 10px; background: #e0f2fe; color: #0ea5e9; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
        .info-content { display: flex; flex-direction: column; gap: 0.25rem; }
        .info-content label { font-size: 0.8rem; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-content span { font-size: 1.1rem; font-weight: 500; color: #1e293b; }
      `}</style>
    </Layout>
  );
};

export default DoctorProfile;
