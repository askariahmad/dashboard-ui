import React from 'react';
import SettingsDashboard from './SettingsDashboard';

const OnboardingScreen = ({ jwtToken, onComplete }) => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-main)', overflow: 'hidden' }}>
      <div style={{ padding: '2rem 3rem', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>Welcome to DevOps Pro</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Let's configure your workspace integrations to get started.</p>
        </div>
        <button className="btn" onClick={onComplete}>
          Complete Onboarding
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '0.5rem' }}>
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <SettingsDashboard jwtToken={jwtToken} hideHeader={true} />
      </div>
    </div>
  );
};

export default OnboardingScreen;
