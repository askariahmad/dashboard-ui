import React, { useState } from 'react';

const ConfigDashboard = () => {
  const [config, setConfig] = useState({
    splunkUrl: '',
    splunkToken: '',
    jiraUrl: '',
    jiraToken: '',
    activeLlmProvider: 'OPENAI',
    llmApiKey: '',
    matchThreshold: 0.85
  });

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Simulate save
    alert("Configuration Saved Successfully!");
  };

  return (
    <div className="glass-card">
      <h2>System Configuration</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Splunk API URL</label>
          <input className="glass-input" type="text" name="splunkUrl" value={config.splunkUrl} onChange={handleChange} placeholder="https://splunk-instance:8089" />
        </div>
        <div className="form-group">
          <label>Splunk Token</label>
          <input className="glass-input" type="password" name="splunkToken" value={config.splunkToken} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Jira API URL</label>
          <input className="glass-input" type="text" name="jiraUrl" value={config.jiraUrl} onChange={handleChange} placeholder="https://your-domain.atlassian.net" />
        </div>
        <div className="form-group">
          <label>LLM Provider</label>
          <select className="glass-input" name="activeLlmProvider" value={config.activeLlmProvider} onChange={handleChange}>
            <option value="OPENAI">OpenAI</option>
            <option value="GEMINI">Google Gemini</option>
            <option value="CLAUDE">Anthropic Claude</option>
          </select>
        </div>
        <div className="form-group">
          <label>LLM API Key</label>
          <input className="glass-input" type="password" name="llmApiKey" value={config.llmApiKey} onChange={handleChange} />
        </div>
        <button type="submit" className="glass-button">Save Configuration</button>
      </form>
    </div>
  );
};

export default ConfigDashboard;
