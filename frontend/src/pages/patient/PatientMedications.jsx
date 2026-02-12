import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { patientAPI } from '../../services/api';
import {
  FiClock, FiCheckCircle, FiAlertCircle, FiInfo, FiSun,
  FiSunset, FiMoon, FiDroplet, FiUser, FiActivity
} from 'react-icons/fi';

const PatientMedications = () => {
  const [medicationsData, setMedicationsData] = useState({
    medications: [],
    medicationHistory: [],
    ivOrders: [],
    doctor: null,
    diagnosis: '',
    treatmentPlan: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await patientAPI.getMedications();
      setMedicationsData({
        medications: response.data.medications || [],
        medicationHistory: response.data.medicationHistory || [],
        ivOrders: response.data.ivOrders || [],
        doctor: response.data.doctor || null,
        diagnosis: response.data.diagnosis || '',
        treatmentPlan: response.data.treatmentPlan || ''
      });
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeToIcon = {
    morning: <FiSun className="dose-icon morning" />,
    afternoon: <FiSunset className="dose-icon afternoon" />,
    evening: <FiSunset className="dose-icon evening" />,
    night: <FiMoon className="dose-icon night" />
  };
  const timeToLabel = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

  // Use stored schedule if present, else derive from timesPerDay
  const getDoseSchedule = (med) => {
    const schedule = med.schedule && Array.isArray(med.schedule) && med.schedule.length > 0
      ? med.schedule
      : null;
    if (schedule) {
      const order = ['morning', 'afternoon', 'evening', 'night'];
      return [...schedule]
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map(s => ({ time: timeToLabel[s] || s, icon: timeToIcon[s] || <FiClock className="dose-icon" /> }));
    }
    const timesPerDay = med.timesPerDay;
    switch (timesPerDay) {
      case 1:
        return [{ time: 'Morning', icon: <FiSun className="dose-icon morning" /> }];
      case 2:
        return [
          { time: 'Morning', icon: <FiSun className="dose-icon morning" /> },
          { time: 'Evening', icon: <FiSunset className="dose-icon evening" /> }
        ];
      case 3:
        return [
          { time: 'Morning', icon: <FiSun className="dose-icon morning" /> },
          { time: 'Afternoon', icon: <FiSunset className="dose-icon afternoon" /> },
          { time: 'Night', icon: <FiMoon className="dose-icon night" /> }
        ];
      case 4:
        return [
          { time: 'Morning', icon: <FiSun className="dose-icon morning" /> },
          { time: 'Noon', icon: <FiSun className="dose-icon noon" /> },
          { time: 'Evening', icon: <FiSunset className="dose-icon evening" /> },
          { time: 'Night', icon: <FiMoon className="dose-icon night" /> }
        ];
      default:
        return [{ time: 'As directed', icon: <FiClock className="dose-icon" /> }];
    }
  };

  // Count medications by dose time
  const countByTime = (timeLabel) => {
    return medicationsData.medications.filter(med => {
      const schedule = getDoseSchedule(med);
      return schedule.some(s => s.time === timeLabel);
    }).length;
  };

  const activeMedications = medicationsData.medications.filter(med => med.status === 'active');
  const activeIvOrders = medicationsData.ivOrders.filter(iv => iv.status === 'active');

  // Compute remaining time text for a medication with duration
  const getRemainingText = (med) => {
    if (!med.duration || !med.startDate) return null;
    const daysTotal = med.durationUnit === 'weeks' ? med.duration * 7 : med.duration;
    const endDate = new Date(med.startDate);
    endDate.setDate(endDate.getDate() + daysTotal);
    const now = new Date();
    const diffMs = endDate - now;
    if (diffMs <= 0) return 'Expired';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7);
      const days = diffDays % 7;
      return days > 0 ? `${weeks}w ${days}d remaining` : `${weeks}w remaining`;
    }
    return `${diffDays}d remaining`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Layout appName="Patient View" role="patient">
      <div className="page-header">
        <h1>Medications</h1>
        <p>Your current prescriptions and medication schedule</p>
      </div>

      {/* Doctor Info */}
      {medicationsData.doctor && (
        <div className="prescriber-info">
          <FiUser className="prescriber-icon" />
          <div className="prescriber-details">
            <span className="prescriber-label">Prescribed by</span>
            <span className="prescriber-name">Dr. {medicationsData.doctor.fullName}</span>
            <span className="prescriber-specialty">{medicationsData.doctor.specialization}</span>
          </div>
          {medicationsData.diagnosis && (
            <div className="diagnosis-badge">
              <FiActivity />
              <span>{medicationsData.diagnosis}</span>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="med-summary">
        <div className="summary-card">
          <FiCheckCircle className="summary-icon active" />
          <div className="summary-info">
            <span className="summary-value">{activeMedications.length}</span>
            <span className="summary-label">Active Medications</span>
          </div>
        </div>
        <div className="summary-card">
          <FiSun className="summary-icon morning" />
          <div className="summary-info">
            <span className="summary-value">{countByTime('Morning')}</span>
            <span className="summary-label">Morning Doses</span>
          </div>
        </div>
        <div className="summary-card">
          <FiSunset className="summary-icon evening" />
          <div className="summary-info">
            <span className="summary-value">{countByTime('Evening')}</span>
            <span className="summary-label">Evening Doses</span>
          </div>
        </div>
        <div className="summary-card">
          <FiMoon className="summary-icon night" />
          <div className="summary-info">
            <span className="summary-value">{countByTime('Night')}</span>
            <span className="summary-label">Night Doses</span>
          </div>
        </div>
      </div>

      {/* Current Prescriptions */}
      <div className="card">
        <div className="card-header">
          <h2>Current Prescriptions</h2>
          <span className="count-badge">{activeMedications.length} active</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading medications...</p>
            </div>
          ) : activeMedications.length === 0 ? (
            <div className="empty-state">
              <FiInfo className="empty-icon" />
              <h3>No Active Medications</h3>
              <p>You don't have any active prescriptions at the moment</p>
            </div>
          ) : (
            <div className="med-list">
              {activeMedications.map((med, index) => {
                const schedule = getDoseSchedule(med);
                return (
                  <div key={med._id || index} className="med-card">
                    <div className="med-status active">
                      <FiCheckCircle />
                    </div>
                    <div className="med-info">
                      <h3>{med.medicineName}</h3>
                      <p className="med-dosage">
                        {med.timesPerDay}x daily
                        {med.dosage && ` - ${med.dosage}`}
                        {med.duration && ` · ${med.duration} ${med.durationUnit}`}
                      </p>
                      {getRemainingText(med) && (
                        <p className="med-remaining">
                          <FiClock className="remaining-icon" /> {getRemainingText(med)}
                        </p>
                      )}
                      {med.note && (
                        <p className="med-note">
                          <FiInfo className="note-icon" /> {med.note}
                        </p>
                      )}
                      <div className="med-schedule">
                        <span className="schedule-label">Take at:</span>
                        <div className="schedule-times">
                          {schedule.map((s, i) => (
                            <span key={i} className="time-badge">
                              {s.icon}
                              {s.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* IV Orders if any */}
      {activeIvOrders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2><FiDroplet /> IV Orders</h2>
            <span className="count-badge">{activeIvOrders.length} active</span>
          </div>
          <div className="card-body">
            <div className="med-list">
              {activeIvOrders.map((iv, index) => (
                <div key={iv._id || index} className="med-card iv-card">
                  <div className="med-status iv">
                    <FiDroplet />
                  </div>
                  <div className="med-info">
                    <h3>{iv.fluidName}</h3>
                    <p className="med-dosage">
                      {iv.volume && `${iv.volume}`}
                      {iv.rate && ` @ ${iv.rate}`}
                    </p>
                    {iv.instructions && (
                      <p className="med-note">
                        <FiInfo className="note-icon" /> {iv.instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Medication History */}
      {medicationsData.medicationHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2><FiClock /> Medication History</h2>
            <span className="count-badge history-badge">{medicationsData.medicationHistory.length} completed</span>
          </div>
          <div className="card-body">
            <div className="med-list">
              {medicationsData.medicationHistory.map((med, index) => (
                <div key={med._id || index} className="med-card history-card">
                  <div className={`med-status ${med.isExpired ? 'expired' : 'given'}`}>
                    {med.isExpired ? <FiClock /> : <FiCheckCircle />}
                  </div>
                  <div className="med-info">
                    <h3>{med.medicineName}</h3>
                    <p className="med-dosage">
                      {med.timesPerDay}x daily
                      {med.duration && ` · ${med.duration} ${med.durationUnit}`}
                    </p>
                    <div className="med-history-dates">
                      {med.startDate && <span>Started: {formatDate(med.startDate)}</span>}
                      {med.endDate && <span>Ended: {formatDate(med.endDate)}</span>}
                    </div>
                  </div>
                  <div className={`history-status-badge ${med.isExpired ? 'expired' : 'completed'}`}>
                    {med.isExpired ? 'Duration Ended' : 'Completed'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Schedule */}
      {activeMedications.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Daily Schedule</h2>
          </div>
          <div className="card-body">
            <div className="schedule-grid">
              <div className="schedule-section">
                <div className="schedule-header morning">
                  <FiSun />
                  <h4>Morning</h4>
                  <span className="time-hint">6:00 AM - 9:00 AM</span>
                </div>
                <div className="schedule-meds">
                  {                  activeMedications
                    .filter(med => getDoseSchedule(med).some(s => s.time === 'Morning'))
                    .map((med, i) => (
                      <div key={i} className="schedule-med-item">
                        <FiCheckCircle className="check-icon" />
                        <span>{med.medicineName}</span>
                      </div>
                    ))}
                  {countByTime('Morning') === 0 && (
                    <p className="no-meds">No medications</p>
                  )}
                </div>
              </div>

              <div className="schedule-section">
                <div className="schedule-header afternoon">
                  <FiSunset />
                  <h4>Afternoon</h4>
                  <span className="time-hint">12:00 PM - 2:00 PM</span>
                </div>
                <div className="schedule-meds">
                  {                  activeMedications
                    .filter(med => getDoseSchedule(med).some(s => s.time === 'Afternoon' || s.time === 'Noon'))
                    .map((med, i) => (
                      <div key={i} className="schedule-med-item">
                        <FiCheckCircle className="check-icon" />
                        <span>{med.medicineName}</span>
                      </div>
                    ))}
                  {activeMedications.filter(med => getDoseSchedule(med).some(s => s.time === 'Afternoon' || s.time === 'Noon')).length === 0 && (
                    <p className="no-meds">No medications</p>
                  )}
                </div>
              </div>

              <div className="schedule-section">
                <div className="schedule-header evening">
                  <FiSunset />
                  <h4>Evening</h4>
                  <span className="time-hint">6:00 PM - 8:00 PM</span>
                </div>
                <div className="schedule-meds">
                  {                  activeMedications
                    .filter(med => getDoseSchedule(med).some(s => s.time === 'Evening'))
                    .map((med, i) => (
                      <div key={i} className="schedule-med-item">
                        <FiCheckCircle className="check-icon" />
                        <span>{med.medicineName}</span>
                      </div>
                    ))}
                  {countByTime('Evening') === 0 && (
                    <p className="no-meds">No medications</p>
                  )}
                </div>
              </div>

              <div className="schedule-section">
                <div className="schedule-header night">
                  <FiMoon />
                  <h4>Night</h4>
                  <span className="time-hint">9:00 PM - 10:00 PM</span>
                </div>
                <div className="schedule-meds">
                  {                  activeMedications
                    .filter(med => getDoseSchedule(med).some(s => s.time === 'Night'))
                    .map((med, i) => (
                      <div key={i} className="schedule-med-item">
                        <FiCheckCircle className="check-icon" />
                        <span>{med.medicineName}</span>
                      </div>
                    ))}
                  {countByTime('Night') === 0 && (
                    <p className="no-meds">No medications</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders */}
      <div className="card">
        <div className="card-header">
          <h2>Important Reminders</h2>
        </div>
        <div className="card-body">
          <div className="reminder-list">
            <div className="reminder-item">
              <FiAlertCircle className="reminder-icon warning" />
              <p>Take medications at the same time each day for best results</p>
            </div>
            <div className="reminder-item">
              <FiInfo className="reminder-icon info" />
              <p>Contact your doctor if you experience any side effects</p>
            </div>
            <div className="reminder-item">
              <FiCheckCircle className="reminder-icon success" />
              <p>Don't stop taking medications without consulting your doctor</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .prescriber-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-white);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
        }
        .prescriber-icon {
          font-size: 2rem;
          color: var(--accent-blue);
          padding: 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: var(--radius-full);
        }
        .prescriber-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .prescriber-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .prescriber-name {
          font-weight: 600;
          font-size: 1rem;
        }
        .prescriber-specialty {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .diagnosis-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .med-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        .summary-icon {
          font-size: 1.5rem;
        }
        .summary-icon.active { color: var(--accent-green); }
        .summary-icon.morning { color: #f59e0b; }
        .summary-icon.evening { color: #f97316; }
        .summary-icon.night { color: #6366f1; }
        .summary-info {
          display: flex;
          flex-direction: column;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .summary-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .count-badge {
          padding: 0.25rem 0.75rem;
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
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
        .med-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .med-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }
        .med-card:hover {
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-sm);
        }
        .med-card.iv-card {
          border-left: 3px solid var(--accent-blue);
          background: rgba(59, 130, 246, 0.02);
        }
        .med-status {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .med-status.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .med-status.iv {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .med-info {
          flex: 1;
        }
        .med-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
        }
        .med-dosage {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .med-note {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          font-style: italic;
          margin-bottom: 0.5rem;
        }
        .note-icon {
          font-size: 0.9rem;
          color: var(--accent-blue);
        }
        .med-schedule {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .schedule-label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .schedule-times {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .time-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .dose-icon {
          font-size: 0.9rem;
        }
        .dose-icon.morning { color: #f59e0b; }
        .dose-icon.noon { color: #eab308; }
        .dose-icon.afternoon { color: #f97316; }
        .dose-icon.evening { color: #f97316; }
        .dose-icon.night { color: #6366f1; }
        .schedule-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .schedule-section {
          background: var(--bg-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .schedule-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          color: white;
        }
        .schedule-header svg {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }
        .schedule-header h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.125rem;
        }
        .time-hint {
          font-size: 0.7rem;
          opacity: 0.8;
        }
        .schedule-header.morning {
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
        }
        .schedule-header.afternoon {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }
        .schedule-header.evening {
          background: linear-gradient(135deg, #ea580c, #f97316);
        }
        .schedule-header.night {
          background: linear-gradient(135deg, #6366f1, #818cf8);
        }
        .schedule-meds {
          padding: 1rem;
        }
        .schedule-med-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
        }
        .schedule-med-item:last-child {
          border-bottom: none;
        }
        .check-icon {
          color: var(--accent-green);
          font-size: 0.9rem;
        }
        .no-meds {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
          padding: 0.5rem;
        }
        .reminder-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .reminder-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--bg-light);
          border-radius: var(--radius-md);
        }
        .reminder-icon {
          font-size: 1.125rem;
        }
        .reminder-icon.warning { color: var(--accent-orange); }
        .reminder-icon.info { color: var(--accent-blue); }
        .reminder-icon.success { color: var(--accent-green); }
        .reminder-item p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .med-remaining {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: var(--accent-blue);
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .remaining-icon {
          font-size: 0.85rem;
        }
        .history-badge {
          background: rgba(100, 116, 139, 0.1) !important;
          color: var(--text-secondary) !important;
        }
        .med-card.history-card {
          opacity: 0.85;
          border-left: 3px solid var(--text-muted);
        }
        .med-status.expired {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .med-status.given {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .med-history-dates {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
        .history-status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
          align-self: center;
        }
        .history-status-badge.expired {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-orange);
        }
        .history-status-badge.completed {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        @media (max-width: 1024px) {
          .med-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          .schedule-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .med-summary {
            grid-template-columns: 1fr;
          }
          .schedule-grid {
            grid-template-columns: 1fr;
          }
          .prescriber-info {
            flex-direction: column;
            text-align: center;
          }
          .diagnosis-badge {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </Layout>
  );
};

export default PatientMedications;
