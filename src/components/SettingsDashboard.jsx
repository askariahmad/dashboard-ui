import React, { useState, useEffect } from 'react';

const defaultConfig = {
  splunkUrl: 'https://splunk-instance:8089',
  splunkToken: '************************',
  jiraUrl: 'https://your-domain.atlassian.net',
  jiraToken: '************************',
  llmConfigs: [],
  matchThreshold: 0.85,
  scanIntervalValue: 5,
  scanIntervalUnit: 'MINUTES'
};

const SettingsDashboard = ({ jwtToken, hideHeader = false }) => {
  const [config, setConfig] = useState(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState(defaultConfig);
  const [llmModalState, setLlmModalState] = useState({ isOpen: false, config: null, index: -1 });

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
          jiraToken: data.jiraToken || '',
          llmConfigs: data.llmConfigs || [],
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

  const openLlmModalForAdd = () => {
    setLlmModalState({
      isOpen: true,
      config: { id: crypto.randomUUID(), provider: 'OPENAI', modelName: '', baseUrl: '', apiKey: '', isActive: config.llmConfigs.length === 0 },
      index: -1
    });
  };

  const openLlmModalForEdit = (llm, index) => {
    setLlmModalState({
      isOpen: true,
      config: { ...llm },
      index
    });
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
    setConfig({ ...config, llmConfigs: newLlmConfigs });
    setLlmModalState({ isOpen: false, config: null, index: -1 });
  };

  const handleRemoveLlmConfig = (id) => {
    setConfig({ ...config, llmConfigs: config.llmConfigs.filter(c => c.id !== id) });
  };

  const handleSetActiveLlm = (id) => {
    const updated = config.llmConfigs.map(c => ({
      ...c,
      isActive: c.id === id
    }));
    setConfig({ ...config, llmConfigs: updated });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!jwtToken) {
      alert("Error: You are not logged in (jwtToken missing).");
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
        alert("System Settings Saved Successfully!");
      } else {
        const errorText = await response.text();
        alert(`Failed to save settings. Status: ${response.status}\nDetails: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving settings: " + err.message);
    }
  };

  const handleCancel = () => {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  };

  const isDirty = originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!hideHeader && (
        <div className="page-header">
          <div>
            <h2>System Settings</h2>
            <p>Configure external integrations and LLM analyzer properties.</p>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Splunk Integration Card */}
          <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3>Splunk Integration</h3>
            <p>Configure your Splunk endpoint for log aggregation.</p>
          </div>
          <div className="card-body" style={{ flex: 1 }}>
            <div className="form-group">
              <label>Splunk API URL</label>
              <input className="input-field" type="text" name="splunkUrl" value={config.splunkUrl} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Splunk Token</label>
              <input className="input-field" type="password" name="splunkToken" value={config.splunkToken} onChange={handleChange} />
            </div>
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
          </div>
          <div className="card-footer">
            <div className="card-footer-text">Data is collected automatically based on the interval.</div>
          </div>
        </div>

        {/* Jira Integration Card */}
        <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3>Jira Integration</h3>
            <p>Link your Atlassian account for automated ticket generation.</p>
          </div>
          <div className="card-body" style={{ flex: 1 }}>
            <div className="form-group">
              <label>Jira API URL</label>
              <input className="input-field" type="text" name="jiraUrl" value={config.jiraUrl} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Jira API Token</label>
              <input className="input-field" type="password" name="jiraToken" value={config.jiraToken} onChange={handleChange} />
            </div>
          </div>
          <div className="card-footer">
            <div className="card-footer-text">Tickets will be created in the default project.</div>
          </div>
        </div>
        </div>

        {/* AI Models Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>AI Models (LangChain4j)</h3>
              <p>Configure LLM providers used for analyzing logs.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={openLlmModalForAdd} style={{ padding: '0.4rem', border: 'none', background: 'transparent' }} title="Add Model">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {config.llmConfigs.map((llm, index) => (
                <div key={llm.id} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '1rem', border: '1px solid var(--surface-border)', 
                  borderRadius: '8px', 
                  background: llm.isActive ? 'rgba(0,0,0,0.02)' : 'var(--surface)',
                  transition: 'background 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
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
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Click the + button above to integrate an LLM for log analysis.</p>
                </div>
              )}
            </div>
          </div>
          <div className="card-footer">
            <div className="card-footer-text">Only the selected active model will be used by the analyzer.</div>
          </div>
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
                <input className="input-field" type="password" name="apiKey" placeholder="****************" value={llmModalState.config.apiKey} onChange={handleLlmModalChange} />
              </div>
            </div>
            <div className="card-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setLlmModalState({ isOpen: false, config: null, index: -1 })} title="Cancel" style={{ padding: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <button className="btn" onClick={handleLlmModalSave} title="Save" style={{ padding: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDashboard;
