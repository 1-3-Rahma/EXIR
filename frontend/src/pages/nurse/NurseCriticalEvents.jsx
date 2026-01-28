import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { nurseAPI } from '../../services/api';
import { FiAlertTriangle, FiClock, FiCheckCircle } from 'react-icons/fi';

const NurseCriticalEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriticalEvents();
  }, []);

  const fetchCriticalEvents = async () => {
    try {
      const response = await nurseAPI.getCriticalEvents();
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch critical events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} hours ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleRespond = (eventId) => {
    console.log('Responding to event:', eventId);
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Priority Cases</h1>
        <p>Critical alerts requiring immediate attention</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading critical events...</p>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <FiCheckCircle className="empty-icon" />
              <h3>All Clear</h3>
              <p>No critical events at the moment</p>
            </div>
          ) : (
            <div className="alert-list">
              {events.map((event, index) => (
                <div key={event._id || index} className="alert-card priority">
                  <div className="alert-badge">
                    <FiAlertTriangle />
                  </div>
                  <div className="alert-info">
                    <div className="alert-patient">
                      <strong>{event.patientName || `Patient ${index + 1}`}</strong>
                      <span className="room-badge">
                        Room {event.room || `${300 + index}A`}
                      </span>
                    </div>
                    <p className="alert-reason">{event.reason || event.message}</p>
                    <div className="alert-meta">
                      <span className="alert-time">
                        <FiClock /> {formatTime(event.createdAt)}
                      </span>
                      <span className="alert-type">{event.type || 'Vital Alert'}</span>
                    </div>
                  </div>
                  <button
                    className="respond-btn"
                    onClick={() => handleRespond(event._id)}
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .alert-card.priority {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--accent-red);
          border-left: 4px solid var(--accent-red);
          border-radius: var(--radius-md);
          background: rgba(239, 68, 68, 0.02);
          margin-bottom: 1rem;
        }
        .alert-badge {
          width: 40px;
          height: 40px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red);
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .alert-info {
          flex: 1;
        }
        .alert-patient {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .alert-patient strong {
          font-size: 1rem;
        }
        .alert-reason {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .alert-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .alert-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .alert-type {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
          border-radius: var(--radius-sm);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--accent-green);
          margin-bottom: 1rem;
        }
        .empty-state h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: var(--text-secondary);
        }
      `}</style>
    </Layout>
  );
};

export default NurseCriticalEvents;
