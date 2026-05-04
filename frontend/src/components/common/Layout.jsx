import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { FiMenu } from 'react-icons/fi';

const Layout = ({ children, appName, role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when screen grows past mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prevent body scroll while sidebar overlay is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      {/* Backdrop — tap to close sidebar on mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        appName={appName}
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        {/* Mobile-only top bar */}
        <div className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FiMenu size={22} color="white" />
          </button>
          <span className="mobile-topbar-title">{appName}</span>
        </div>

        {children}
      </main>
    </div>
  );
};

export default Layout;
