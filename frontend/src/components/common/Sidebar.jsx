import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { notificationAPI } from '../../services/api';
import {
  FiGrid, FiUsers, FiActivity, FiAlertTriangle, FiMessageSquare,
  FiUser, FiLogOut, FiFileText, FiDollarSign,
  FiCalendar, FiClipboard, FiHeart, FiFolder, FiClock, FiPackage, FiX,
  FiGlobe
} from 'react-icons/fi';

const Sidebar = ({ appName, role, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { toggleLanguage, language } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (role !== 'doctor' && role !== 'nurse') return;
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
    const onRefresh = () => fetchUnread();
    window.addEventListener('refreshUnreadCount', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshUnreadCount', onRefresh);
    };
  }, [role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const getNavItems = () => {
    switch (role) {
      case 'nurse':
        return [
          { path: '/nurse', icon: FiGrid, label: t('nav.dashboard'), exact: true },
          { path: '/nurse/patients', icon: FiUsers, label: t('nav.patients') },
          { path: '/nurse/vitals', icon: FiActivity, label: t('nav.vitals') },
          { path: '/nurse/medications', icon: FiPackage, label: t('nav.medications') },
          { path: '/nurse/tasks', icon: FiClipboard, label: t('nav.tasks') },
          { path: '/nurse/messages', icon: FiMessageSquare, label: t('nav.messages') }
        ];
      case 'doctor':
        return [
          { path: '/doctor', icon: FiGrid, label: t('nav.dashboard'), exact: true },
          { path: '/doctor/nurses', icon: FiUsers, label: t('nav.nurses') },
          { path: '/doctor/patients', icon: FiHeart, label: t('nav.patients') },
          { path: '/doctor/priority-cases', icon: FiAlertTriangle, label: t('nav.priorityCases') },
          { path: '/doctor/tasks', icon: FiClipboard, label: t('nav.tasks') },
          { path: '/doctor/messages', icon: FiMessageSquare, label: t('nav.messages') }
        ];
      case 'patient':
        return [
          { path: '/patient', icon: FiGrid, label: t('nav.dashboard'), exact: true },
          { path: '/patient/history', icon: FiFileText, label: t('nav.history') },
          { path: '/patient/records', icon: FiFolder, label: t('nav.medicalRecords') },
          { path: '/patient/medications', icon: FiHeart, label: t('nav.medications') }
        ];
      case 'receptionist':
        return [
          { path: '/receptionist', icon: FiGrid, label: t('nav.dashboard'), exact: true },
          { path: '/receptionist/patients', icon: FiUsers, label: t('nav.patients') },
          { path: '/receptionist/billing', icon: FiDollarSign, label: t('nav.billing') },
          { path: '/receptionist/visits', icon: FiClock, label: t('nav.visits') },
          { path: '/receptionist/appointments', icon: FiCalendar, label: t('nav.appointments') },
          { path: '/receptionist/documents', icon: FiFolder, label: t('nav.documents') }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getUserSubtitle = () => {
    switch (role) {
      case 'nurse':
        return `${user?.ward || t('sidebar.icuWard')} - ${user?.shift || 'Shift 1'}`;
      case 'doctor':
        return user?.specialization || t('sidebar.cardiology');
      case 'receptionist':
        return t('sidebar.receptionDesk');
      default:
        return '';
    }
  };

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">{appName.charAt(0)}</span>
          <div className="logo-text">
            <h1>{appName}</h1>
            <span>{t('sidebar.healthcareManagement')}</span>
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <FiX size={20} />
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.fullName?.charAt(0) || 'U'}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.fullName || t('common.unknown')}</span>
          <span className="user-role">{getUserSubtitle()}</span>
        </div>
        {(role === 'doctor' || role === 'nurse') && unreadCount > 0 && (
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
            onClick={handleNavClick}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {(role === 'nurse' || role === 'doctor' || role === 'receptionist' || role === 'patient') && (
          <NavLink
            to={`/${role}/profile`}
            className="nav-item"
            onClick={handleNavClick}
          >
            <FiUser className="nav-icon" />
            <span>{t('nav.profile')}</span>
          </NavLink>
        )}

        <button onClick={toggleLanguage} className="nav-item lang-toggle-btn">
          <FiGlobe className="nav-icon" />
          <span>{t('lang.toggle')}</span>
        </button>

        <button onClick={handleLogout} className="nav-item logout-btn">
          <FiLogOut className="nav-icon" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
