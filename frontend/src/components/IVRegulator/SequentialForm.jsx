import React, { useState } from 'react';

const VALVE_OPTIONS = [5, 6, 7];

const DEFAULT_STEPS = [
  { valve: 5, flowRateMlMin: '', volumeMl: '' },
  { valve: 6, flowRateMlMin: '', volumeMl: '' },
  { valve: 7, flowRateMlMin: '', volumeMl: '' },
];

/**
 * SequentialForm — configure valve steps for sequential mode.
 * Calls POST /api/iv/sequential on submit.
 * Each row shows the estimated delivery duration: duration = volume / flowRate minutes.
 */
const SequentialForm = ({ onConfigured }) => {
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleChange = (index, field, value) => {
    const updated = steps.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setSteps(updated);
    // Clear field error on change
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
      if (s.flowRateMlMin === '' || isNaN(flow) || flow <= 0) {
        newErrors[`${i}_flowRateMlMin`] = 'Enter flow rate > 0';
      }
      const vol = parseFloat(s.volumeMl);
      if (s.volumeMl === '' || isNaN(vol) || vol <= 0) {
        newErrors[`${i}_volumeMl`] = 'Enter volume > 0';
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
        steps: steps.map((s) => ({
          valve: Number(s.valve),
          flowRateMlMin: parseFloat(s.flowRateMlMin),
          volumeMl: parseFloat(s.volumeMl),
        })),
      };
      const res = await fetch('http://localhost:5000/api/iv/sequential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Configuration failed');
      // Pass array of SEQSET commands back to parent for display
      if (onConfigured) onConfigured(data.commands || []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="iv-form" onSubmit={handleSubmit}>
      <h3 className="iv-form-title">Configure Steps (Sequential Mode)</h3>

      {apiError && <div className="iv-error-banner">{apiError}</div>}

      <div className="iv-form-grid iv-form-grid--sequential">
        <div className="iv-form-header iv-form-header--sequential">
          <span>Valve</span>
          <span>Flow Rate (mL/min)</span>
          <span>Volume (mL)</span>
          <span>Est. Duration</span>
        </div>

        {steps.map((s, i) => {
          const flow = parseFloat(s.flowRateMlMin);
          const vol = parseFloat(s.volumeMl);
          // duration (min) = volume / flow rate
          const durationMin = (!isNaN(flow) && flow > 0 && !isNaN(vol) && vol > 0)
            ? (vol / flow).toFixed(1)
            : '—';

          return (
            <div key={i} className="iv-form-row iv-form-row--sequential">
              {/* Valve selector */}
              <div className="iv-input-group">
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

              {/* Flow rate */}
              <div className="iv-input-group">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 2.0"
                  value={s.flowRateMlMin}
                  onChange={(e) => handleChange(i, 'flowRateMlMin', e.target.value)}
                  className={`iv-input ${errors[`${i}_flowRateMlMin`] ? 'iv-input--error' : ''}`}
                />
                {errors[`${i}_flowRateMlMin`] && (
                  <span className="iv-field-error">{errors[`${i}_flowRateMlMin`]}</span>
                )}
              </div>

              {/* Volume */}
              <div className="iv-input-group">
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

              {/* Estimated duration */}
              <span className="iv-calc">
                {durationMin !== '—' ? `${durationMin} min` : '—'}
              </span>
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
