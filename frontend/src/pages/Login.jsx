import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { FiUser, FiLock, FiPhone, FiCreditCard, FiEye, FiEyeOff, FiGlobe } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const { login, requestOTP, verifyOTP } = useAuth();
  const { t } = useTranslation();
  const { toggleLanguage } = useLanguage();

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
      setError(result.message || t('login.loginFailed'));
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

  const getRoleLabel = () => {
    switch (role) {
      case 'doctor': return t('login.doctor');
      case 'nurse': return t('login.nurse');
      case 'receptionist': return t('login.receptionist');
      default: return role;
    }
  };

  const getIdLabel = () => {
    switch (role) {
      case 'doctor': return t('login.doctorId');
      case 'nurse': return t('login.nurseId');
      case 'receptionist': return t('login.receptionistId');
      default: return t('login.doctorId');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <button
          type="button"
          className="login-lang-btn"
          onClick={toggleLanguage}
          aria-label="Switch language"
        >
          <FiGlobe size={16} />
          <span>{t('lang.toggle')}</span>
        </button>

        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">E</span>
            <h1>{t('login.title')}</h1>
          </div>
          <p>{t('login.subtitle')}</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${loginType === 'staff' ? 'active' : ''}`}
            onClick={() => { setLoginType('staff'); setError(''); }}
          >
            {t('login.staffLogin')}
          </button>
          <button
            className={`tab ${loginType === 'patient' ? 'active' : ''}`}
            onClick={() => { setLoginType('patient'); setError(''); setOtpSent(false); }}
          >
            {t('login.patientLogin')}
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loginType === 'staff' ? (
          <form onSubmit={handleStaffLogin} className="login-form">
            <div className="form-group">
              <label>{t('login.role')}</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-select"
              >
                <option value="doctor">{t('login.doctor')}</option>
                <option value="nurse">{t('login.nurse')}</option>
                <option value="receptionist">{t('login.receptionist')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{getIdLabel()}</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('login.enterYourId', { role: getRoleLabel() })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('login.password')}</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.enterPassword')}
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
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        ) : (
          <>
            {!otpSent ? (
              <form onSubmit={handleRequestOTP} className="login-form">
                <div className="form-group">
                  <label>{t('login.nationalId')}</label>
                  <div className="input-wrapper">
                    <FiCreditCard className="input-icon" />
                    <input
                      type="text"
                      value={nationalID}
                      onChange={(e) => setNationalID(e.target.value)}
                      placeholder={t('login.enterNationalId')}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('login.phoneNumber')}</label>
                  <div className="input-wrapper">
                    <FiPhone className="input-icon" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('login.enterPhone')}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? t('login.sendingOtp') : t('login.requestOtp')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="login-form">
                <div className="otp-info">
                  <p>{t('login.otpSentTo', { phone })}</p>
                  <button
                    type="button"
                    className="change-number"
                    onClick={() => setOtpSent(false)}
                  >
                    {t('login.changeNumber')}
                  </button>
                </div>

                <div className="form-group">
                  <label>{t('login.enterOtp')}</label>
                  <div className="input-wrapper">
                    <FiLock className="input-icon" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t('login.enterSixDigitOtp')}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? t('login.verifying') : t('login.verifyLogin')}
                </button>

                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleRequestOTP}
                  disabled={loading}
                >
                  {t('login.resendOtp')}
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
