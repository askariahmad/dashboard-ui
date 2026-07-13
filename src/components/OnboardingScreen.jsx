import React, { useState, useEffect } from 'react';

const OnboardingScreen = ({ jwtToken, onComplete }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    splunkUrl: '', splunkToken: '', scanIntervalValue: 5, scanIntervalUnit: 'MINUTES', matchThreshold: 0.85,
    jiraUrl: '', jiraToken: '', jiraProjectKey: 'DEF',
    githubToken: '', githubRepositories: [],
    llmConfigs: []
  });
  const [githubRepoInput, setGithubRepoInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForceProceed, setShowForceProceed] = useState(false);

  // New LLM Config State for step 4
  const [llmProvider, setLlmProvider] = useState('OPENAI');
  const [llmModelName, setLlmModelName] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');

  const [availableGithubRepos, setAvailableGithubRepos] = useState([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    // Hide force proceed when step changes
    setShowForceProceed(false);
    setError(null);
  }, [step]);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
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
      setError("Please enter a Personal Access Token first.");
      return;
    }
    setFetchingRepos(true);
    setError(null);
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: { 'Authorization': `Bearer ${config.githubToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableGithubRepos(data.map(r => r.full_name));
      } else {
        setError("Failed to fetch repositories. Invalid token?");
      }
    } catch (err) {
      setError("Network error fetching repositories.");
    } finally {
      setFetchingRepos(false);
    }
  };

  const verifyConnection = async (provider) => {
    setLoading(true);
    setError(null);
    setShowForceProceed(false);

    // Timeout mechanism to show force proceed if it takes too long
    const timeoutId = setTimeout(() => {
      setShowForceProceed(true);
    }, 5000); // 5 seconds

    try {
      // Build a temporary config object for the test endpoint
      let testConfig = { ...config };
      if (provider === 'llm') {
        testConfig.llmConfigs = [{
          id: crypto.randomUUID(), provider: llmProvider, modelName: llmModelName,
          baseUrl: llmBaseUrl, apiKey: llmApiKey, isActive: true
        }];
      }

      const res = await fetch(`http://localhost:8080/api/v1/config/test-connection/${provider}?mock=false`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        // Verification succeeded
        if (provider === 'llm') {
          // Save the LLM config if verified
          setConfig({ ...config, llmConfigs: testConfig.llmConfigs });
        }
        proceedToNext();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Failed to verify ${provider} connection.`);
        setShowForceProceed(true);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      setError(`Network error verifying ${provider}.`);
      setShowForceProceed(true);
    } finally {
      setLoading(false);
    }
  };

  const proceedToNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      saveConfigAndComplete();
    }
  };

  const saveConfigAndComplete = async () => {
    setLoading(true);
    try {
      let finalConfig = { ...config };
      // If at step 4 and proceeding anyway without verification, inject the LLM config if fields are filled
      if (step === 4 && finalConfig.llmConfigs.length === 0 && llmApiKey) {
        finalConfig.llmConfigs = [{
          id: crypto.randomUUID(), provider: llmProvider, modelName: llmModelName,
          baseUrl: llmBaseUrl, apiKey: llmApiKey, isActive: true
        }];
      }

      const res = await fetch('http://localhost:8080/api/v1/config', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(finalConfig)
      });
      if (res.ok) {
        // Flag in localStorage if they forced proceed on any step so Dashboard can show banner
        if (showForceProceed || error) {
          localStorage.setItem('unverified_connections', 'true');
        } else {
          localStorage.removeItem('unverified_connections');
        }
        onComplete();
      } else {
        setError('Failed to save configuration.');
      }
    } catch (err) {
      setError('Network error saving configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', color: 'var(--text-main)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '750px', padding: '2.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        
        {/* Progress Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>Workspace Setup</h2>
          <p style={{ color: 'var(--text-muted)' }}>Step {step} of 4</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{ flex: 1, height: '6px', borderRadius: '3px', background: s <= step ? 'var(--primary-color)' : 'var(--surface-border)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

        {/* Step 1: Splunk */}
        {step === 1 && (
          <div>
            <h3>Splunk Integration</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Connect your Splunk instance for log aggregation.</p>
            <div className="form-group">
              <label>Splunk API URL</label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Provide the URL to your Splunk Enterprise or Cloud instance. The token must be generated by an admin under <strong>Settings &rarr; Tokens</strong>.
              </div>
              <input className="input-field" type="text" name="splunkUrl" placeholder="https://splunk:8089" value={config.splunkUrl} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Splunk Token</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showToken ? "text" : "password"} name="splunkToken" placeholder="eyJ..." value={config.splunkToken} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showToken ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Jira */}
        {step === 2 && (
          <div>
            <h3>Jira Integration</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Connect Atlassian for automated ticket creation.</p>
            <div className="form-group">
              <label>Jira API URL</label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Create an API Token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>id.atlassian.com</a>. The Project Key is the short prefix used in your tickets (e.g., PROJ).
              </div>
              <input className="input-field" type="text" name="jiraUrl" placeholder="https://your-domain.atlassian.net" value={config.jiraUrl} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Jira API Token</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showToken ? "text" : "password"} name="jiraToken" placeholder="ATATT3..." value={config.jiraToken} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showToken ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Project Key</label>
              <input className="input-field" type="text" name="jiraProjectKey" placeholder="DEF" value={config.jiraProjectKey} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* Step 3: GitHub (Optional) */}
        {step === 3 && (
          <div>
            <h3>GitHub Integration <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '0.5rem' }}>(Optional)</span></h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Connect GitHub to scan repositories.</p>
            <div className="form-group">
              <label>Personal Access Token</label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Go to GitHub &rarr; Developer Settings &rarr; Personal access tokens (classic). Requires <code style={{background:'var(--surface)', padding:'2px 4px', borderRadius:'4px'}}>repo</code> and <code style={{background:'var(--surface)', padding:'2px 4px', borderRadius:'4px'}}>read:user</code> scopes.
              </div>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showToken ? "text" : "password"} name="githubToken" placeholder="ghp_..." value={config.githubToken} onChange={handleChange} autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showToken ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Tracked Repositories</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input className="input-field" type="text" value={githubRepoInput} onChange={e => setGithubRepoInput(e.target.value)} placeholder="Type owner/repo" onKeyDown={e => e.key === 'Enter' && handleAddRepo()} />
                <button className="btn btn-secondary" onClick={() => handleAddRepo()}>Add</button>
                <button className="btn btn-secondary" onClick={fetchGithubRepos} disabled={fetchingRepos || !config.githubToken}>
                  {fetchingRepos ? 'Fetching...' : 'Fetch My Repos'}
                </button>
              </div>
              
              {availableGithubRepos.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface-border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select to track:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableGithubRepos.filter(r => !config.githubRepositories.includes(r)).map(repo => (
                      <span key={repo} onClick={() => handleAddRepo(repo)} style={{ background: 'var(--surface)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>
                        + {repo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {config.githubRepositories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {config.githubRepositories.map(repo => (
                    <span key={repo} style={{ background: 'var(--surface-border)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {repo}
                      <span onClick={() => handleRemoveRepo(repo)} style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 'bold' }}>&times;</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: AI Models */}
        {step === 4 && (
          <div>
            <h3>AI Model Configuration</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select an LLM for log analysis.</p>
            <div className="form-group">
              <label>Provider</label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {llmProvider === 'OPENAI' && <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>platform.openai.com</a>. Standard format is sk-...</>}
                {llmProvider === 'GEMINI' && <>Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>Google AI Studio</a>.</>}
                {llmProvider === 'CLAUDE' && <>Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>console.anthropic.com</a>.</>}
                {llmProvider === 'MISTRAL' && <>Get your API key from <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)'}}>console.mistral.ai</a>.</>}
                {llmProvider === 'OLLAMA' && <>No API key required. Ensure your Ollama server is running locally.</>}
              </div>
              <select className="input-field" value={llmProvider} onChange={e => setLlmProvider(e.target.value)}>
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="CLAUDE">Anthropic Claude</option>
                <option value="MISTRAL">Mistral AI</option>
                <option value="OLLAMA">Ollama (Local)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model Name</label>
              <input className="input-field" type="text" value={llmModelName} onChange={e => setLlmModelName(e.target.value)} placeholder="e.g. gpt-4o or gemini-1.5-pro" />
            </div>
            <div className="form-group">
              <label>Base URL (Optional)</label>
              <input className="input-field" type="text" value={llmBaseUrl} onChange={e => setLlmBaseUrl(e.target.value)} placeholder="Default Endpoint" />
            </div>
            <div className="form-group">
              <label>API Key</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showToken ? "text" : "password"} value={llmApiKey} onChange={e => setLlmApiKey(e.target.value)} placeholder="****************" autoComplete="new-password" spellCheck="false" style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showToken ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setStep(step - 1)} 
            disabled={step === 1 || loading}
          >
            Back
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {showForceProceed && (
              <button 
                className="btn btn-secondary" 
                onClick={proceedToNext}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                {step === 4 ? 'Save Anyway' : 'Skip Verification'}
              </button>
            )}
            <button 
              className="btn" 
              onClick={() => {
                const providers = { 1: 'splunk', 2: 'jira', 3: 'github', 4: 'llm' };
                // If it's GitHub and they didn't provide a token, skip verification (Optional)
                if (step === 3 && !config.githubToken) {
                  proceedToNext();
                } else {
                  verifyConnection(providers[step]);
                }
              }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : step === 4 ? 'Verify & Complete' : 'Verify & Next'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingScreen;
