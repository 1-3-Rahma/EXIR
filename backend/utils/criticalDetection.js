const CRITICAL_THRESHOLDS = {
  heartRate: {
    min: 50,
    max: 120
  },
  spo2: {
    min: 90
  },
  temperature: {
    min: 35,
    max: 39
  }
};

const checkCriticalVitals = (vitals) => {
  const { heartRate, spo2, temperature } = vitals;
  const criticalConditions = [];

  if (heartRate < CRITICAL_THRESHOLDS.heartRate.min) {
    criticalConditions.push(`Low heart rate: ${heartRate} bpm (below ${CRITICAL_THRESHOLDS.heartRate.min})`);
  }
  if (heartRate > CRITICAL_THRESHOLDS.heartRate.max) {
    criticalConditions.push(`High heart rate: ${heartRate} bpm (above ${CRITICAL_THRESHOLDS.heartRate.max})`);
  }

  if (spo2 < CRITICAL_THRESHOLDS.spo2.min) {
    criticalConditions.push(`Low SpO2: ${spo2}% (below ${CRITICAL_THRESHOLDS.spo2.min}%)`);
  }

  if (temperature < CRITICAL_THRESHOLDS.temperature.min) {
    criticalConditions.push(`Low temperature: ${temperature}°C (below ${CRITICAL_THRESHOLDS.temperature.min}°C)`);
  }
  if (temperature > CRITICAL_THRESHOLDS.temperature.max) {
    criticalConditions.push(`High temperature: ${temperature}°C (above ${CRITICAL_THRESHOLDS.temperature.max}°C)`);
  }

  return {
    isCritical: criticalConditions.length > 0,
    conditions: criticalConditions
  };
};

module.exports = {
  checkCriticalVitals,
  CRITICAL_THRESHOLDS
};
