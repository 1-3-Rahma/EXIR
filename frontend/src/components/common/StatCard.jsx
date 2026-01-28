import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle }) => {
  const colorClasses = {
    blue: 'stat-card-blue',
    red: 'stat-card-red',
    green: 'stat-card-green',
    orange: 'stat-card-orange',
    purple: 'stat-card-purple',
    cyan: 'stat-card-cyan'
  };

  return (
    <div className={`stat-card ${colorClasses[color] || ''}`}>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className={`stat-value ${trend === 'critical' ? 'critical' : ''}`}>
          {value}
        </span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
      {Icon && (
        <div className={`stat-icon ${color}`}>
          <Icon />
        </div>
      )}
    </div>
  );
};

export default StatCard;
