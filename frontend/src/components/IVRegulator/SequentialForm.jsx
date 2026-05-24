import React, { useState } from 'react';

const IV_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1$/, '/api');

const VALVE_OPTIONS = [5, 6, 7];

const DEFAULT_STEPS = [
  { valve: 5, flowRateMlMin: '', volumeMl: '', delayHours: '', delayMinutes: '' },
  { valve: 6, flowRateMlMin: '', volumeMl: '', delayHours: '', delayMinutes: '' },
  { valve: 7, flowRateMlMin: '', volumeMl: '', delayHours: '', delayMinutes: '' },
];

const SequentialForm = ({ onConfigured, patientId }) => {
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleChange = (index, field, value) => {
    const updated = steps.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setSteps(updated);
    const key = `${index}_${field}`;
    if (errors[key]) {
      setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
    }
  };

  const validate = () => {
    const newErrors = {};
    steps.forEach((s, i) => {
      if (!VALVE_OPTIONS.includes(Number(s.valve))) {
        newErrors[`${i}_valve`] = 'Select valve 5, 6, or 7';
      }
      const flow = parseFloat(s.flowRateMlMin);
      if (s.flowRateMlMin === '' || isNaN(flow) || flow < 1.5 || flow > 3) {
        newErrors[`${i}_flowRateMlMin`] = 'Enter flow rate 1.5–3 mL/min';
      }
      const vol = parseFloat(s.volumeMl);
      if (s.volumeMl === '' || isNaN(vol) || vol <= 0) {
        newErrors[`${i}_volumeMl`] = 'Enter volume > 0';
      }
      const dh = s.delayHours === '' ? 0 : parseInt(s.delayHours, 10);
      const dm = s.delayMinutes === '' ? 0 : parseInt(s.delayMinutes, 10);
      if (s.delayHours !== '' && (isNaN(dh) || dh < 0)) {
        newErrors[`${i}_delayHours`] = 'Hours ≥ 0';
      }
      if (s.delayMinutes !== '' && (isNaN(dm) || dm < 0 || dm > 59)) {
        newErrors[`${i}_delayMinutes`] = '0–59';
      }
    });
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
        mode: 'sequential',
        patientId: patientId || null,
        steps: steps.map((s) => ({
          valve: Number(s.valve),
          flowRateMlMin: parseFloat(s.flowRateMlMin),
          volumeMl: parseFloat(s.volumeMl),
          delaySeconds:
            (s.delayHours === '' ? 0 : parseInt(s.delayHours, 10)) * 3600 +
            (s.delayMinutes === '' ? 0 : parseInt(s.delayMinutes, 10)) * 60,
        })),
      };
      const res = await fetch(`${IV_BASE}/iv/sequential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Configuration failed');
      if (onConfigured) onConfigured(data.commands || [], payload.steps);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="iv-form" onSubmit={handleSubmit}>
      <h3 className="iv-form-title">Configure Steps (Sequential Mode)</h3>
      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '-0.25rem 0 0.75rem' }}>
        Flow rate: 1.5–3 mL/min. Delay is optional — time to wait before the next valve starts.
      </p>

      {apiError && <div className="iv-error-banner">{apiError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {steps.map((s, i) => {
          const flow = parseFloat(s.flowRateMlMin);
          const vol = parseFloat(s.volumeMl);
          const durationMin = (!isNaN(flow) && flow > 0 && !isNaN(vol) && vol > 0)
            ? (vol / flow).toFixed(1)
            : null;

          const dh = s.delayHours === '' ? 0 : parseInt(s.delayHours, 10);
          const dm = s.delayMinutes === '' ? 0 : parseInt(s.delayMinutes, 10);
          const hasDelay = (!isNaN(dh) && dh > 0) || (!isNaN(dm) && dm > 0);

          return (
            <div key={i} style={{
              border: '1px solid #e2e8f0', borderRadius: '0.6rem',
              padding: '0.875rem', background: '#fafafa'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '0.6rem' }}>
                Step {i + 1}
              </div>

              {/* Row 1: valve, flow, volume */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <div className="iv-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>Valve</label>
                  <select
                    value={s.valve}
                    onChange={(e) => handleChange(i, 'valve', Number(e.target.value))}
                    className={`iv-select ${errors[`${i}_valve`] ? 'iv-input--error' : ''}`}
                  >
                    {VALVE_OPTIONS.map((v) => (
                      <option key={v} value={v}>Valve {v}</option>
                    ))}
                  </select>
                  {errors[`${i}_valve`] && (
                    <span className="iv-field-error">{errors[`${i}_valve`]}</span>
                  )}
                </div>

                <div className="iv-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>
                    Flow Rate (mL/min)
                  </label>
                  <input
                    type="number"
                    min="1.5"
                    max="3"
                    step="0.01"
                    placeholder="1.5–3"
                    value={s.flowRateMlMin}
                    onChange={(e) => handleChange(i, 'flowRateMlMin', e.target.value)}
                    className={`iv-input ${errors[`${i}_flowRateMlMin`] ? 'iv-input--error' : ''}`}
                  />
                  {errors[`${i}_flowRateMlMin`] && (
                    <span className="iv-field-error">{errors[`${i}_flowRateMlMin`]}</span>
                  )}
                </div>

                <div className="iv-input-group">
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>
                    Volume (mL)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="e.g. 100"
                    value={s.volumeMl}
                    onChange={(e) => handleChange(i, 'volumeMl', e.target.value)}
                    className={`iv-input ${errors[`${i}_volumeMl`] ? 'iv-input--error' : ''}`}
                  />
                  {errors[`${i}_volumeMl`] && (
                    <span className="iv-field-error">{errors[`${i}_volumeMl`]}</span>
                  )}
                </div>
              </div>

              {/* Row 2: optional delay + duration */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem', display: 'block' }}>
                    Delay after this step (optional)
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <div className="iv-input-group" style={{ width: '70px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={s.delayHours}
                        onChange={(e) => handleChange(i, 'delayHours', e.target.value)}
                        className={`iv-input ${errors[`${i}_delayHours`] ? 'iv-input--error' : ''}`}
                      />
                      {errors[`${i}_delayHours`] && (
                        <span className="iv-field-error">{errors[`${i}_delayHours`]}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hr</span>
                    <div className="iv-input-group" style={{ width: '70px' }}>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        placeholder="0"
                        value={s.delayMinutes}
                        onChange={(e) => handleChange(i, 'delayMinutes', e.target.value)}
                        className={`iv-input ${errors[`${i}_delayMinutes`] ? 'iv-input--error' : ''}`}
                      />
                      {errors[`${i}_delayMinutes`] && (
                        <span className="iv-field-error">{errors[`${i}_delayMinutes`]}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>min</span>
                  </div>
                </div>

                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Est. infusion</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                    {durationMin ? `${durationMin} min` : '—'}
                  </span>
                  {hasDelay && !isNaN(dh) && !isNaN(dm) && (
                    <span style={{ fontSize: '0.75rem', color: '#92400e', display: 'block' }}>
                      + {dh}h {dm}m delay
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="submit" className="iv-btn iv-btn--primary" disabled={loading}>
        {loading ? 'Configuring…' : 'Configure Steps'}
      </button>
    </form>
  );
};

export default SequentialForm;
