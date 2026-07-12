import React from 'react';

const RepositoriesDashboard = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h2>Connected Repositories</h2>
          <p>Manage source code repositories for AI scanning and vulnerability detection.</p>
        </div>
        <button className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Repository
        </button>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <h3 style={{ marginBottom: '0.5rem' }}>No Repositories Connected</h3>
        <p style={{ color: 'var(--text-muted)' }}>Connect your first GitHub repository to start scanning for hardcoded secrets and vulnerabilities.</p>
      </div>
    </div>
  );
};

export default RepositoriesDashboard;
