import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { nurseAPI } from '../../services/api';
import {
  FiSearch, FiFilter, FiUser, FiFileText, FiActivity,
  FiMessageSquare, FiChevronDown, FiLink
} from 'react-icons/fi';

const NursePatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await nurseAPI.getAssignedPatients();
      setPatients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      // Mock data for demo
      setPatients([
        {
          _id: '1', fullName: 'Patient 1', age: 68, gender: 'Male', room: '302A',
          status: 'critical', condition: 'Post-operative cardiac surgery',
          vitals: { bp: '180/110', hr: 95, temp: 98.6, o2: 94 },
          medication: { name: 'Aspirin', time: '10:00 AM' }
        },
        {
          _id: '2', fullName: 'Patient 2', age: 54, gender: 'Female', room: '405B',
          status: 'moderate', condition: 'Pneumonia',
          vitals: { bp: '130/85', hr: 82, temp: 100.2, o2: 88 },
          medication: { name: 'Antibiotic', time: '11:00 AM' }
        },
        {
          _id: '3', fullName: 'Patient 3', age: 72, gender: 'Male', room: '201C',
          status: 'stable', condition: 'Diabetes management',
          vitals: { bp: '125/80', hr: 75, temp: 98.4, o2: 98 },
          medication: { name: 'Insulin', time: '12:00 PM' }
        },
        {
          _id: '4', fullName: 'Patient 4', age: 45, gender: 'Female', room: '308D',
          status: 'stable', condition: 'Routine monitoring',
          vitals: { bp: '120/78', hr: 70, temp: 98.2, o2: 99 },
          medication: { name: 'Vitamin D', time: '9:00 AM' }
        },
        {
          _id: '5', fullName: 'Patient 5', age: 61, gender: 'Male', room: '410A',
          status: 'moderate', condition: 'Post-surgery recovery',
          vitals: { bp: '135/88', hr: 78, temp: 99.1, o2: 95 },
          medication: { name: 'Pain medication', time: '2:00 PM' }
        },
        {
          _id: '6', fullName: 'Patient 6', age: 38, gender: 'Female', room: '215B',
          status: 'stable', condition: 'Observation',
          vitals: { bp: '118/75', hr: 72, temp: 98.5, o2: 98 },
          medication: { name: 'Multivitamin', time: '8:00 AM' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' };
      case 'moderate': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' };
      case 'stable': return { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' };
      default: return { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b' };
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.room?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Patient Management</h1>
        <p>View and manage your assigned patients</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by patient name or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
            <FiFilter /> All Patients <FiChevronDown />
          </button>
          <button className="more-filters-btn">
            <FiFilter /> More Filters
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="status-pills">
        <button
          className={`pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({patients.length})
        </button>
        <button
          className={`pill critical ${statusFilter === 'critical' ? 'active' : ''}`}
          onClick={() => setStatusFilter('critical')}
        >
          Critical ({patients.filter(p => p.status === 'critical').length})
        </button>
        <button
          className={`pill moderate ${statusFilter === 'moderate' ? 'active' : ''}`}
          onClick={() => setStatusFilter('moderate')}
        >
          Moderate ({patients.filter(p => p.status === 'moderate').length})
        </button>
        <button
          className={`pill stable ${statusFilter === 'stable' ? 'active' : ''}`}
          onClick={() => setStatusFilter('stable')}
        >
          Stable ({patients.filter(p => p.status === 'stable').length})
        </button>
      </div>

      <p className="results-count">Showing {filteredPatients.length} of {patients.length} patients</p>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="loading-state">Loading patients...</div>
      ) : (
        <div className="patients-grid">
          {filteredPatients.map((patient) => {
            const statusColors = getStatusColor(patient.status);
            return (
              <div
                key={patient._id}
                className="patient-card"
                style={{ background: statusColors.bg, borderColor: statusColors.border }}
              >
                <div className="card-header">
                  <div className="patient-avatar">
                    <FiUser />
                  </div>
                  <div className="patient-info">
                    <h3>{patient.fullName}</h3>
                    <span className="patient-meta">{patient.age}y · {patient.gender}</span>
                  </div>
                  <span className="status-badge" style={{ background: statusColors.text }}>
                    {patient.status}
                  </span>
                </div>

                <div className="card-details">
                  <div className="detail-row">
                    <span className="label">Room:</span>
                    <span className="value">Room {patient.room}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Condition:</span>
                    <span className="value condition">{patient.condition}</span>
                  </div>
                </div>

                <div className="vitals-section">
                  <h4>Latest Vitals</h4>
                  <div className="vitals-grid">
                    <div className="vital-item">
                      <span className="vital-label">BP</span>
                      <span className="vital-value">{patient.vitals?.bp || 'N/A'}</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">HR</span>
                      <span className="vital-value">{patient.vitals?.hr || 'N/A'} bpm</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">Temp</span>
                      <span className="vital-value">{patient.vitals?.temp || 'N/A'}°F</span>
                    </div>
                    <div className="vital-item">
                      <span className="vital-label">O₂</span>
                      <span className="vital-value">{patient.vitals?.o2 || 'N/A'}%</span>
                    </div>
                  </div>
                </div>

                {patient.medication && (
                  <div className="medication-alert">
                    <FiLink className="med-icon" />
                    <span>{patient.medication.name} {patient.medication.time}</span>
                  </div>
                )}

                <div className="card-actions">
                  <button className="action-btn">
                    <FiFileText /> Chart
                  </button>
                  <button className="action-btn">
                    <FiActivity /> Vitals
                  </button>
                  <button className="action-btn icon-only">
                    <FiMessageSquare />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .search-box {
          flex: 1;
          position: relative;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .search-box input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .filter-group {
          display: flex;
          gap: 0.5rem;
        }

        .filter-btn, .more-filters-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover, .more-filters-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .more-filters-btn {
          background: #1e3a5f;
          color: white;
          border: none;
        }

        .more-filters-btn:hover {
          background: #2d4a6f;
          color: white;
        }

        .status-pills {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .pill {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pill:hover { border-color: #94a3b8; }
        .pill.active { background: #1e3a5f; color: white; border-color: #1e3a5f; }
        .pill.critical.active { background: #ef4444; border-color: #ef4444; }
        .pill.moderate.active { background: #f59e0b; border-color: #f59e0b; }
        .pill.stable.active { background: #22c55e; border-color: #22c55e; }

        .results-count {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .patients-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .patient-card {
          border-radius: 16px;
          padding: 1.25rem;
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .patient-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .patient-avatar {
          width: 48px;
          height: 48px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .patient-info {
          flex: 1;
        }

        .patient-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .patient-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
          color: white;
          font-weight: 500;
          text-transform: capitalize;
        }

        .card-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.375rem;
        }

        .detail-row .label {
          color: #64748b;
          font-size: 0.85rem;
        }

        .detail-row .value {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.85rem;
        }

        .detail-row .value.condition {
          font-weight: 600;
        }

        .vitals-section {
          background: rgba(255,255,255,0.7);
          border-radius: 10px;
          padding: 0.875rem;
          margin-bottom: 1rem;
        }

        .vitals-section h4 {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }

        .vital-item {
          display: flex;
          flex-direction: column;
        }

        .vital-label {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .vital-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }

        .medication-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }

        .med-icon {
          font-size: 1rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .action-btn.icon-only {
          flex: 0;
          padding: 0.625rem;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #94a3b8;
        }

        @media (max-width: 1200px) {
          .patients-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .patients-grid { grid-template-columns: 1fr; }
          .filter-bar { flex-direction: column; }
          .search-box { max-width: 100%; }
        }
      `}</style>
    </Layout>
  );
};

export default NursePatients;
