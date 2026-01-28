import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import { FiSearch, FiDollarSign, FiCheckCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';

const ReceptionistBilling = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const patientRes = await receptionistAPI.searchPatient(searchTerm);
      const patient = patientRes.data;
      setPatientId(patient._id);

      const billingRes = await receptionistAPI.getPatientBilling(patient._id);
      setBilling({ ...billingRes.data, patientName: patient.fullName });
    } catch (error) {
      console.error('Error fetching billing:', error);
      setBilling(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Billing Management</h1>
        <p>Search and view patient billing information</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search patient by National ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {billing && (
        <div className="billing-result">
          <div className="billing-header">
            <h2>{billing.patientName}</h2>
            <span className={`payment-status ${billing.paymentStatus}`}>
              {billing.paymentStatus === 'paid' ? (
                <><FiCheckCircle /> Paid</>
              ) : billing.paymentStatus === 'partial' ? (
                <><FiAlertCircle /> Partial</>
              ) : (
                <><FiAlertCircle /> Pending</>
              )}
            </span>
          </div>

          <div className="billing-cards">
            <div className="billing-card">
              <div className="billing-icon blue">
                <FiDollarSign />
              </div>
              <div className="billing-info">
                <span className="label">Total Amount</span>
                <span className="value">${billing.totalAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>

            <div className="billing-card">
              <div className="billing-icon green">
                <FiCheckCircle />
              </div>
              <div className="billing-info">
                <span className="label">Paid Amount</span>
                <span className="value">${billing.paidAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>

            <div className="billing-card">
              <div className="billing-icon red">
                <FiAlertCircle />
              </div>
              <div className="billing-info">
                <span className="label">Due Amount</span>
                <span className="value">${billing.dueAmount?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          <div className="billing-actions">
            <button className="action-btn">
              <FiFileText /> Generate Invoice
            </button>
            <button className="action-btn primary">
              <FiDollarSign /> Record Payment
            </button>
          </div>
        </div>
      )}

      {!billing && !loading && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <FiDollarSign className="empty-icon" />
              <h3>Search for Patient Billing</h3>
              <p>Enter a patient's National ID to view their billing information</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-section {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .search-section .search-input-wrapper {
          flex: 1;
        }
        .search-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0 1.5rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .billing-result {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--border-color);
        }
        .billing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .billing-header h2 {
          font-size: 1.25rem;
        }
        .payment-status {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 500;
        }
        .payment-status.paid {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .payment-status.partial {
          background: rgba(249, 115, 22, 0.1);
          color: var(--accent-orange);
        }
        .payment-status.pending {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .billing-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .billing-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }
        .billing-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .billing-icon.blue {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .billing-icon.green {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .billing-icon.red {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .billing-info {
          display: flex;
          flex-direction: column;
        }
        .billing-info .label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .billing-info .value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .billing-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        .billing-actions .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: none;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .billing-actions .action-btn.primary {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistBilling;
