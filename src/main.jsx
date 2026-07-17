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

const msalInstance = new PublicClientApplication(msalConfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
)
