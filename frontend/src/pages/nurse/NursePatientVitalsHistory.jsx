import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import {
  FiHeart, FiActivity, FiThermometer, FiWind,
  FiArrowLeft, FiClock
} from 'react-icons/fi';
import { nurseAPI } from '../../services/api';

// ── Simple SVG line chart ─────────────────────────────────────────────────────
const LineChart = ({ dataPoints, color, unit }) => {
  const { t } = useTranslation();
  if (!dataPoints || dataPoints.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.85rem' }}>
        {t('nurseVitals.notEnoughData')}
      </div>
    );
  }

  const W = 380;
  const H = 120;
  const PX = 32;
  const PY = 16;

  const values = dataPoints.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i) => PX + (i / (dataPoints.length - 1)) * (W - 2 * PX);
  const toY = (v) => H - PY - ((v - minV) / range) * (H - 2 * PY);

  const points = dataPoints.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const areaPoints = `${toX(0)},${H - PY} ${points} ${toX(dataPoints.length - 1)},${H - PY}`;

  const yLabels = [minV, Math.round((minV + maxV) / 2), maxV];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PX - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{Math.round(v)}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {dataPoints.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBP = (bp) => {
  if (!bp) return 'N/A';
  if (bp.systolic != null && bp.diastolic != null) return `${bp.systolic}/${bp.diastolic}`;
  return 'N/A';
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString();
};

const formatConfidence = (score) => {
  if (score == null || Number.isNaN(Number(score))) return 'N/A';
  const n = Number(score);
  return n <= 1 ? `${Math.round(n * 100)}%` : `${Math.round(n)}%`;
};

const getRiskColor = (risk) => {
  const r = String(risk || '').toLowerCase();
  if (r === 'critical') return '#ef4444';
  if (r === 'abnormal') return '#f59e0b';
  if (r === 'normal' || r === 'stable') return '#22c55e';
  return '#64748b';
};

const getRiskBg = (risk) => {
  const r = String(risk || '').toLowerCase();
  if (r === 'critical') return '#fef2f2';
  if (r === 'abnormal') return '#fffbeb';
  if (r === 'normal' || r === 'stable') return '#f0fdf4';
  return '#f8fafc';
};

// ── Main component ────────────────────────────────────────────────────────────
const NursePatientVitalsHistory = () => {
  const { t } = useTranslation();
  const { patientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const patientName = location.state?.patientName || 'Patient';
  const patientRoom = location.state?.room || '';

  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const res = await nurseAPI.getPatientVitals(patientId);
        setVitals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Failed to load vitals history.');
      } finally {
        setLoading(false);
      }
    };
    fetchVitals();
  }, [patientId]);

  const latest = vitals[0] || null;

  // Chart data: newest-first → reverse for chronological order
  const chartData = [...vitals].reverse();

  const hrPoints = chartData.filter(v => v.heartRate != null).map(v => ({ value: v.heartRate }));
  const tempPoints = chartData.filter(v => v.temperature != null).map(v => ({ value: v.temperature }));
  const o2Points = chartData.filter(v => v.spo2 != null).map(v => ({ value: v.spo2 }));
  const bpSysPoints = chartData
    .filter(v => v.bloodPressure?.systolic != null)
    .map(v => ({ value: v.bloodPressure.systolic }));

  // ── Top cards ────────────────────────────────────────────────────────────────
  const topCards = [
    {
      label: t('nurseVitals.bloodPressure'),
      value: formatBP(latest?.bloodPressure),
      unit: 'mmHg',
      icon: <FiHeart />,
      color: '#3b82f6'
    },
    {
      label: t('nurseVitals.heartRate'),
      value: latest?.heartRate != null ? latest.heartRate : 'N/A',
      unit: 'bpm',
      icon: <FiActivity />,
      color: '#ef4444'
    },
    {
      label: t('nurseVitals.temperature'),
      value: latest?.temperature != null ? latest.temperature : 'N/A',
      unit: '°C',
      icon: <FiThermometer />,
      color: '#f59e0b'
    },
    {
      label: t('nurseVitals.o2Saturation'),
      value: latest?.spo2 != null ? latest.spo2 : 'N/A',
      unit: '%',
      icon: <FiWind />,
      color: '#06b6d4'
    }
  ];

  const charts = [
    { label: t('nurseVitals.bloodPressureSystolic'), points: bpSysPoints, color: '#3b82f6', unit: 'mmHg' },
    { label: t('nurseVitals.heartRate'), points: hrPoints, color: '#ef4444', unit: 'bpm' },
    { label: t('nurseVitals.temperature'), points: tempPoints, color: '#f59e0b', unit: '°C' },
    { label: t('nurseVitals.o2Saturation'), points: o2Points, color: '#06b6d4', unit: '%' }
  ];

  return (
    <Layout appName="NurseHub" role="nurse">
      {/* Page header */}
      <div className="vh-page-header">
        <button className="back-btn" onClick={() => navigate('/nurse/patients')}>
          <FiArrowLeft /> {t('nurseVitals.back')}
        </button>
        <div>
          <h1>{patientName} — {t('nurseVitals.vitalsHistory')}</h1>
          {patientRoom && <p>{t('nurseVitals.room')} {patientRoom}</p>}
        </div>
        {latest && (
          <span className="last-update">
            <FiClock /> {t('nurseVitals.lastUpdate')} {formatDate(latest.createdAt)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="vh-loading">{t('nurseVitals.loadingVitals')}</div>
      ) : error ? (
        <div className="vh-error">{error}</div>
      ) : vitals.length === 0 ? (
        <div className="vh-empty">{t('nurseVitals.noVitalsYet')}</div>
      ) : (
        <>
          {/* ── TOP SECTION: Latest vitals cards ── */}
          <section className="vh-section">
            <h2 className="vh-section-title">{t('nurseVitals.latestReadings')}</h2>
            {latest && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span
                  className="risk-badge"
                  style={{
                    background: getRiskBg(latest.riskLevel),
                    color: getRiskColor(latest.riskLevel)
                  }}
                >
                  {t('nurseVitals.aiRisk')} {latest.riskLevel || 'N/A'}
                </span>
                <span className="confidence-badge">
                  {t('nurseVitals.confidence')} {formatConfidence(latest.confidenceScore)}
                </span>
              </div>
            )}
            <div className="top-cards-grid">
              {topCards.map((card) => (
                <div key={card.label} className="top-card">
                  <div className="top-card-icon" style={{ background: card.color + '18', color: card.color }}>
                    {card.icon}
                  </div>
                  <div className="top-card-body">
                    <span className="top-card-label">{card.label}</span>
                    <span className="top-card-value" style={{ color: card.color }}>
                      {card.value}
                      <span className="top-card-unit"> {card.unit}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── MIDDLE SECTION: Charts ── */}
          <section className="vh-section">
            <h2 className="vh-section-title">{t('nurseVitals.historyCharts')}</h2>
            <div className="charts-grid">
              {charts.map((ch) => (
                <div key={ch.label} className="chart-card">
                  <div className="chart-title">{ch.label}</div>
                  <div className="chart-area">
                    <LineChart dataPoints={ch.points} color={ch.color} unit={ch.unit} />
                  </div>
                  <div className="chart-footer">
                    {ch.points.length > 0
                      ? (ch.points.length === 1 ? t('nurseVitals.readings') : t('nurseVitals.readingsPlural', { count: ch.points.length }))
                      : t('nurseVitals.noData')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── BOTTOM SECTION: History table ── */}
          <section className="vh-section">
            <h2 className="vh-section-title">{t('nurseVitals.vitalsHistoryTable')}</h2>
            <div className="table-wrapper">
              <table className="vitals-table">
                <thead>
                  <tr>
                    <th>{t('nurseVitals.dateTime')}</th>
                    <th>{t('nurseVitals.bloodPressure')}</th>
                    <th>{t('nurseVitals.heartRate')}</th>
                    <th>{t('nurseVitals.spo2')}</th>
                    <th>{t('nurseVitals.temperature')}</th>
                    <th>{t('nurseVitals.riskLevel')}</th>
                    <th>{t('nurseVitals.aiConfidence')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((v) => (
                    <tr key={v._id}>
                      <td className="td-date">{formatDate(v.createdAt)}</td>
                      <td>{formatBP(v.bloodPressure)}</td>
                      <td>{v.heartRate != null ? `${v.heartRate} bpm` : 'N/A'}</td>
                      <td>{v.spo2 != null ? `${v.spo2}%` : 'N/A'}</td>
                      <td>{v.temperature != null ? `${v.temperature}°C` : 'N/A'}</td>
                      <td>
                        <span
                          className="risk-pill"
                          style={{
                            background: getRiskBg(v.riskLevel),
                            color: getRiskColor(v.riskLevel)
                          }}
                        >
                          {v.riskLevel || 'N/A'}
                        </span>
                      </td>
                      <td>{formatConfidence(v.confidenceScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <style>{`
        .vh-page-header {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .vh-page-header h1 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .vh-page-header p {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0.125rem 0 0;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .back-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .last-update {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .vh-loading, .vh-error, .vh-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: #94a3b8;
          font-size: 1rem;
        }
        .vh-error { color: #ef4444; }
        .vh-section {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }
        .vh-section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 1.25rem;
        }
        .risk-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-right: 0.5rem;
        }
        .confidence-badge {
          font-size: 0.8rem;
          color: #64748b;
        }

        /* Top cards */
        .top-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .top-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fafafa;
        }
        .top-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .top-card-body {
          display: flex;
          flex-direction: column;
        }
        .top-card-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .top-card-value {
          font-size: 1.4rem;
          font-weight: 700;
          line-height: 1;
        }
        .top-card-unit {
          font-size: 0.75rem;
          font-weight: 400;
          color: #94a3b8;
        }

        /* Charts */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .chart-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          background: #fafafa;
        }
        .chart-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        .chart-area {
          height: 130px;
          overflow: hidden;
        }
        .chart-footer {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 0.375rem;
          text-align: right;
        }

        /* Table */
        .table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .vitals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .vitals-table th {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 0.8rem;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .vitals-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          white-space: nowrap;
        }
        .vitals-table tbody tr:last-child td { border-bottom: none; }
        .vitals-table tbody tr:hover { background: #f8fafc; }
        .td-date { color: #64748b; font-size: 0.8rem; }
        .risk-pill {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .top-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .charts-grid { grid-template-columns: 1fr; }
          .top-cards-grid { grid-template-columns: repeat(2, 1fr); }
          .vh-page-header { flex-direction: column; align-items: flex-start; }
          .last-update { margin-left: 0; }
        }
        @media (max-width: 480px) {
          .top-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
};

export default NursePatientVitalsHistory;
