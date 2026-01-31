import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import {
  FiGrid, FiUsers, FiActivity, FiAlertTriangle, FiMessageSquare,
  FiSettings, FiUser, FiLogOut, FiFileText, FiDollarSign,
  FiCalendar, FiClipboard, FiHeart, FiFolder, FiClock, FiPackage
} from 'react-icons/fi';

const Sidebar = ({ appName, role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (role !== 'doctor') return;
    const fetchUnread = async () => {
      try {
        const res = await notificationAPI.getUnreadCount();
        const count = res.data?.count ?? 0;
        setUnreadCount(typeof count === 'number' ? count : 0);
      } catch (_) {
        setUnreadCount(0);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    switch (role) {
      case 'nurse':
        return [
          { path: '/nurse', icon: FiGrid, label: 'Dashboard', exact: true },
          { path: '/nurse/patients', icon: FiUsers, label: 'Patients' },
          { path: '/nurse/vitals', icon: FiActivity, label: 'Vitals' },
          { path: '/nurse/medications', icon: FiPackage, label: 'Medications' },
          { path: '/nurse/tasks', icon: FiClipboard, label: 'Tasks' },
          { path: '/nurse/messages', icon: FiMessageSquare, label: 'Messages' }
        ];
      case 'doctor':
        return [
          { path: '/doctor', icon: FiGrid, label: 'Dashboard', exact: true },
          { path: '/doctor/nurses', icon: FiUsers, label: 'Nurses' },
          { path: '/doctor/patients', icon: FiHeart, label: 'Patients' },
          { path: '/doctor/priority-cases', icon: FiAlertTriangle, label: 'Priority Cases' },
          { path: '/doctor/tasks', icon: FiClipboard, label: 'Tasks' },
          { path: '/doctor/messages', icon: FiMessageSquare, label: 'Messages' }
        ];
      case 'patient':
        return [
          { path: '/patient', icon: FiGrid, label: 'Dashboard', exact: true },
          { path: '/patient/history', icon: FiFileText, label: 'History' },
          { path: '/patient/records', icon: FiFolder, label: 'Medical Records' },
          { path: '/patient/documents', icon: FiClipboard, label: 'Documents' },
          { path: '/patient/medications', icon: FiHeart, label: 'Medications' },
          { path: '/patient/profile', icon: FiUser, label: 'Profile' }
        ];
      case 'receptionist':
        return [
          { path: '/receptionist', icon: FiGrid, label: 'Dashboard', exact: true },
          { path: '/receptionist/patients', icon: FiUsers, label: 'Patients' },
          { path: '/receptionist/billing', icon: FiDollarSign, label: 'Billing' },
          { path: '/receptionist/visits', icon: FiClock, label: 'Visits' },
          { path: '/receptionist/appointments', icon: FiCalendar, label: 'Appointments' },
          { path: '/receptionist/documents', icon: FiFolder, label: 'Documents' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getUserSubtitle = () => {
    switch (role) {
      case 'nurse':
        return `${user?.ward || 'ICU Ward'} - ${user?.shift || 'Shift 1'}`;
      case 'doctor':
        return user?.specialization || 'Cardiology';
      case 'patient':
        return user?.patientId || 'PT-2024-5789';
      case 'receptionist':
        return 'Reception Desk';
      default:
        return '';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">{appName.charAt(0)}</span>
          <div className="logo-text">
            <h1>{appName}</h1>
            <span>Healthcare Management</span>
          </div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.fullName?.charAt(0) || 'U'}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.fullName || 'User'}</span>
          <span className="user-role">{getUserSubtitle()}</span>
        </div>
        {role === 'doctor' && unreadCount > 0 && (
          <div className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {(role === 'nurse' || role === 'doctor' || role === 'receptionist') ? (
          <NavLink to={`/${role}/profile`} className="nav-item">
            <FiUser className="nav-icon" />
            <span>Profile</span>
          </NavLink>
        ) : (
          <NavLink to={`/${role}/settings`} className="nav-item">
            <FiSettings className="nav-icon" />
            <span>Settings</span>
          </NavLink>
        )}
        {role === 'patient' && (
          <NavLink to="/patient/profile" className="nav-item">
            <FiUser className="nav-icon" />
            <span>Profile</span>
          </NavLink>
        )}
        <button onClick={handleLogout} className="nav-item logout-btn">
          <FiLogOut className="nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
