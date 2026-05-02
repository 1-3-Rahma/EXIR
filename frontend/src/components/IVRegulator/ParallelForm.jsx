import React, { useState } from 'react';

const DEFAULT_PUMPS = [
  { pump: 1, flowRateMlMin: '' },
  { pump: 2, flowRateMlMin: '' },
  { pump: 3, flowRateMlMin: '' },
];

/**
 * ParallelForm — configure flow rates for pumps 1-3.
 * Calls POST /api/iv/parallel and reports the generated command to the parent.
 */
const ParallelForm = ({ onConfigured }) => {
  const [pumps, setPumps] = useState(DEFAULT_PUMPS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleChange = (index, value) => {
    const updated = pumps.map((p, i) =>
      i === index ? { ...p, flowRateMlMin: value } : p
    );
    setPumps(updated);
    // Clear field-level error when nurse starts typing
    if (errors[index]) {
      setErrors((prev) => { const e = { ...prev }; delete e[index]; return e; });
    }
  };

  const validate = () => {
    const newErrors = {};
    pumps.forEach((p, i) => {
      const val = parseFloat(p.flowRateMlMin);
      if (p.flowRateMlMin === '' || isNaN(val) || val <= 0) {
        newErrors[i] = 'Enter a flow rate > 0';
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
        mode: 'parallel',
        pumps: pumps.map((p) => ({
          pump: p.pump,
          flowRateMlMin: parseFloat(p.flowRateMlMin),
        })),
      };
      const res = await fetch('http://localhost:5000/api/iv/parallel', {
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

      {apiError && <div className="iv-error-banner">{apiError}</div>}

      <div className="iv-form-grid">
        <div className="iv-form-header">
          <span>Pump</span>
          <span>Flow Rate (mL/min)</span>
          <span>Drop Rate (gtt/min)</span>
        </div>

        {pumps.map((p, i) => {
          const flowVal = parseFloat(p.flowRateMlMin);
          // Drop factor: 20 gtt/mL → gtt/min = mL/min × 20
          const dropRate = (!isNaN(flowVal) && flowVal > 0)
            ? (flowVal * 20).toFixed(0)
            : '—';

          return (
            <div key={p.pump} className="iv-form-row">
              <label className="iv-pump-label">Pump {p.pump}</label>

              <div className="iv-input-group">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 2.0"
                  value={p.flowRateMlMin}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className={`iv-input ${errors[i] ? 'iv-input--error' : ''}`}
                />
                {errors[i] && <span className="iv-field-error">{errors[i]}</span>}
              </div>

              <span className="iv-calc">{dropRate} gtt/min</span>
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
