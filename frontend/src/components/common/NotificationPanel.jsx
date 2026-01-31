import React, { useState, useEffect } from 'react';
import { FiBell, FiAlertCircle, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { notificationAPI } from '../../services/api';

const NotificationPanel = ({ limit = 5 }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.slice(0, limit));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'critical':
        return <FiAlertCircle className="notification-icon critical" />;
      case 'success':
        return <FiCheckCircle className="notification-icon success" />;
      case 'assignment':
        return <FiAlertCircle className="notification-icon assignment" />;
      default:
        return <FiInfo className="notification-icon info" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="notification-panel">
        <div className="panel-header">
          <FiBell />
          <span>Notifications</span>
        </div>
        <div className="panel-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <div className="header-left">
          <FiBell />
          <span>Notifications</span>
        </div>
        {notifications.length > 0 && (
          <span className="notification-count">{notifications.length}</span>
        )}
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <p className="no-notifications">No new notifications</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${notification.type} ${notification.read ? 'read' : ''}`}
            >
              {getIcon(notification.type)}
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">{formatTime(notification.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <button className="view-all-btn">View All Notifications</button>
    </div>
  );
};

export default NotificationPanel;
