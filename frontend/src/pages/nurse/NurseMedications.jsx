import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import {
  FiClock, FiCheckCircle, FiAlertCircle, FiUser,
  FiAlertTriangle, FiX
} from 'react-icons/fi';

const NurseMedications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    // Mock data for demo
    setMedications([
      {
        _id: '1', name: 'Aspirin', dosage: '81mg', route: 'Oral',
        patient: 'Patient 1', room: '302A', time: '10:00 AM',
        priority: 'high', status: 'pending',
        instructions: 'Take with food. Monitor for bleeding.'
      },
      {
        _id: '2', name: 'Amoxicillin', dosage: '500mg', route: 'Oral',
        patient: 'Patient 2', room: '405B', time: '10:30 AM',
        priority: 'high', status: 'pending',
        instructions: 'Complete full course. Check for allergies.'
      },
      {
        _id: '3', name: 'Insulin', dosage: '10 units', route: 'Subcutaneous',
        patient: 'Patient 3', room: '201C', time: '11:00 AM',
        priority: 'medium', status: 'pending',
        instructions: 'Check blood sugar before administration.'
      },
      {
        _id: '4', name: 'Morphine', dosage: '5mg', route: 'IV',
        patient: 'Patient 4', room: '308D', time: '11:30 AM',
        priority: 'high', status: 'pending',
        instructions: 'Monitor respiratory rate and pain level.'
      },
      {
        _id: '5', name: 'Warfarin', dosage: '2.5mg', route: 'Oral',
        patient: 'Patient 5', room: '410A', time: '12:00 PM',
        priority: 'medium', status: 'given',
        instructions: 'Check INR levels.'
      },
      {
        _id: '6', name: 'Albuterol', dosage: '2 puffs', route: 'Inhalation',
        patient: 'Patient 6', room: '215B', time: '12:30 PM',
        priority: 'low', status: 'pending',
        instructions: 'For asthma. Use as needed.'
      }
    ]);
    setLoading(false);
  };

  const stats = {
    total: medications.length,
    pending: medications.filter(m => m.status === 'pending').length,
    completed: medications.filter(m => m.status === 'given').length,
    highPriority: medications.filter(m => m.priority === 'high').length
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const handleMarkAsGiven = (id) => {
    setMedications(medications.map(med =>
      med._id === id ? { ...med, status: 'given' } : med
    ));
  };

  const filteredMedications = medications.filter(med => {
    if (filter === 'all') return true;
    if (filter === 'pending') return med.status === 'pending';
    if (filter === 'completed') return med.status === 'given';
    return true;
  });

  const scheduleData = medications.map(med => ({
    time: med.time,
    patient: med.patient,
    room: med.room.replace('Room ', ''),
    medication: med.name,
    dosage: med.dosage,
    status: med.status
  }));

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Medication Administration</h1>
        <p>Manage medication schedules and administration</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card-med">
          <div className="stat-icon blue">
            <FiClock />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Today</span>
          </div>
        </div>
        <div className="stat-card-med">
          <div className="stat-icon yellow">
            <FiClock />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card-med">
          <div className="stat-icon green">
            <FiCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card-med">
          <div className="stat-icon red">
            <FiAlertCircle />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.highPriority}</span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>
      </div>

      {/* Pending Medications Section */}
      <div className="section-card">
        <div className="section-header">
          <h2>Pending Medications</h2>
          <span className="items-count">{stats.pending} items</span>
        </div>
        <div className="medications-list">
          {filteredMedications.filter(m => m.status === 'pending').map((med) => (
            <div key={med._id} className="medication-card" style={{ borderLeftColor: getPriorityColor(med.priority) }}>
              <div className="med-header">
                <div className="med-info">
                  <h3>{med.name} <span className="priority-badge" style={{ background: getPriorityColor(med.priority) }}>High Priority</span></h3>
                  <span className="med-dosage">{med.dosage} · {med.route}</span>
                </div>
                <span className="med-status pending">Pending</span>
              </div>
              <div className="med-details">
                <span className="detail"><FiUser /> {med.patient} - Room {med.room}</span>
                <span className="detail"><FiClock /> Scheduled: {med.time}</span>
              </div>
              <div className="med-instructions">
                <span className="label">Dosage Instructions:</span>
                <p>{med.instructions}</p>
              </div>
              <div className="med-actions">
                <button className="action-btn primary" onClick={() => handleMarkAsGiven(med._id)}>
                  <FiCheckCircle /> Mark as Given
                </button>
                <button className="action-btn secondary">Refuse/Hold</button>
                <button className="action-btn danger">
                  <FiAlertTriangle /> Report Error
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Today */}
      <div className="section-card">
        <div className="section-header">
          <h2>Completed Today</h2>
          <span className="items-count completed">{stats.completed} administered</span>
        </div>
        <div className="completed-list">
          {filteredMedications.filter(m => m.status === 'given').map((med) => (
            <div key={med._id} className="completed-item">
              <div className="completed-icon">
                <FiCheckCircle />
              </div>
              <div className="completed-info">
                <span className="med-name">{med.name} {med.dosage} - {med.patient}</span>
                <span className="med-room">Room {med.room} · {med.time}</span>
              </div>
              <span className="given-badge">Given</span>
            </div>
          ))}
        </div>
      </div>

      {/* Medication Schedule Overview */}
      <div className="section-card">
        <div className="section-header">
          <h2>Medication Schedule Overview</h2>
        </div>
        <div className="schedule-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Room</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.map((item, index) => (
                <tr key={index}>
                  <td>{item.time}</td>
                  <td>{item.patient}</td>
                  <td>{item.room}</td>
                  <td>{item.medication}</td>
                  <td>{item.dosage}</td>
                  <td>
                    <span className={`status-badge ${item.status}`}>
                      {item.status === 'given' ? 'Given' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card-med {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .stat-icon.blue { background: #dbeafe; color: #3b82f6; }
        .stat-icon.yellow { background: #fef3c7; color: #f59e0b; }
        .stat-icon.green { background: #dcfce7; color: #22c55e; }
        .stat-icon.red { background: #fee2e2; color: #ef4444; }

        .stat-info { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 0.85rem; color: #64748b; }

        .section-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header h2 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .items-count {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .items-count.completed {
          background: #22c55e;
        }

        .medications-list {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .medication-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          border-left: 4px solid;
          padding: 1.25rem;
        }

        .med-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .med-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .priority-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          color: white;
          font-weight: 500;
        }

        .med-dosage {
          font-size: 0.85rem;
          color: #64748b;
        }

        .med-status {
          font-size: 0.8rem;
          padding: 0.25rem 0.75rem;
          border-radius: 8px;
          font-weight: 500;
        }

        .med-status.pending {
          background: #fef3c7;
          color: #d97706;
        }

        .med-details {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .med-details .detail {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .med-instructions {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
        }

        .med-instructions .label {
          font-size: 0.75rem;
          color: #64748b;
          display: block;
          margin-bottom: 0.25rem;
        }

        .med-instructions p {
          font-size: 0.85rem;
          color: #1e293b;
          margin: 0;
        }

        .med-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .action-btn.primary {
          background: #22c55e;
          color: white;
        }

        .action-btn.primary:hover { background: #16a34a; }

        .action-btn.secondary {
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .action-btn.secondary:hover {
          border-color: #94a3b8;
        }

        .action-btn.danger {
          background: white;
          border: 1px solid #fecaca;
          color: #ef4444;
        }

        .action-btn.danger:hover {
          background: #fef2f2;
        }

        .completed-list {
          padding: 1rem;
        }

        .completed-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .completed-item:hover {
          background: #f8fafc;
        }

        .completed-icon {
          color: #22c55e;
          font-size: 1.25rem;
        }

        .completed-info {
          flex: 1;
        }

        .completed-info .med-name {
          display: block;
          font-weight: 500;
          color: #1e293b;
          font-size: 0.9rem;
        }

        .completed-info .med-room {
          font-size: 0.8rem;
          color: #64748b;
        }

        .given-badge {
          background: #dcfce7;
          color: #16a34a;
          padding: 0.25rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .schedule-table {
          overflow-x: auto;
        }

        .schedule-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .schedule-table th,
        .schedule-table td {
          padding: 0.875rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .schedule-table th {
          background: #f8fafc;
          font-weight: 600;
          font-size: 0.85rem;
          color: #64748b;
        }

        .schedule-table td {
          font-size: 0.9rem;
          color: #1e293b;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #d97706;
        }

        .status-badge.given {
          background: #dcfce7;
          color: #16a34a;
        }

        @media (max-width: 1200px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .stats-row { grid-template-columns: 1fr; }
          .med-actions { flex-wrap: wrap; }
          .med-details { flex-direction: column; gap: 0.5rem; }
        }
      `}</style>
    </Layout>
  );
};

export default NurseMedications;
