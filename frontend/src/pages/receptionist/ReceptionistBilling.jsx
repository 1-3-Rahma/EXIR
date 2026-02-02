import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { receptionistAPI } from '../../services/api';
import {
  FiSearch, FiDollarSign, FiCheckCircle, FiAlertCircle,
  FiUser, FiX, FiCalendar, FiLogOut, FiLogIn
} from 'react-icons/fi';

const ReceptionistBilling = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [billingDetails, setBillingDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async (search = '') => {
    setLoading(true);
    try {
      const response = await receptionistAPI.getPatientsWithBilling(search);
      setPatients(response.data);
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadPatients(searchTerm);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePatientClick = async (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    try {
      const response = await receptionistAPI.getPatientBillingDetails(patient._id);
      setBillingDetails(response.data);
    } catch (error) {
      console.error('Error fetching billing details:', error);
      alert('Failed to load billing details');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
    setBillingDetails(null);
  };

  const handleCheckout = async () => {
    if (!billingDetails?.canCheckout) return;

    if (!window.confirm('Are you sure you want to checkout this patient?')) return;

    setProcessing(true);
    try {
      await receptionistAPI.checkoutPatient(selectedPatient._id);

      // Refresh data
      const response = await receptionistAPI.getPatientBillingDetails(selectedPatient._id);
      setBillingDetails(response.data);
      loadPatients(searchTerm);

      alert('Patient checked out successfully! Visit has been added to visit history.');
    } catch (error) {
      console.error('Error checking out patient:', error);
      alert(error.response?.data?.message || 'Failed to checkout patient');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (billingDetails?.hasActiveVisit) return;

    if (!window.confirm('Start a new visit for this patient?')) return;

    setProcessing(true);
    try {
      await receptionistAPI.checkInPatient(selectedPatient._id);

      // Refresh data
      const response = await receptionistAPI.getPatientBillingDetails(selectedPatient._id);
      setBillingDetails(response.data);
      loadPatients(searchTerm);

      alert('Patient checked in successfully! A new visit has been started.');
    } catch (error) {
      console.error('Error checking in patient:', error);
      alert(error.response?.data?.message || 'Failed to check in patient');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const classes = {
      paid: 'status-paid',
      partial: 'status-partial',
      pending: 'status-pending'
    };
    return classes[status] || 'status-pending';
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <h1>Billing Management</h1>
        <p>View patient billing details and manage checkouts</p>
      </div>

      <div className="search-section">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Patients</h2>
          <span className="count-badge">{patients.length} patients</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="empty-state">
              <FiDollarSign className="empty-icon" />
              <h3>No Patients Found</h3>
              <p>No patients with billing records found</p>
            </div>
          ) : (
            <div className="patients-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>National ID</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient._id}
                      onClick={() => handlePatientClick(patient)}
                      className="clickable-row"
                    >
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">
                            {patient.fullName?.charAt(0) || 'P'}
                          </div>
                          <span>{patient.fullName}</span>
                        </div>
                      </td>
                      <td className="id-cell">{patient.nationalID}</td>
                      <td className="amount-cell">${patient.totalAmount?.toLocaleString() || '0'}</td>
                      <td className="amount-cell success">${patient.paidAmount?.toLocaleString() || '0'}</td>
                      <td className="amount-cell danger">${patient.dueAmount?.toLocaleString() || '0'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(patient.paymentStatus)}`}>
                          {patient.paymentStatus === 'paid' && <FiCheckCircle />}
                          {patient.paymentStatus !== 'paid' && <FiAlertCircle />}
                          {patient.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {patient.hasActiveVisit ? (
                          <span className="visit-badge active">Active</span>
                        ) : (
                          <span className="visit-badge">No Visit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Patient Billing Modal */}
      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal billing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <FiUser />
                <div>
                  <h2>{selectedPatient.fullName}</h2>
                  <span className="patient-id">ID: {selectedPatient.nationalID}</span>
                </div>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {!billingDetails ? (
                <div className="loading-state">Loading billing details...</div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="billing-summary">
                    <div className="summary-card">
                      <div className="summary-icon blue"><FiDollarSign /></div>
                      <div className="summary-info">
                        <span className="label">Total Amount</span>
                        <span className="value">${billingDetails.summary.totalAmount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-icon green"><FiCheckCircle /></div>
                      <div className="summary-info">
                        <span className="label">Paid Amount</span>
                        <span className="value">${billingDetails.summary.paidAmount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-icon red"><FiAlertCircle /></div>
                      <div className="summary-info">
                        <span className="label">Due Amount</span>
                        <span className="value">${billingDetails.summary.dueAmount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Records */}
                  <div className="billing-records">
                    <h3><FiCalendar /> Billing Records</h3>
                    {billingDetails.billingRecords.length === 0 ? (
                      <p className="no-records">No billing records found</p>
                    ) : (
                      <div className="records-list">
                        {billingDetails.billingRecords.map((record) => (
                          <div key={record._id} className="record-card">
                            <div className="record-header">
                              <div className="record-date">
                                <FiCalendar />
                                <span>{formatDate(record.visitDate)}</span>
                              </div>
                              <span className={`status-badge ${getStatusBadge(record.paymentStatus)}`}>
                                {record.paymentStatus}
                              </span>
                            </div>
                            <div className="record-amounts">
                              <div className="amount-item">
                                <span className="label">Total</span>
                                <span className="value">${record.totalAmount?.toLocaleString() || '0'}</span>
                              </div>
                              <div className="amount-item">
                                <span className="label">Paid</span>
                                <span className="value success">${record.paidAmount?.toLocaleString() || '0'}</span>
                              </div>
                              <div className="amount-item">
                                <span className="label">Due</span>
                                <span className="value danger">${record.dueAmount?.toLocaleString() || '0'}</span>
                              </div>
                            </div>
                            {record.items && record.items.length > 0 && (
                              <div className="record-items">
                                <span className="items-label">Items:</span>
                                <ul>
                                  {record.items.map((item, idx) => (
                                    <li key={idx}>
                                      {item.description} - ${item.amount?.toLocaleString()}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visit & Checkout Section */}
                  <div className="checkout-section">
                    <div className="checkout-info">
                      <p>
                        {billingDetails.hasActiveVisit
                          ? billingDetails.canCheckout
                            ? billingDetails.summary.totalAmount === 0
                              ? 'No billing records. Patient can be checked out.'
                              : 'All bills are paid. Patient can be checked out.'
                            : 'Patient has outstanding balance. Contact Financial Management for payment processing.'
                          : 'No active visit for this patient. Check in to start a new visit.'}
                      </p>
                    </div>
                    <div className="checkout-actions">
                      {billingDetails.hasActiveVisit ? (
                        <button
                          className="checkout-btn"
                          onClick={handleCheckout}
                          disabled={!billingDetails.canCheckout || processing}
                        >
                          <FiLogOut />
                          {processing ? 'Processing...' : 'Checkout Patient'}
                        </button>
                      ) : (
                        <button
                          className="checkin-btn"
                          onClick={handleCheckIn}
                          disabled={processing}
                        >
                          <FiLogIn />
                          {processing ? 'Processing...' : 'Check-in Patient'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
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
        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-white);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .search-input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9rem;
        }
        .search-btn {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          cursor: pointer;
        }
        .search-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .count-badge {
          background: var(--bg-light);
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .patients-table {
          overflow-x: auto;
        }
        .patients-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .patients-table th,
        .patients-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .patients-table th {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          background: var(--bg-light);
        }
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .clickable-row:hover {
          background-color: var(--bg-light);
        }
        .patient-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .patient-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .id-cell {
          font-family: monospace;
          font-size: 0.85rem;
        }
        .amount-cell {
          font-weight: 500;
        }
        .amount-cell.success { color: var(--accent-green); }
        .amount-cell.danger { color: var(--accent-red); }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-paid {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .status-partial {
          background: rgba(249, 115, 22, 0.1);
          color: var(--accent-orange);
        }
        .status-pending {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .visit-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          background: var(--bg-light);
          color: var(--text-secondary);
        }
        .visit-badge.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal {
          background: var(--bg-white);
          border-radius: var(--radius-lg);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .billing-modal {
          max-width: 700px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          background: var(--bg-white);
          z-index: 1;
        }
        .modal-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .modal-title h2 {
          font-size: 1.1rem;
          margin: 0;
        }
        .modal-title .patient-id {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-muted);
          padding: 0.25rem;
          border-radius: var(--radius-md);
        }
        .close-btn:hover {
          background: var(--bg-light);
        }
        .modal-body {
          padding: 1.5rem;
        }
        .billing-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }
        .summary-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        .summary-icon.blue {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-blue);
        }
        .summary-icon.green {
          background: rgba(34, 197, 94, 0.1);
          color: var(--accent-green);
        }
        .summary-icon.red {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
        }
        .summary-info {
          display: flex;
          flex-direction: column;
        }
        .summary-info .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .summary-info .value {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .billing-records h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }
        .no-records {
          text-align: center;
          color: var(--text-muted);
          padding: 1rem;
        }
        .records-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .record-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
        }
        .record-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .record-date {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .record-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .amount-item {
          display: flex;
          flex-direction: column;
        }
        .amount-item .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .amount-item .value {
          font-weight: 600;
        }
        .amount-item .value.success { color: var(--accent-green); }
        .amount-item .value.danger { color: var(--accent-red); }
        .record-items {
          background: var(--bg-light);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          margin-bottom: 0.75rem;
        }
        .items-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .record-items ul {
          margin: 0.5rem 0 0 1.25rem;
          padding: 0;
          font-size: 0.85rem;
        }
        .checkout-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .checkout-info p {
          margin: 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .checkout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-green);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }
        .checkout-btn:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
        }
        .checkout-actions {
          display: flex;
          gap: 0.75rem;
        }
        .checkin-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }
        .checkin-btn:disabled {
          background: var(--text-muted);
          cursor: not-allowed;
        }
        .checkin-btn:hover:not(:disabled) {
          background: var(--primary-blue);
        }
        @media (max-width: 768px) {
          .billing-summary {
            grid-template-columns: 1fr;
          }
          .record-amounts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistBilling;
