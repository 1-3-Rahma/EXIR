import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiPhone, FiCreditCard, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const { login, requestOTP, verifyOTP } = useAuth();

  const [loginType, setLoginType] = useState('staff');
  const [role, setRole] = useState('doctor');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nationalID, setNationalID] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier, password, role);

    if (result.success && result.user) {
      navigate(`/${result.user.role}`);
    } else {
      setError(result.message || 'Login failed');
    }

    setLoading(false);
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await requestOTP(nationalID, phone);

    if (result.success) {
      setOtpSent(true);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await verifyOTP(nationalID, phone, otp);

    if (result.success) {
      navigate('/patient');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">E</span>
            <h1>EXIR Healthcare</h1>
          </div>
          <p>Smart Healthcare Monitoring System</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${loginType === 'staff' ? 'active' : ''}`}
            onClick={() => { setLoginType('staff'); setError(''); }}
          >
            Staff Login
          </button>
          <button
            className={`tab ${loginType === 'patient' ? 'active' : ''}`}
            onClick={() => { setLoginType('patient'); setError(''); setOtpSent(false); }}
          >
            Patient Login
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loginType === 'staff' ? (
          <form onSubmit={handleStaffLogin} className="login-form">
            <div className="form-group">
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-select"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                {role === 'doctor' ? 'Doctor ID' :
                 role === 'nurse' ? 'Nurse ID' : 'Receptionist ID'}
              </label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={`Enter your ${role} ID`}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <>
            {!otpSent ? (
              <form onSubmit={handleRequestOTP} className="login-form">
                <div className="form-group">
                  <label>National ID</label>
                  <div className="input-wrapper">
                    <FiCreditCard className="input-icon" />
                    <input
                      type="text"
                      value={nationalID}
                      onChange={(e) => setNationalID(e.target.value)}
                      placeholder="Enter your National ID"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <FiPhone className="input-icon" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Request OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="login-form">
                <div className="otp-info">
                  <p>OTP sent to {phone}</p>
                  <button
                    type="button"
                    className="change-number"
                    onClick={() => setOtpSent(false)}
                  >
                    Change number
                  </button>
                </div>

                <div className="form-group">
                  <label>Enter OTP</label>
                  <div className="input-wrapper">
                    <FiLock className="input-icon" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleRequestOTP}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
