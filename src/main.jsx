import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';
import './index.css'
import App from './App.jsx'

// Global fetch and EventSource interceptor to dynamically route hardcoded localhost API calls to Azure Gateway
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('http://localhost:8080')) {
    const targetUrl = apiBaseUrl.endsWith('/api/v1')
      ? input.replace('http://localhost:8080/api/v1', apiBaseUrl)
      : input.replace('http://localhost:8080', apiBaseUrl);
    return originalFetch(targetUrl, init);
  }
  return originalFetch(input, init);
};

const OriginalEventSource = window.EventSource;
window.EventSource = function (url, configuration) {
  if (typeof url === 'string' && url.startsWith('http://localhost:8080')) {
    const targetUrl = apiBaseUrl.endsWith('/api/v1')
      ? url.replace('http://localhost:8080/api/v1', apiBaseUrl)
      : url.replace('http://localhost:8080', apiBaseUrl);
    return new OriginalEventSource(targetUrl, configuration);
  }
  return new OriginalEventSource(url, configuration);
};
window.EventSource.prototype = OriginalEventSource.prototype;

import { useState, useEffect } from 'react';

function AppLauncher() {
  const [msalInstance, setMsalInstance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/v1/auth/config")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch auth config");
        return res.json();
      })
      .then(config => {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const dynamicMsalConfig = {
          auth: {
            clientId: config.clientId,
            authority: isLocal
              ? `https://localhost:4577/${config.tenantId}`
              : `https://login.microsoftonline.com/${config.tenantId}`,
            redirectUri: window.location.origin,
            validateAuthority: !isLocal,
            knownAuthorities: isLocal ? ["localhost"] : []
          },
          cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false,
          }
        };
        const instance = new PublicClientApplication(dynamicMsalConfig);
        setMsalInstance(instance);
      })
      .catch(err => {
        console.error("Auth config init error:", err);
        setError(err);
      });
  }, []);

  if (error) {
    return <div style={{ color: 'red', padding: 20, fontFamily: 'Inter, sans-serif' }}>Failed to load security configurations. Please refresh the page.</div>;
  }

  if (!msalInstance) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', color: '#6366f1' }}>Initializing secure authentication...</div>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppLauncher />
  </StrictMode>,
)
