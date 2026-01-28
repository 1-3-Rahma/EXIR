import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, appName, role }) => {
  return (
    <div className="app-layout">
      <Sidebar appName={appName} role={role} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
