import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const LoginScreen = ({ onLoginSuccess }) => {
  const { instance } = useMsal();
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  const handleMockAuth = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (!acceptedTerms) {
          setError('You must accept the terms of service.');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
      }
      
      const endpoint = isSignUp ? 'http://localhost:8080/api/v1/auth/signup' : 'http://localhost:8080/api/v1/auth/login';
      
      const payload = isSignUp ? {
        email: email,
        firstName: firstName,
        lastName: lastName,
        password: password
      } : {
        username: email,
        password: password
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.token, email);
      } else {
        if (isSignUp && res.status === 409) {
          setError('An account with this email already exists.');
        } else {
          setError(`Invalid credentials. Cannot ${isSignUp ? 'sign up' : 'sign in'}.`);
        }
      }
    } catch (err) {
      console.error(err);
      setError(`Local ${isSignUp ? 'Signup' : 'Login'} Failed: ` + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--text-main)', padding: '2rem 0' }}>
      <div className="card" style={{ width: '450px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{isSignUp ? 'Enter your details below to get started' : 'Sign in to your DevOps Pro account'}</p>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleMockAuth}>
          {isSignUp && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ textAlign: 'left', flex: 1, marginBottom: 0 }}>
                <label>First Name</label>
                <input className="input-field" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ textAlign: 'left', flex: 1, marginBottom: 0 }}>
                <label>Last Name</label>
                <input className="input-field" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label>{isSignUp ? 'Email Address' : 'Username or Email'}</label>
            <input 
              className="input-field" 
              type={isSignUp ? "email" : "text"} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder={isSignUp ? "Enter your email address" : "Enter your username or email"} 
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label>Password</label>
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {isSignUp && (
            <>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label>Confirm Password</label>
                <input className="input-field" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'left' }}>
                <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginRight: '0.5rem', cursor: 'pointer' }} />
                <label htmlFor="terms" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  I agree to the <span style={{ color: 'var(--primary-color)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary-color)' }}>Privacy Policy</span>.
                </label>
              </div>
            </>
          )}

          <button className="btn" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} disabled={loading} type="submit">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
          <span 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }} 
            style={{ color: 'var(--primary-color)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 600 }}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </span>
        </div>

        <div style={{ position: 'relative', margin: '2rem 0', textAlign: 'center' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>OR CONTINUE WITH</span>
        </div>

        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', background: '#0078D4', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          onClick={handleEntraLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Microsoft Entra ID
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
