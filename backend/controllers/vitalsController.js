const Vital = require('../models/Vital');
const Patient = require('../models/Patient');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const Case = require('../models/Case');
const { predictVitalsRisk } = require('../utils/aiService');
const { appendVitalToDataset } = require('../utils/datasetLogger');

const getNestedValue = (source, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const normalizeAiResult = (aiResult) => {
  if (!aiResult) {
    return {
      aiPrediction: undefined,
      aiAlert: undefined,
      riskLevel: undefined,
      confidenceScore: undefined,
      isAbnormal: false,
      isCritical: false
    };
  }

  const predictedClass = getNestedValue(aiResult, [
    'model_prediction.predicted_class',
    'predictedClass',
    'predicted_class',
    'prediction.predictedClass',
    'prediction.predicted_class',
    'prediction.class'
  ]);
  const predictedLabel = getNestedValue(aiResult, [
    'model_prediction.predicted_label',
    'predictedLabel',
    'predicted_label',
    'prediction.predictedLabel',
    'prediction.predicted_label',
    'prediction.label',
    'risk_level',
    'riskLevel'
  ]);
  const classProbabilities = getNestedValue(aiResult, [
    'model_prediction.class_probabilities',
    'classProbabilities',
    'class_probabilities',
    'prediction.classProbabilities',
    'prediction.class_probabilities',
    'probabilities'
  ]);
  const alertLevel = getNestedValue(aiResult, [
    'alertLevel',
    'alert_level',
    'alert.alertLevel',
    'alert.alert_level',
    'alert.level'
  ]);
  const alertMessage = getNestedValue(aiResult, [
    'alertMessage',
    'alert_message',
    'alert.alertMessage',
    'alert.alert_message',
    'alert.message'
  ]);
  const recommendedAction = getNestedValue(aiResult, [
    'recommendedAction',
    'recommended_action',
    'alert.recommendedAction',
    'alert.recommended_action'
  ]);
  const reasons = getNestedValue(aiResult, [
    'reasons',
    'alert.reasons'
  ]);
  const rawConfidenceScore = getNestedValue(aiResult, [
    'confidenceScore',
    'confidence_score',
    'model_prediction.confidence_score',
    'prediction.confidenceScore',
    'prediction.confidence_score',
    'confidence'
  ]);

  const probabilityEntries = classProbabilities && typeof classProbabilities === 'object'
    ? Object.entries(classProbabilities)
    : [];
  const confidenceFromPrediction = predictedLabel && probabilityEntries.length > 0
    ? probabilityEntries.find(([label]) => label.toLowerCase() === String(predictedLabel).toLowerCase())?.[1]
    : undefined;
  const confidenceScore = confidenceFromPrediction !== undefined
    ? Number(confidenceFromPrediction)
    : rawConfidenceScore;

  const isCritical = predictedLabel === 'Critical';
  const isAbnormal = predictedLabel === 'Abnormal' || predictedLabel === 'Critical';

  return {
    aiPrediction: {
      predictedClass: predictedClass === undefined ? undefined : Number(predictedClass),
      predictedLabel,
      classProbabilities
    },
    aiAlert: {
      alertLevel,
      alertMessage,
      recommendedAction,
      reasons: Array.isArray(reasons) ? reasons : []
    },
    riskLevel: predictedLabel,
    confidenceScore,
    isAbnormal,
    isCritical
  };
};

const createAiNotifications = async ({ patient, vital, notificationType, alertMessage }) => {
  if (!notificationType) {
    return;
  }

  const assignments = await Assignment.find({ patientId: patient._id, isActive: true });
  const userIds = new Set();

  assignments.forEach((assignment) => {
    if (assignment.nurseId) userIds.add(String(assignment.nurseId));
    if (assignment.doctorId) userIds.add(String(assignment.doctorId));
  });

  const openCase = await Case.findOne({ patientId: patient._id, status: 'open' });
  if (openCase?.doctorId) {
    userIds.add(String(openCase.doctorId));
  }

  const messagePrefix = notificationType === 'critical' ? 'CRITICAL' : 'WARNING';
  const message = `${messagePrefix}: Patient ${patient.fullName} - ${alertMessage || 'AI detected elevated health risk'}`;

  await Promise.all([...userIds].map((userId) => Notification.create({
    userId,
    type: notificationType,
    message,
    relatedPatientId: patient._id,
    relatedVitalId: vital._id
  })));
};

// @desc    Receive vitals from sensors
// @route   POST /api/v1/vitals/receive
// @access  Public (from sensors)
const receiveVitals = async (req, res) => {
  try {
    const { patientId, heartRate, spo2, temperature, source = 'sensor', deviceId } = req.body;

    if (!patientId || heartRate === undefined || spo2 === undefined || temperature === undefined) {
      return res.status(400).json({
        message: 'Please provide patientId, heartRate, spo2, and temperature'
      });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const timestamp = new Date().toISOString();
    const aiResult = await predictVitalsRisk({
      patientId,
      heartRate,
      spo2,
      temperature,
      timestamp
    });
    const normalizedAiResult = normalizeAiResult(aiResult);

    const savedVital = await Vital.create({
      patientId,
      heartRate,
      spo2,
      temperature,
      source,
      deviceId,
      ...normalizedAiResult,
      aiRawResponse: aiResult
    });

    await appendVitalToDataset(savedVital);

    const predictedLabel = normalizedAiResult.aiPrediction?.predictedLabel;
    const notificationType = predictedLabel === 'Critical'
      ? 'critical'
      : predictedLabel === 'Abnormal'
        ? 'warning'
        : null;

    await createAiNotifications({
      patient,
      vital: savedVital,
      notificationType,
      alertMessage: normalizedAiResult.aiAlert?.alertMessage
    });

    res.status(201).json({
      message: 'Vitals recorded',
      vital: savedVital,
      aiResult
    });
  } catch (error) {
    console.error('Receive vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get vitals by patient ID
// @route   GET /api/v1/vitals/patient/:patientId
// @access  Private
const getVitalsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    let query = { patientId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const vitals = await Vital.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(vitals);
  } catch (error) {
    console.error('Get vitals by patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get latest vital for a patient
// @route   GET /api/v1/vitals/patient/:patientId/latest
// @access  Private
const getLatestVital = async (req, res) => {
  try {
    const { patientId } = req.params;

    const vital = await Vital.findOne({ patientId })
      .sort({ createdAt: -1 });

    if (!vital) {
      return res.status(404).json({ message: 'No vitals found for this patient' });
    }

    res.json(vital);
  } catch (error) {
    console.error('Get latest vital error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get critical vitals history
// @route   GET /api/v1/vitals/critical
// @access  Private
const getCriticalVitals = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const vitals = await Vital.find({ isCritical: true })
      .populate('patientId', 'fullName nationalID')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(vitals);
  } catch (error) {
    console.error('Get critical vitals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  receiveVitals,
  getVitalsByPatient,
  getLatestVital,
  getCriticalVitals
};
