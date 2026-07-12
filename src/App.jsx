import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import SettingsDashboard from './components/SettingsDashboard';
import IssuesDashboard from './components/IssuesDashboard';
import RepositoriesDashboard from './components/RepositoriesDashboard';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';

function App() {
  const [jwtToken, setJwtToken] = useState(localStorage.getItem('jwtToken') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [hasConfig, setHasConfig] = useState(null); // null = loading, false = onboarding, true = dashboard
  const [activeTab, setActiveTab] = useState('issues');
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const dropdownRef = useRef(null);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = (token, user) => {
    setJwtToken(token);
    setUsername(user);
    localStorage.setItem('jwtToken', token);
    localStorage.setItem('username', user);
  };

  const handleLogout = () => {
    setJwtToken(null);
    setUsername('');
    setHasConfig(null);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('username');
  };

  // Check config status once logged in
  useEffect(() => {
    if (jwtToken) {
      const checkConfig = async () => {
        try {
          const res = await fetch('http://localhost:8080/api/v1/config', {
            headers: { 'Authorization': `Bearer ${jwtToken}` } // Wait, gateway translates JWT. Actually config-service just expects X-Tenant-Id?
            // Since we added gateway, the gateway will validate JWT and forward X-Tenant-Id. For direct access we need to pass token.
            // But we can just use the token in Authorization header, gateway parses it.
          });
          
          if (res.ok) {
            const data = await res.json();
            // If it has an ID, it was saved in DB. Otherwise it's a new empty config.
            if (data && data.id) {
              setHasConfig(true);
            } else {
              setHasConfig(false);
            }
          } else {
            setHasConfig(false);
          }
        } catch (err) {
          console.error("Failed to fetch config", err);
          setHasConfig(false);
        }
      };
      checkConfig();
    }
  }, [jwtToken]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!jwtToken) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (hasConfig === null) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-main)' }}>Loading...</div>;
  }

  if (hasConfig === false) {
    return <OnboardingScreen jwtToken={jwtToken} onComplete={() => setHasConfig(true)} />;
  }

  return (
    <div className="app-container">
      {/* Professional Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            DevOps Pro
          </div>
          <nav className="top-nav">
            <div 
              className={`top-nav-item ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              Overview
            </div>
            <div 
              className={`top-nav-item ${activeTab === 'repositories' ? 'active' : ''}`}
              onClick={() => setActiveTab('repositories')}
            >
              Repositories
            </div>
          </nav>
        </div>

        <div className="topbar-actions">
          {/* Theme Toggle */}
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ padding: '0.4rem', border: 'none', background: 'transparent' }} 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)', margin: '0 0.5rem' }}></div>

          {/* User Profile Dropdown */}
          <div className="user-dropdown-container" ref={dropdownRef} onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-profile">
              <div className="avatar">{username ? username.substring(0, 2).toUpperCase() : 'AD'}</div>
              <div className="user-info">
                <span className="user-name" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username || 'Admin User'}</span>
                <span className="user-role">Platform Engineer</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '0.25rem', color: 'var(--text-muted)' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {showDropdown && (
              <div className="dropdown-menu">
                <div 
                  className="dropdown-item"
                  onClick={() => setActiveTab('settings')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  System Settings
                </div>
                
                <div className="dropdown-divider"></div>
                
                <div className="dropdown-item danger" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <div className="dashboard-layout">
        
        <main className="main-content">
          {activeTab === 'issues' && <IssuesDashboard jwtToken={jwtToken} />}
          {activeTab === 'repositories' && <RepositoriesDashboard jwtToken={jwtToken} />}
          {activeTab === 'settings' && <SettingsDashboard jwtToken={jwtToken} />}
        </main>
      </div>
    </div>
  );
}

export default App;
