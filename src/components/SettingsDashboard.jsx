import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const defaultConfig = {
  splunkUrl: 'https://splunk-instance:8089',
  splunkToken: '',
  jiraUrl: 'https://your-domain.atlassian.net',
  jiraEmail: '',
  jiraToken: '',
  jiraProjectKey: '',
  githubToken: '',
  sonarUrl: 'https://sonarcloud.io',
  sonarToken: '',
  githubRepositories: [],
  llmConfigs: [],
  matchThreshold: 0.85,
  scanIntervalValue: 5,
  scanIntervalUnit: 'MINUTES'
};

const SettingsDashboard = ({ jwtToken, hideHeader = false }) => {
  const [config, setConfig] = useState(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState(defaultConfig);
  
  const [activeTab, setActiveTabState] = useState(sessionStorage.getItem('settings_tab') || 'general');
  const setActiveTab = (tab) => { setActiveTabState(tab); sessionStorage.setItem('settings_tab', tab); };
  const [showToken, setShowToken] = useState({ splunk: false, jira: false, github: false, sonar: false, llm: false });
  
  const [llmModalState, setLlmModalState] = useState({ isOpen: false, config: null, index: -1 });
  const [githubRepoInput, setGithubRepoInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableGithubRepos, setAvailableGithubRepos] = useState([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);

  useEffect(() => {
    if (!jwtToken) return;
    fetch('http://localhost:8080/api/v1/config', {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if(data.id) {
        const loadedConfig = {
          splunkUrl: data.splunkUrl || '',
          splunkToken: data.splunkToken || '',
          jiraUrl: data.jiraUrl || '',
          jiraEmail: data.jiraEmail || '',
          jiraToken: data.jiraToken || '',
          jiraProjectKey: data.jiraProjectKey || '',
          githubToken: data.githubToken || '',
          sonarUrl: data.sonarUrl || 'https://sonarcloud.io',
          sonarToken: data.sonarToken || '',
          githubRepositories: data.githubRepositories || [],
          llmConfigs: (data.llmConfigs || []).map(c => ({
            ...c,
            isActive: c.provider === data.activeLlmProvider
          })),
          matchThreshold: data.matchThreshold || 0.85,
          scanIntervalValue: data.scanIntervalValue || 5,
          scanIntervalUnit: data.scanIntervalUnit || 'MINUTES'
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      }
    })
    .catch(console.error);
  }, [jwtToken]);

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setConfig({ ...config, [e.target.name]: value });
  };

  const toggleTokenVisibility = (field) => {
    setShowToken(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddRepo = (repoName) => {
    const repo = repoName || githubRepoInput.trim();
    if (repo && !config.githubRepositories.includes(repo)) {
      setConfig({ ...config, githubRepositories: [...config.githubRepositories, repo] });
      setGithubRepoInput('');
    }
  };

  const handleRemoveRepo = (repo) => {
    setConfig({ ...config, githubRepositories: config.githubRepositories.filter(r => r !== repo) });
  };

  const fetchGithubRepos = async () => {
    if (!config.githubToken) {
      toast.error("Please enter a Personal Access Token first.");
      return;
    }
    setFetchingRepos(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: { 'Authorization': `Bearer ${config.githubToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableGithubRepos(data.map(r => r.full_name));
      } else {
        toast.error("Failed to fetch repositories. Invalid token?");
      }
    } catch (err) {
      toast.error("Network error fetching repositories.");
    } finally {
      setFetchingRepos(false);
    }
  };

  const testConnection = async (provider, customConfig = null) => {    if (!provider) return;
    setTestingConnection(true);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/config/test-connection/${provider}?mock=false`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Network error during connection test");
    } finally {
      setTestingConnection(false);
    }
  };

  const openLlmModalForAdd = () => {
    setLlmModalState({
      isOpen: true,
      config: { id: crypto.randomUUID(), provider: 'OPENAI', modelName: '', baseUrl: '', apiKey: '', isActive: config.llmConfigs.length === 0 },
      index: -1
    });
    setShowToken(prev => ({ ...prev, llm: false }));
  };

  const openLlmModalForEdit = (llm, index) => {
    setLlmModalState({
      isOpen: true,
      config: { ...llm },
      index
    });
    setShowToken(prev => ({ ...prev, llm: false }));
  };

  const handleLlmModalChange = (e) => {
    setLlmModalState(prev => ({
      ...prev,
      config: { ...prev.config, [e.target.name]: e.target.value }
    }));
  };

  const handleLlmModalSave = () => {
    const newLlmConfigs = [...config.llmConfigs];
    if (llmModalState.index === -1) {
      newLlmConfigs.push(llmModalState.config);
    } else {
      newLlmConfigs[llmModalState.index] = llmModalState.config;
    }
    const activeProvider = newLlmConfigs.find(c => c.isActive)?.provider || null;
    setConfig({ ...config, llmConfigs: newLlmConfigs, activeLlmProvider: activeProvider });
    setLlmModalState({ isOpen: false, config: null, index: -1 });
  };

  const handleRemoveLlmConfig = (id) => {
    const updated = config.llmConfigs.filter(c => c.id !== id);
    const activeProvider = updated.find(c => c.isActive)?.provider || null;
    setConfig({ ...config, llmConfigs: updated, activeLlmProvider: activeProvider });
  };

  const handleSetActiveLlm = (id) => {
    const updated = config.llmConfigs.map(c => ({
      ...c,
      isActive: c.id === id
    }));
    const activeProvider = updated.find(c => c.isActive)?.provider || null;
    setConfig({ ...config, llmConfigs: updated, activeLlmProvider: activeProvider });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!jwtToken) {
      toast.error("Error: You are not logged in (jwtToken missing).");
      return;
    }
    try {
      const response = await fetch('http://localhost:8080/api/v1/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setOriginalConfig(config);
        toast.success("System Settings Saved Successfully!");
      } else {
        const errorText = await response.text();
        toast.error(`Failed to save settings. Status: ${response.status}\nDetails: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving settings: " + err.message);
    }
  };

  const handleCancel = () => {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  };

  const isDirty = originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

  const EyeIcon = ({ show }) => show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  );

  const tabStyle = (id) => ({
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    background: activeTab === id ? 'var(--surface)' : 'transparent',
    color: activeTab === id ? 'var(--primary-color)' : 'var(--text-muted)',
    fontWeight: activeTab === id ? 600 : 500,
    border: activeTab === id ? '1px solid var(--surface-border)' : '1px solid transparent',
    boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!hideHeader && (
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h2>System Settings</h2>
            <p>Configure external integrations and LLM analyzer properties.</p>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', gap: '2rem', overflow: 'hidden' }}>
        
        {/* Left Sidebar */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
          <div onClick={() => setActiveTab('general')} style={tabStyle('general')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            General Settings
          </div>
          <div onClick={() => setActiveTab('ticketing')} style={tabStyle('ticketing')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            Ticketing & SIEM
          </div>
          <div onClick={() => setActiveTab('source_code')} style={tabStyle('source_code')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            Source Code
          </div>
          <div onClick={() => setActiveTab('ai_models')} style={tabStyle('ai_models')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            AI Models
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', paddingBottom: '5rem' }}>
          
          {/* GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Analysis Configuration</h3>
                <p>Global settings for the log analyzer and scanner.</p>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>Scan Interval</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input-field" type="number" name="scanIntervalValue" value={config.scanIntervalValue} onChange={handleChange} min="1" style={{ flex: 1 }} />
                    <select className="input-field" name="scanIntervalUnit" value={config.scanIntervalUnit} onChange={handleChange} style={{ flex: 1 }}>
                      <option value="MS">Milliseconds</option>
                      <option value="SECONDS">Seconds</option>
                      <option value="MINUTES">Minutes</option>
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Match Threshold (Confidence)</label>
                  <input className="input-field" type="number" step="0.01" name="matchThreshold" value={config.matchThreshold} onChange={handleChange} min="0" max="1" />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Set the confidence score required (0.0 to 1.0) before an incident is generated.</div>
                </div>
              </div>
            </div>
          )}

          {/* TICKETING & SIEM */}
          {activeTab === 'ticketing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Splunk */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>Splunk Integration</h3>
                    <p>Configure your Splunk endpoint for log aggregation.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => testConnection('splunk')} disabled={testingConnection} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    Test Connection
                  </button>
                </div>
                <div className="card-body" style={{ flex: 1 }}>
                  <div className="form-group">
                    <label>Splunk API URL</label>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                      Provide the URL to your Splunk Enterprise or Cloud instance. To generate a token, an admin must navigate to <strong>Settings &rarr; Tokens</strong>. If you do not see this option, ensure Token Authentication is enabled in <strong>Settings &rarr; Server Settings &rarr; Token Authentication</strong>. The generated token must have permissions to write to your target index.
                    </div>
                    <input className="input-field" type="text" name="splunkUrl" value={config.splunkUrl} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Splunk Token</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input-field" type={showToken.splunk ? "text" : "password"} name="splunkToken" value={config.splunkToken} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => toggleTokenVisibility('splunk')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <EyeIcon show={showToken.splunk} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jira */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>Jira Integration</h3>
                    <p>Link your Atlassian account for automated ticket generation.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => testConnection('jira')} disabled={testingConnection} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    Test Connection
                  </button>
                </div>
                <div className="card-body" style={{ flex: 1 }}>
                  <div className="form-group">
                    <label>Jira API URL</label>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Create an API Token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>id.atlassian.com</a>.
                    </div>
                    <input className="input-field" type="text" name="jiraUrl" value={config.jiraUrl} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Jira Email Address</label>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      The email address associated with your Jira Cloud account.
                    </div>
                    <input className="input-field" type="email" name="jiraEmail" value={config.jiraEmail || ''} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Jira API Token</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input-field" type={showToken.jira ? "text" : "password"} name="jiraToken" value={config.jiraToken} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => toggleTokenVisibility('jira')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <EyeIcon show={showToken.jira} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Jira Project Key</label>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      The key of the Jira project where tickets should be created (e.g., DEV, PROJ).
                    </div>
                    <input className="input-field" type="text" name="jiraProjectKey" value={config.jiraProjectKey || ''} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOURCE CODE */}
          {activeTab === 'source_code' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div className="card-header">
                <h3>Source Code & Analysis</h3>
                <p>Connect GitHub and SonarCloud to automatically detect vulnerabilities in your repositories.</p>
              </div>
              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* SonarCloud Integration */}
                <div style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                      SonarCloud Integration
                    </div>
                    <button className="btn btn-secondary" onClick={() => testConnection('sonar')} disabled={testingConnection || !config.sonarUrl || !config.sonarToken} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                      Test Connection
                    </button>
                  </h4>
                  <div className="form-group">
                    <label>SonarCloud URL</label>
                    <input className="input-field" type="url" name="sonarUrl" value={config.sonarUrl || ''} onChange={handleChange} placeholder="https://sonarcloud.io" />
                  </div>
                  <div className="form-group">
                    <label>Access Token</label>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <input className="input-field" type={showToken.sonar ? "text" : "password"} name="sonarToken" value={config.sonarToken || ''} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => toggleTokenVisibility('sonar')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <EyeIcon show={showToken.sonar} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* GitHub Integration */}
                <div>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                      GitHub Integration
                    </div>
                    <button className="btn btn-secondary" onClick={() => testConnection('github')} disabled={testingConnection} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                      Test Connection
                    </button>
                  </h4>
                  <div className="form-group">
                    <label>Personal Access Token</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                    Go to GitHub &rarr; Developer Settings &rarr; Personal access tokens (classic). Requires <code style={{background:'var(--surface-border)', padding:'2px 6px', borderRadius:'4px', color:'var(--text-main)'}}>repo</code> and <code style={{background:'var(--surface-border)', padding:'2px 6px', borderRadius:'4px', color:'var(--text-main)'}}>read:user</code> scopes.
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="input-field" type={showToken.github ? "text" : "password"} name="githubToken" value={config.githubToken || ''} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                    <button type="button" onClick={() => toggleTokenVisibility('github')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <EyeIcon show={showToken.github} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Tracked Repositories</label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Add repositories you want DevOps Pro to scan continuously.</p>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input className="input-field" type="text" value={githubRepoInput} onChange={e => setGithubRepoInput(e.target.value)} placeholder="e.g., owner/repo-name" onKeyDown={e => e.key === 'Enter' && handleAddRepo()} />
                    </div>
                    <button className="btn" onClick={() => handleAddRepo()}>Add Repo</button>
                    <button className="btn btn-secondary" onClick={fetchGithubRepos} disabled={fetchingRepos || !config.githubToken}>
                      {fetchingRepos ? 'Fetching...' : 'Fetch My Repos'}
                    </button>
                  </div>
                  
                  {availableGithubRepos.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available to Track</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {availableGithubRepos.filter(r => !config.githubRepositories.includes(r)).map(repo => (
                          <span key={repo} className="repo-pill" onClick={() => handleAddRepo(repo)} style={{ cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            {repo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currently Tracking</div>
                    {config.githubRepositories.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {config.githubRepositories.map(repo => (
                          <span key={repo} className="repo-pill" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', paddingRight: '0.5rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                            {repo}
                            <span onClick={() => handleRemoveRepo(repo)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginLeft: '4px' }}>&times;</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--surface-border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        No repositories tracked yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* AI MODELS */}
          {activeTab === 'ai_models' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>AI Models Configured</h3>
                  <p>Register multiple models and select the active one.</p>
                </div>
                <button className="btn btn-secondary" onClick={openLlmModalForAdd} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add Model
                </button>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {config.llmConfigs.map((llm, index) => (
                    <div key={llm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid', borderColor: llm.isActive ? 'var(--primary-color)' : 'var(--surface-border)', borderRadius: '8px', background: llm.isActive ? 'var(--table-selected-bg)' : 'transparent', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input 
                            type="radio" 
                            name="activeLlm" 
                            checked={llm.isActive} 
                            onChange={() => handleSetActiveLlm(llm.id)}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {llm.provider} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/</span> {llm.modelName || 'Default Model'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span>{llm.baseUrl ? llm.baseUrl : 'Default Endpoint'}</span>
                            <span>•</span>
                            <span>API Key: {llm.apiKey ? '••••••••••••••••' : 'None provided'}</span>
                            {llm.isActive && (
                              <>
                                <span>•</span>
                                <span style={{ color: 'var(--success)', fontWeight: 500 }}>Active</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button type="button" onClick={() => openLlmModalForEdit(llm, index)} className="btn btn-secondary" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }} title="Edit Model">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" onClick={() => handleRemoveLlmConfig(llm.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--danger)', border: 'none', background: 'transparent' }} title="Remove Model">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {config.llmConfigs.length === 0 && (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: '8px', background: 'var(--bg-color)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                      </svg>
                      <p style={{ margin: 0 }}>No AI Models configured.</p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Click the Add Model button to integrate an LLM for log analysis.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isDirty && (
        <div className="save-bar">
          <span>You have unsaved changes.</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleCancel} title="Cancel" style={{ padding: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button className="btn" onClick={handleSave} title="Save Changes" style={{ padding: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </button>
          </div>
        </div>
      )}

      {llmModalState.isOpen && (
        <div className="modal-overlay" onClick={() => setLlmModalState({ isOpen: false, config: null, index: -1 })}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ margin: 0, padding: 0 }}>
            <div className="card-header">
              <h3>{llmModalState.index === -1 ? 'Add AI Model' : 'Edit AI Model'}</h3>
              <p>Configure provider details.</p>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Provider</label>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {llmModalState.config.provider === 'OPENAI' && <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>platform.openai.com</a>. Standard format is sk-...</>}
                  {llmModalState.config.provider === 'GEMINI' && <>Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>Google AI Studio</a>.</>}
                  {llmModalState.config.provider === 'CLAUDE' && <>Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>console.anthropic.com</a>.</>}
                  {llmModalState.config.provider === 'MISTRAL' && <>Get your API key from <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>console.mistral.ai</a>.</>}
                  {llmModalState.config.provider === 'HUGGINGFACE' && <>Get your API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>huggingface.co/settings/tokens</a>.</>}
                  {llmModalState.config.provider === 'OLLAMA' && <>No API key required. Ensure your Ollama server is running locally.</>}
                  {['COHERE', 'OPENROUTER', 'AZURE_OPENAI', 'AWS_BEDROCK'].includes(llmModalState.config.provider) && <>Refer to the official provider documentation to generate an API key or access token.</>}
                </div>
                <select className="input-field" name="provider" value={llmModalState.config.provider} onChange={handleLlmModalChange}>
                  <option value="OPENAI">OpenAI</option>
                  <option value="GEMINI">Google Gemini</option>
                  <option value="CLAUDE">Anthropic Claude</option>
                  <option value="MISTRAL">Mistral AI</option>
                  <option value="COHERE">Cohere</option>
                  <option value="HUGGINGFACE">Hugging Face</option>
                  <option value="OPENROUTER">OpenRouter</option>
                  <option value="AZURE_OPENAI">Azure OpenAI</option>
                  <option value="AWS_BEDROCK">AWS Bedrock</option>
                  <option value="OLLAMA">Ollama (Local)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Model Name</label>
                <input className="input-field" type="text" name="modelName" placeholder="e.g. gpt-4o" value={llmModalState.config.modelName} onChange={handleLlmModalChange} />
              </div>
              <div className="form-group">
                <label>Base URL (Optional)</label>
                <input className="input-field" type="text" name="baseUrl" placeholder="https://..." value={llmModalState.config.baseUrl || ''} onChange={handleLlmModalChange} />
              </div>
              <div className="form-group">
                <label>API Key</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showToken.llm ? "text" : "password"} name="apiKey" placeholder="****************" value={llmModalState.config.apiKey} onChange={handleLlmModalChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => toggleTokenVisibility('llm')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <EyeIcon show={showToken.llm} />
                  </button>
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ justifyContent: 'space-between', gap: '0.75rem', display: 'flex' }}>
              <button 
                className="btn btn-secondary" 
                disabled={testingConnection}
                onClick={() => testConnection('llm', { ...config, llmConfigs: [llmModalState.config] })}
                title="Test Connection with this Model" 
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                {testingConnection ? 'Testing...' : 'Test Model'}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setLlmModalState({ isOpen: false, config: null, index: -1 })}>Cancel</button>
                <button className="btn" onClick={handleLlmModalSave}>Save Model</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDashboard;
