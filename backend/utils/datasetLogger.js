const fs = require('fs/promises');
const path = require('path');

const datasetDir = path.join(__dirname, '..', 'datasets');
const datasetFile = path.join(datasetDir, 'vitals_dataset.csv');

const columns = [
  'timestamp',
  'patientId',
  'deviceId',
  'heartRate',
  'spo2',
  'temperature',
  'riskLevel',
  'confidenceScore',
  'isAbnormal',
  'isCritical',
  'source'
];

const escapeCsvValue = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const stringValue = value instanceof Date ? value.toISOString() : String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const getIdValue = (value) => {
  if (!value) {
    return '';
  }

  return value._id || value;
};

const ensureDatasetFile = async () => {
  await fs.mkdir(datasetDir, { recursive: true });

  const fileHandle = await fs.open(datasetFile, 'a+');
  try {
    const stats = await fileHandle.stat();
    if (stats.size === 0) {
      await fileHandle.write(`${columns.join(',')}\n`);
    }
  } finally {
    await fileHandle.close();
  }
};

const appendVitalToDataset = async (vital) => {
  try {
    await ensureDatasetFile();

    const row = [
      vital.createdAt || vital.timestamp,
      getIdValue(vital.patientId),
      vital.deviceId,
      vital.heartRate,
      vital.spo2,
      vital.temperature,
      vital.riskLevel,
      vital.confidenceScore,
      vital.isAbnormal,
      vital.isCritical,
      vital.source
    ].map(escapeCsvValue).join(',');

    await fs.appendFile(datasetFile, `${row}\n`);
  } catch (error) {
    console.error('Dataset logging error:', error);
  }
};

module.exports = {
  appendVitalToDataset
};
