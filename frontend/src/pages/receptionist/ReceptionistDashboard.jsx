import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import StatCard from '../../components/common/StatCard';
import { receptionistAPI } from '../../services/api';
import { FiUsers, FiAlertCircle, FiDollarSign, FiCalendar, FiSearch, FiPlus, FiArrowRight, FiFileText, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const [stats, setStats] = useState({
    todayCheckIns: 24,
    pendingRegistrations: 3,
    outstandingBills: 12450,
    appointmentsToday: 18
  });
  const [searchTab, setSearchTab] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      if (searchTab === 'nationalID') {
        const response = await receptionistAPI.searchPatient(searchTerm);
        console.log('Found patient:', response.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout appName="MedHub" role="receptionist">
      <div className="page-header">
        <div className="header-with-date">
          <div>
            <h1>Hospital Management System</h1>
          </div>
          <div className="header-date">
            <span>Receptionist</span>
            <span className="date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Today's Check-ins"
          value={stats.todayCheckIns}
          icon={FiUsers}
          color="blue"
        />
        <StatCard
          title="Pending Registrations"
          value={stats.pendingRegistrations}
          icon={FiAlertCircle}
          color="orange"
        />
        <StatCard
          title="Outstanding Bills"
          value={`$${stats.outstandingBills.toLocaleString()}`}
          icon={FiDollarSign}
          color="green"
        />
        <StatCard
          title="Appointments Today"
          value={stats.appointmentsToday}
          icon={FiCalendar}
          color="cyan"
        />
      </div>

      <div className="search-section">
        <div className="search-header">
          <FiSearch />
          <h2>Quick Patient Search</h2>
        </div>
        <div className="search-tabs">
          <button
            className={`search-tab ${searchTab === 'name' ? 'active' : ''}`}
            onClick={() => setSearchTab('name')}
          >
            By Name
          </button>
          <button
            className={`search-tab ${searchTab === 'phone' ? 'active' : ''}`}
            onClick={() => setSearchTab('phone')}
          >
            By Phone
          </button>
          <button
            className={`search-tab ${searchTab === 'nationalID' ? 'active' : ''}`}
            onClick={() => setSearchTab('nationalID')}
          >
            By National ID
          </button>
        </div>
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder={`Search patient by ${searchTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card warning">
          <span className="status-title">Missing documents</span>
          <span className="status-value">5 items</span>
        </div>
        <div className="status-card danger">
          <span className="status-title">Unpaid bills</span>
          <span className="status-value">12 items</span>
        </div>
        <div className="status-card info">
          <span className="status-title">Pending registrations</span>
          <span className="status-value">3 items</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="quick-actions-grid">
            <Link to="/receptionist/patients" className="quick-action-card purple">
              <FiPlus className="action-icon" />
              <span>Register Patient</span>
            </Link>
            <Link to="/receptionist/visits" className="quick-action-card cyan">
              <FiArrowRight className="action-icon" />
              <span>Check In</span>
            </Link>
            <Link to="/receptionist/billing" className="quick-action-card blue">
              <FiFileText className="action-icon" />
              <span>Billing</span>
            </Link>
            <Link to="/receptionist/appointments" className="quick-action-card orange">
              <FiClock className="action-icon" />
              <span>Appointments</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .header-with-date {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-date {
          text-align: right;
        }
        .header-date span {
          display: block;
        }
        .header-date .date {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .quick-action-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          color: white;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s, opacity 0.2s;
        }
        .quick-action-card:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        .quick-action-card.purple {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }
        .quick-action-card.cyan {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
        }
        .quick-action-card.blue {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        .quick-action-card.orange {
          background: linear-gradient(135deg, #f97316, #ea580c);
        }
        .quick-action-card .action-icon {
          font-size: 1.5rem;
        }
        .quick-action-card span {
          font-size: 0.85rem;
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </Layout>
  );
};

export default ReceptionistDashboard;
