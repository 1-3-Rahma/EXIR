import React, { useState } from 'react';
<<<<<<< HEAD
import { IV_API_BASE } from '../../services/api';
=======
import { IV_BASE_URL } from '../../services/api';
>>>>>>> 851cb544ab9fb44341a3f6d8abcfe6d9c0a2175a

const DEFAULT_PUMPS = [
  { pump: 1, flowRateMlMin: '' },
  { pump: 2, flowRateMlMin: '' },
  { pump: 3, flowRateMlMin: '' },
];

const ParallelForm = ({ onConfigured, patientId }) => {
  const [pumps, setPumps] = useState(DEFAULT_PUMPS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleChange = (index, value) => {
    const updated = pumps.map((p, i) =>
      i === index ? { ...p, flowRateMlMin: value } : p
    );
    setPumps(updated);
    if (errors[index]) {
      setErrors((prev) => { const e = { ...prev }; delete e[index]; return e; });
    }
  };

  const validate = () => {
    const newErrors = {};
    let anyActive = false;
    pumps.forEach((p, i) => {
      if (p.flowRateMlMin === '' || p.flowRateMlMin === '0') return; // optional — skip
      const val = parseFloat(p.flowRateMlMin);
      if (isNaN(val) || val < 1 || val > 17) {
        newErrors[i] = 'Enter 1–17 mL/min (or leave blank to disable)';
      } else {
        anyActive = true;
      }
    });
    pumps.forEach((p) => {
      const val = parseFloat(p.flowRateMlMin);
      if (!isNaN(val) && val >= 1 && val <= 17) anyActive = true;
    });
    if (!anyActive) {
      newErrors['_global'] = 'At least one pump must have a flow rate';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        mode: 'parallel',
        patientId: patientId || null,
        pumps: pumps.map((p) => ({
          pump: p.pump,
          flowRateMlMin: p.flowRateMlMin === '' ? 0 : parseFloat(p.flowRateMlMin),
        })),
      };
<<<<<<< HEAD
      const res = await fetch(`${IV_API_BASE}/parallel`, {
=======
      const res = await fetch(`${IV_BASE_URL}/parallel`, {
>>>>>>> 851cb544ab9fb44341a3f6d8abcfe6d9c0a2175a
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Configuration failed');
      if (onConfigured) onConfigured(data.command);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="iv-form" onSubmit={handleSubmit}>
      <h3 className="iv-form-title">Configure Pumps (Parallel Mode)</h3>
      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '-0.25rem 0 0.75rem' }}>
        Leave a pump blank to disable it. Active pumps: 1–17 mL/min.
      </p>

      {apiError && <div className="iv-error-banner">{apiError}</div>}
      {errors['_global'] && <div className="iv-error-banner">{errors['_global']}</div>}

      <div className="iv-form-grid">
        <div className="iv-form-header">
          <span>Pump</span>
          <span>Flow Rate (mL/min)</span>
          <span>Drop Rate (gtt/min)</span>
        </div>

        {pumps.map((p, i) => {
          const flowVal = parseFloat(p.flowRateMlMin);
          const isDisabled = p.flowRateMlMin === '' || p.flowRateMlMin === '0' || isNaN(flowVal) || flowVal === 0;
          const dropRate = !isDisabled ? (flowVal * 20).toFixed(0) : null;

          return (
            <div key={p.pump} className="iv-form-row">
              <label className="iv-pump-label">
                Pump {p.pump}
                {isDisabled && (
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>
                    disabled
                  </span>
                )}
              </label>

              <div className="iv-input-group">
                <input
                  type="number"
                  min="1"
                  max="17"
                  step="0.01"
                  placeholder="Optional (1–17)"
                  value={p.flowRateMlMin}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className={`iv-input ${errors[i] ? 'iv-input--error' : ''}`}
                />
                {errors[i] && <span className="iv-field-error">{errors[i]}</span>}
              </div>

              <span className="iv-calc">
                {dropRate !== null ? `${dropRate} gtt/min` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <button type="submit" className="iv-btn iv-btn--primary" disabled={loading}>
        {loading ? 'Configuring…' : 'Configure Pumps'}
      </button>
    </form>
  );
};

export default ParallelForm;
