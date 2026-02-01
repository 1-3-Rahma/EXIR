import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import {
  FiHeart, FiActivity, FiThermometer, FiWind,
  FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiMinus, FiClock
} from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const NurseVitals = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVitalsData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchVitalsData = async () => {
    try {
      const response = await fetch(`${API_URL}/nurse/vitals-formatted`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch vitals');

      const data = await response.json();
      setPatients(data.data || []);
    } catch (error) {
      console.error('Failed to fetch vitals:', error);
      setPatients([]);
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

  // Normal ranges with min/max values for validation
  const normalRanges = {
    bp: { systolicMin: 90, systolicMax: 120, diastolicMin: 60, diastolicMax: 80 },
    hr: { min: 60, max: 100 },
    temp: { min: 36.1, max: 37.2 },
    o2: { min: 95, max: 100 },
    resp: { min: 12, max: 20 }
  };

  // Reference display data
  const normalRangesDisplay = [
    { name: 'Blood Pressure', range: '90-120 / 60-80 mmHg', color: '#3b82f6', icon: 'bp' },
    { name: 'Heart Rate', range: '60-100 bpm', color: '#ef4444', icon: 'hr' },
    { name: 'Temperature', range: '36.1-37.2 °C', color: '#f59e0b', icon: 'temp' },
    { name: 'O₂ Saturation', range: '95-100 %', color: '#06b6d4', icon: 'o2' },
    { name: 'Respiratory Rate', range: '12-20 /min', color: '#8b5cf6', icon: 'resp' }
  ];

  // Check if vital is out of range
  const isOutOfRange = (type, value, value2 = null) => {
    switch (type) {
      case 'bp':
        const systolic = value;
        const diastolic = value2;
        return systolic < normalRanges.bp.systolicMin || systolic > normalRanges.bp.systolicMax ||
               diastolic < normalRanges.bp.diastolicMin || diastolic > normalRanges.bp.diastolicMax;
      case 'hr':
        return value < normalRanges.hr.min || value > normalRanges.hr.max;
      case 'temp':
        return value < normalRanges.temp.min || value > normalRanges.temp.max;
      case 'o2':
        return value < normalRanges.o2.min || value > normalRanges.o2.max;
      case 'resp':
        return value < normalRanges.resp.min || value > normalRanges.resp.max;
      default:
        return false;
    }
  };

  // Get warning severity based on how far out of range
  const getWarningSeverity = (type, value, value2 = null) => {
    if (!isOutOfRange(type, value, value2)) return 'normal';

    switch (type) {
      case 'bp': {
        const systolic = value;
        const diastolic = value2;
        // Critical if very far from range
        if (systolic < 80 || systolic > 140 || diastolic < 50 || diastolic > 100) return 'critical';
        return 'warning';
      }
      case 'hr':
        if (value < 50 || value > 120) return 'critical';
        return 'warning';
      case 'temp':
        if (value < 96 || value > 101) return 'critical';
        return 'warning';
      case 'o2':
        if (value < 90) return 'critical';
        return 'warning';
      case 'resp':
        if (value < 8 || value > 25) return 'critical';
        return 'warning';
      default:
        return 'warning';
    }
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header">
        <h1>Live Vitals Dashboard</h1>
        <p>Real-time patient vital signs monitoring</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading vitals data...</div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <FiActivity style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
          <h3>No vitals data available</h3>
          <p>There are no patient vitals to monitor at the moment.</p>
          {/* Show normal ranges reference when no data */}
          <div className="empty-reference-card">
            <h3 className="reference-title">Normal Vital Ranges Reference</h3>
            <div className="empty-ranges-grid">
              {normalRangesDisplay.map((item, index) => (
                <div key={index} className="empty-range-item">
                  <div className="range-icon" style={{ background: item.color + '20', color: item.color }}>
                    {item.icon === 'bp' && <FiHeart />}
                    {item.icon === 'hr' && <FiActivity />}
                    {item.icon === 'temp' && <FiThermometer />}
                    {item.icon === 'o2' && <FiWind />}
                    {item.icon === 'resp' && <FiActivity />}
                  </div>
                  <div className="range-info">
                    <span className="range-name">{item.name}</span>
                    <span className="range-value">{item.range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Normal Vital Ranges Reference */}
          <div className="reference-card">
              <div className="reference-header">
                <h3>Normal Vital Ranges Reference</h3>
                <div className="legend">
                  <span className="legend-item normal"><span className="dot"></span> Normal</span>
                  <span className="legend-item warning"><span className="dot"></span> Warning</span>
                  <span className="legend-item critical"><span className="dot"></span> Critical</span>
                </div>
              </div>

            <div className="ranges-grid">
              {normalRangesDisplay.map((item, index) => (
                <div key={index} className="range-item">
                  <div className="range-icon" style={{ background: item.color + '20', color: item.color }}>
                    {item.icon === 'bp' && <FiHeart />}
                    {item.icon === 'hr' && <FiActivity />}
                    {item.icon === 'temp' && <FiThermometer />}
                    {item.icon === 'o2' && <FiWind />}
                    {item.icon === 'resp' && <FiActivity />}
                  </div>
                  <div className="range-info">
                    <span className="range-name">{item.name}</span>
                    <span className="range-value">{item.range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                  <div className={`vital-card ${getWarningSeverity('bp', patient.vitals.bp.systolic, patient.vitals.bp.diastolic)}`} style={{ background: getStatusBg(patient.vitals.bp.status) }}>
                    <div className="vital-header">
                      <FiHeart style={{ color: getStatusColor(patient.vitals.bp.status) }} />
                      {isOutOfRange('bp', patient.vitals.bp.systolic, patient.vitals.bp.diastolic) && (
                        <FiAlertTriangle className="warning-icon" />
                      )}
                      {getTrendIcon(patient.vitals.bp.trend)}
                    </div>
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.bp.status) }}>
                      {patient.vitals.bp.systolic}/{patient.vitals.bp.diastolic}
                    </span>
                    <span className="vital-unit">mmHg</span>
                    <span className="normal-range">Normal: 90-120/60-80</span>
                  </div>

                  {/* Heart Rate */}
                  <div className={`vital-card ${getWarningSeverity('hr', patient.vitals.hr.value)}`} style={{ background: getStatusBg(patient.vitals.hr.status) }}>
                    <div className="vital-header">
                      <FiActivity style={{ color: getStatusColor(patient.vitals.hr.status) }} />
                      {isOutOfRange('hr', patient.vitals.hr.value) && (
                        <FiAlertTriangle className="warning-icon" />
                      )}
                      {getTrendIcon(patient.vitals.hr.trend)}
                    </div>
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.hr.status) }}>
                      {patient.vitals.hr.value}
                    </span>
                    <span className="vital-unit">bpm</span>
                    <span className="normal-range">Normal: 60-100</span>
                  </div>

                  {/* Temperature */}
                  <div className={`vital-card ${getWarningSeverity('temp', patient.vitals.temp.value)}`} style={{ background: getStatusBg(patient.vitals.temp.status) }}>
                    <div className="vital-header">
                      <FiThermometer style={{ color: getStatusColor(patient.vitals.temp.status) }} />
                      {isOutOfRange('temp', patient.vitals.temp.value) && (
                        <FiAlertTriangle className="warning-icon" />
                      )}
                      {getTrendIcon(patient.vitals.temp.trend)}
                    </div>
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.temp.status) }}>
                      {patient.vitals.temp.value}
                    </span>
                    <span className="vital-unit">°F</span>
                    <span className="normal-range">Normal: 97.8-99.1</span>
                  </div>

                  {/* O2 Saturation */}
                  <div className={`vital-card ${getWarningSeverity('o2', patient.vitals.o2.value)}`} style={{ background: getStatusBg(patient.vitals.o2.status) }}>
                    <div className="vital-header">
                      <FiWind style={{ color: getStatusColor(patient.vitals.o2.status) }} />
                      {isOutOfRange('o2', patient.vitals.o2.value) && (
                        <FiAlertTriangle className="warning-icon" />
                      )}
                      {getTrendIcon(patient.vitals.o2.trend)}
                    </div>
                    <span className="vital-label">O₂ Saturation</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.o2.status) }}>
                      {patient.vitals.o2.value}
                    </span>
                    <span className="vital-unit">%</span>
                    <span className="normal-range">Normal: 95-100</span>
                  </div>

                  {/* Respiratory Rate */}
                  <div className={`vital-card ${getWarningSeverity('resp', patient.vitals.resp.value)}`} style={{ background: getStatusBg(patient.vitals.resp.status) }}>
                    <div className="vital-header">
                      <FiActivity style={{ color: getStatusColor(patient.vitals.resp.status) }} />
                      {isOutOfRange('resp', patient.vitals.resp.value) && (
                        <FiAlertTriangle className="warning-icon" />
                      )}
                      {getTrendIcon(patient.vitals.resp.trend)}
                    </div>
                    <span className="vital-label">Resp. Rate</span>
                    <span className="vital-value" style={{ color: getStatusColor(patient.vitals.resp.status) }}>
                      {patient.vitals.resp.value}
                    </span>
                    <span className="vital-unit">/min</span>
                    <span className="normal-range">Normal: 12-20</span>
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

          
        </>
      )}

      <style>{`
        /* Main container */
        .vitals-container {
          background: #ffffff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 0 0 1px #e6eef8;
          font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        }

        /* Title */
        .vitals-container h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
        }

        /* Grid layout */
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        /* Card */
        .vital-card {
          background: #ffffff;
          border: 1px solid #e6eef8;
          border-radius: 10px;
          padding: 18px;
          transition: all 0.2s ease;
        }

        /* Hover effect */
        .vital-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        /* Vital title */
        .vital-card h3 {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #2563eb;
        }

        /* Vital value */
        .vital-card p {
          font-size: 14px;
          color: #374151;
          margin: 0;
        }

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
          position: relative;
          transition: all 0.3s ease;
        }

        .vital-card.warning {
          border: 2px solid #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
          animation: pulse-warning 2s infinite;
        }

        .vital-card.critical {
          border: 2px solid #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
          animation: pulse-critical 1s infinite;
        }

        @keyframes pulse-warning {
          0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }
          50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2); }
        }

        @keyframes pulse-critical {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.25); }
        }

        .warning-icon {
          color: #f59e0b;
          font-size: 0.9rem;
          animation: blink 1s infinite;
        }

        .vital-card.critical .warning-icon {
          color: #ef4444;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .normal-range {
          font-size: 0.65rem;
          color: #94a3b8;
          margin-top: 0.375rem;
          padding-top: 0.375rem;
          border-top: 1px dashed #e2e8f0;
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
          padding: 2rem;
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.04);
          border: 1px solid #eef2f6;
          margin-bottom: 1.5rem;
        }

        .reference-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .reference-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .legend {
          display: flex;
          gap: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: #64748b;
        }

        .legend-item .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-item.normal .dot { background: #22c55e; }
        .legend-item.warning .dot { background: #f59e0b; }
        .legend-item.critical .dot { background: #ef4444; }

        .ranges-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
        }

        .range-item {
          background: #ffffff;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          border: 1px solid #eef2f6;
          display: flex;
          align-items: center;
          gap: 1rem;
          min-height: 72px;
        }

        .range-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .range-info {
          display: flex;
          flex-direction: column;
        }

        .range-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .range-value {
          font-size: 0.9rem;
          color: #475569;
        }
        .text-reference {
          background: #f8fafc;
          border: 1px solid #eef2f6;
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
        }
        .text-reference h4 {
          margin: 0 0 4px 0;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .text-reference p {
          margin: 0 0 8px 0;
          color: #475569;
          font-size: 0.9rem;
        }
        .reference-title {
          margin: 0 0 8px 0;
          font-size: 1.125rem;
          color: #0f172a;
          font-weight: 600;
        }

        .empty-reference-card {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 700px;
        }

        .empty-reference-card .reference-title {
          text-align: center;
          margin-bottom: 1rem;
        }

        .empty-ranges-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .empty-range-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        @media (max-width: 480px) {
          .empty-ranges-grid {
            grid-template-columns: 1fr;
          }
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem;
          color: #94a3b8;
        }

        .empty-state {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
        }

        .empty-state h3 {
          color: #1e293b;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #64748b;
          font-size: 0.9rem;
        }

        @media (max-width: 1200px) {
          .vitals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .ranges-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .ranges-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .vitals-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .ranges-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .alert-banner {
            flex-direction: column;
            text-align: center;
          }
          .reference-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .legend {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 480px) {
          .ranges-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default NurseVitals;
