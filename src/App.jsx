import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
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
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('activeTab') || 'issues');
  const setActiveTab = (tab) => { setActiveTabState(tab); localStorage.setItem('activeTab', tab); };
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
    localStorage.removeItem('activeTab');
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
            if (data && data.id) {
              setHasConfig(true);
            } else {
              setHasConfig(false);
            }
          } else if (res.status === 401 || res.status === 403) {
            handleLogout();
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

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // SSE for notifications
  useEffect(() => {
    if (jwtToken && hasConfig) {
      // First fetch historical notifications from backend
      fetch('http://localhost:8080/api/v1/notifications', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNotifications(data);
        }
      })
      .catch(() => {}); // Silently ignore if notification service is down

      // Then connect SSE for live updates through API Gateway
      const evtSource = new EventSource(`http://localhost:8080/api/v1/notifications/stream?token=${jwtToken}`);
      
      evtSource.onmessage = (event) => {
        const notif = JSON.parse(event.data);
        setNotifications(prev => [notif, ...prev]);
      };
      
      evtSource.onerror = () => evtSource.close();
      
      return () => evtSource.close();
    }
  }, [jwtToken, hasConfig]);

  // Close notif dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-container">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--surface-border)' } }} />
      {/* Professional Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            DevOps Pro
          </div>
          {hasConfig !== false && (
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
          )}
        </div>

        <div className="topbar-actions">
          {/* Notification Bell */}
          <div className="user-dropdown-container" ref={notifRef} style={{ marginRight: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', position: 'relative', border: 'none', background: 'transparent' }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="dropdown-menu" style={{ width: '300px', right: '-50px', padding: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', fontWeight: 'bold' }}>
                  Notifications
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div key={idx} style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', background: notif.read ? 'transparent' : 'rgba(var(--primary-color-rgb), 0.05)' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{notif.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{notif.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
                {hasConfig !== false && (
                  <>
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
                  </>
                )}
                
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
          {hasConfig === false ? (
            <OnboardingScreen jwtToken={jwtToken} onComplete={() => setHasConfig(true)} />
          ) : (
            <>
              {localStorage.getItem('unverified_connections') === 'true' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Warning:</strong> You have unverified workspace connections. Some features may not work.
                  </div>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('settings')} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                    Verify Now
                  </button>
                </div>
              )}
              {activeTab === 'issues' && <IssuesDashboard jwtToken={jwtToken} />}
              {activeTab === 'repositories' && <RepositoriesDashboard jwtToken={jwtToken} />}
              {activeTab === 'settings' && <SettingsDashboard jwtToken={jwtToken} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
