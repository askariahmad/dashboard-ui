import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const LoginScreen = ({ onLoginSuccess }) => {
  const { instance } = useMsal();
  const [mockUsername, setMockUsername] = useState('admin');
  const [mockPassword, setMockPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEntraLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const loginResponse = await instance.loginPopup(loginRequest);
      if (loginResponse && loginResponse.accessToken) {
        // Exchange with backend
        const res = await fetch('http://localhost:8080/api/v1/auth/entra-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entraToken: loginResponse.accessToken,
            username: loginResponse.account.username
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          onLoginSuccess(data.token, loginResponse.account.username);
        } else {
          setError('Failed to authenticate with backend.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Entra ID Login Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: mockUsername,
          password: mockPassword
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.token, mockUsername);
      } else {
        setError('Invalid mock credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Mock Login Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
      <div className="card" style={{ width: '400px', padding: '2rem', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>DevOps Pro</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Sign in to continue</p>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <button 
          className="btn" 
          style={{ width: '100%', marginBottom: '2rem', padding: '0.75rem', fontSize: '1rem', background: '#0078D4', color: '#fff', border: 'none' }}
          onClick={handleEntraLogin}
          disabled={loading}
        >
          Sign in with Microsoft
        </button>

        <div style={{ position: 'relative', margin: '2rem 0', textAlign: 'center' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>OR MOCK LOGIN</span>
        </div>

        <form onSubmit={handleMockLogin}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Username</label>
            <input className="input-field" type="text" value={mockUsername} onChange={e => setMockUsername(e.target.value)} required />
          </div>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Password</label>
            <input className="input-field" type="password" value={mockPassword} onChange={e => setMockPassword(e.target.value)} required />
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading} type="submit">
            Mock Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
