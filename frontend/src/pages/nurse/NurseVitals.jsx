import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { nurseAPI } from '../../services/api';
import {
  FiHeart, FiActivity, FiThermometer, FiWind,
  FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiMinus, FiClock
} from 'react-icons/fi';

const NurseVitals = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    fetchVitalsData();
  }, []);

  const fetchVitalsData = async () => {
    try {
      const response = await nurseAPI.getVitalsOverview();
      setPatients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
      // Mock data
      setPatients([
        {
          _id: '1', name: 'Patient 1', room: '302A', updatedAt: new Date(Date.now() - 2 * 60000),
          vitals: {
            bp: { systolic: 180, diastolic: 110, status: 'critical', trend: 'up' },
            hr: { value: 95, status: 'warning', trend: 'up' },
            temp: { value: 98.6, status: 'normal', trend: 'stable' },
            o2: { value: 94, status: 'warning', trend: 'down' },
            resp: { value: 22, status: 'normal', trend: 'stable' }
          },
          alert: { message: 'Critical vitals detected', action: 'Immediate attention required. Contact physician if condition persists.' }
        },
        {
          _id: '2', name: 'Patient 2', room: '405B', updatedAt: new Date(Date.now() - 5 * 60000),
          vitals: {
            bp: { systolic: 130, diastolic: 85, status: 'normal', trend: 'stable' },
            hr: { value: 82, status: 'normal', trend: 'stable' },
            temp: { value: 100.2, status: 'warning', trend: 'up' },
            o2: { value: 88, status: 'critical', trend: 'down' },
            resp: { value: 20, status: 'normal', trend: 'stable' }
          },
          alert: null
        },
        {
          _id: '3', name: 'Patient 3', room: '201C', updatedAt: new Date(Date.now() - 8 * 60000),
          vitals: {
            bp: { systolic: 125, diastolic: 80, status: 'normal', trend: 'stable' },
            hr: { value: 75, status: 'normal', trend: 'stable' },
            temp: { value: 98.4, status: 'normal', trend: 'stable' },
            o2: { value: 98, status: 'normal', trend: 'stable' },
            resp: { value: 18, status: 'normal', trend: 'stable' }
          },
          alert: null
        },
        {
          _id: '4', name: 'Patient 4', room: '308D', updatedAt: new Date(Date.now() - 12 * 60000),
          vitals: {
            bp: { systolic: 120, diastolic: 78, status: 'normal', trend: 'stable' },
            hr: { value: 70, status: 'normal', trend: 'stable' },
            temp: { value: 98.2, status: 'normal', trend: 'stable' },
            o2: { value: 99, status: 'normal', trend: 'stable' },
            resp: { value: 16, status: 'normal', trend: 'stable' }
          },
          alert: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    return `Updated ${minutes} min ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'normal': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'critical': return '#fef2f2';
      case 'warning': return '#fffbeb';
      case 'normal': return '#f0fdf4';
      default: return '#f8fafc';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <FiTrendingUp className="trend-icon up" />;
      case 'down': return <FiTrendingDown className="trend-icon down" />;
      default: return <FiMinus className="trend-icon stable" />;
    }
  };

  const normalRanges = [
    { name: 'Blood Pressure', range: '90-120 / 60-80 mmHg', color: '#3b82f6' },
    { name: 'Heart Rate', range: '60-100 bpm', color: '#ef4444' },
    { name: 'Temperature', range: '97.8-99.1 °F', color: '#f59e0b' },
    { name: 'O₂ Saturation', range: '95-100 %', color: '#06b6d4' },
    { name: 'Respiratory Rate', range: '12-20 /min', color: '#8b5cf6' }
  ];

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Live Vitals Dashboard</h1>
        <p>Real-time patient vital signs monitoring</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading vitals data...</div>
      ) : (
        <>
          {/* Patients Vitals List */}
          <div className="vitals-list">
            {patients.map((patient) => (
              <div key={patient._id} className="patient-vitals-card">
                <div className="patient-header">
                  <div className="patient-info">
                    <h3>{patient.name}</h3>
                    <span className="room">Room {patient.room}</span>
                  </div>
                  <span className="update-time">
                    <FiClock /> {formatTime(patient.updatedAt)}
                  </span>
                </div>

                <div className="vitals-grid">
                  {/* Blood Pressure */}
                  <div className="vital-card" style={{ background: getStatusBg(patient.vitals.bp.status) }}>
                    <div className="vital-header">
                      <FiHeart style={{ color: getStatusColor(patient.vitals.bp.status) }} />
                      {getTrendIcon(patient.vitals.bp.trend)}
                    </div>
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.bp.status) }}>
                      {patient.vitals.bp.systolic}/{patient.vitals.bp.diastolic}
                    </span>
                    <span className="vital-unit">mmHg</span>
                  </div>

                  {/* Heart Rate */}
                  <div className="vital-card" style={{ background: getStatusBg(patient.vitals.hr.status) }}>
                    <div className="vital-header">
                      <FiActivity style={{ color: getStatusColor(patient.vitals.hr.status) }} />
                      {getTrendIcon(patient.vitals.hr.trend)}
                    </div>
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.hr.status) }}>
                      {patient.vitals.hr.value}
                    </span>
                    <span className="vital-unit">bpm</span>
                  </div>

                  {/* Temperature */}
                  <div className="vital-card" style={{ background: getStatusBg(patient.vitals.temp.status) }}>
                    <div className="vital-header">
                      <FiThermometer style={{ color: getStatusColor(patient.vitals.temp.status) }} />
                      {getTrendIcon(patient.vitals.temp.trend)}
                    </div>
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.temp.status) }}>
                      {patient.vitals.temp.value}
                    </span>
                    <span className="vital-unit">°F</span>
                  </div>

                  {/* O2 Saturation */}
                  <div className="vital-card" style={{ background: getStatusBg(patient.vitals.o2.status) }}>
                    <div className="vital-header">
                      <FiWind style={{ color: getStatusColor(patient.vitals.o2.status) }} />
                      {getTrendIcon(patient.vitals.o2.trend)}
                    </div>
                    <span className="vital-label">O₂ Saturation</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.o2.status) }}>
                      {patient.vitals.o2.value}
                    </span>
                    <span className="vital-unit">%</span>
                  </div>

                  {/* Respiratory Rate */}
                  <div className="vital-card" style={{ background: getStatusBg(patient.vitals.resp.status) }}>
                    <div className="vital-header">
                      <FiActivity style={{ color: getStatusColor(patient.vitals.resp.status) }} />
                      {getTrendIcon(patient.vitals.resp.trend)}
                    </div>
                    <span className="vital-label">Resp. Rate</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.resp.status) }}>
                      {patient.vitals.resp.value}
                    </span>
                    <span className="vital-unit">/min</span>
                  </div>
                </div>

                {/* Alert Banner */}
                {patient.alert && (
                  <div className="alert-banner">
                    <div className="alert-icon">
                      <FiAlertTriangle />
                    </div>
                    <div className="alert-content">
                      <strong>{patient.alert.message}</strong>
                      <p>{patient.alert.action}</p>
                    </div>
                    <button className="respond-btn">Respond</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Normal Vital Ranges Reference */}
          <div className="reference-card">
            <h3>Normal Vital Ranges Reference</h3>
            <div className="ranges-grid">
              {normalRanges.map((item, index) => (
                <div key={index} className="range-item">
                  <span className="range-name" style={{ color: item.color }}>{item.name}</span>
                  <span className="range-value">{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        .vitals-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .patient-vitals-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .patient-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .patient-info h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .patient-info .room {
          font-size: 0.85rem;
          color: #64748b;
        }

        .update-time {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .vital-card {
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          border: 1px solid #e2e8f0;
        }

        .vital-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .trend-icon {
          font-size: 0.9rem;
        }

        .trend-icon.up { color: #ef4444; }
        .trend-icon.down { color: #3b82f6; }
        .trend-icon.stable { color: #94a3b8; }

        .vital-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }

        .vital-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .vital-unit {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-top: 0.5rem;
        }

        .alert-icon {
          width: 40px;
          height: 40px;
          background: #fee2e2;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          font-size: 1.25rem;
        }

        .alert-content {
          flex: 1;
        }

        .alert-content strong {
          display: block;
          color: #dc2626;
          font-size: 0.9rem;
          margin-bottom: 0.125rem;
        }

        .alert-content p {
          font-size: 0.8rem;
          color: #ef4444;
          margin: 0;
        }

        .respond-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .respond-btn:hover {
          background: #dc2626;
        }

        .reference-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .reference-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .ranges-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .range-item {
          background: #f8fafc;
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid #e2e8f0;
        }

        .range-name {
          display: block;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .range-value {
          font-size: 0.85rem;
          color: #64748b;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #94a3b8;
        }

        @media (max-width: 1200px) {
          .vitals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .ranges-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .vitals-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .ranges-grid {
            grid-template-columns: 1fr;
          }
          .alert-banner {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </Layout>
  );
};

export default NurseVitals;
