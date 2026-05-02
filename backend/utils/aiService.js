const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const predictVitalsRisk = async ({ patientId, heartRate, spo2, temperature, timestamp }) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/predict`,
      {
        patient_id: patientId,
        timestamp: timestamp || new Date().toISOString(),
        heart_rate: heartRate,
        spo2,
        temperature
      },
      {
        timeout: 5000
      }
    );

    return response.data;
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('AI service prediction failed:', detail);
    return null;
  }
};

module.exports = {
  predictVitalsRisk
};
