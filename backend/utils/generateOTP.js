const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  return { code: otp, expiresAt };
};

const verifyOTP = (storedOTP, enteredOTP) => {
  if (!storedOTP || !storedOTP.code || !storedOTP.expiresAt) {
    return { valid: false, message: 'No OTP found. Please request a new one.' };
  }

  if (new Date() > new Date(storedOTP.expiresAt)) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (storedOTP.code !== enteredOTP) {
    return { valid: false, message: 'Invalid OTP.' };
  }

  return { valid: true, message: 'OTP verified successfully.' };
};

module.exports = { generateOTP, verifyOTP };
