import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import IssueList from './IssueList';

// Mock data generator for vulnerabilities
const generateMockIssues = (repoName) => {
  return [
    {
      id: 1,
      severity: 'CRITICAL',
      title: 'Hardcoded AWS Access Key',
      file: 'src/config/aws.js',
      line: 12,
      snippet: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
      reason: 'Hardcoded credentials can be easily extracted by attackers from source code or compiled binaries, leading to unauthorized access to your cloud infrastructure.',
      fix: 'Remove the hardcoded secret. Use environment variables (e.g. process.env.AWS_ACCESS_KEY_ID) or a secrets manager like AWS Secrets Manager or HashiCorp Vault.'
    },
    {
      id: 2,
      severity: 'HIGH',
      title: 'Outdated Log4j Dependency (CVE-2021-44228)',
      file: 'pom.xml',
      line: 45,
      snippet: '<version>2.14.1</version>',
      reason: 'This version of Log4j is vulnerable to Remote Code Execution (RCE) via JNDI injection (Log4Shell).',
      fix: 'Upgrade log4j-core and log4j-api to version 2.17.1 or higher.'
    },
    {
      id: 3,
      severity: 'MEDIUM',
      title: 'Insecure Direct Object Reference (IDOR) Potential',
      file: 'src/controllers/UserController.java',
      line: 88,
      snippet: 'User user = userRepository.findById(request.getParameter("id"));',
      reason: 'Directly fetching user data using user-supplied IDs without checking authorization can allow users to view other users\' data.',
      fix: 'Implement authorization checks to ensure the currently authenticated user has permission to access the requested ID.'
    }
  ];
};

const RepositoriesDashboard = ({ jwtToken }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeView, setActiveViewState] = useState(sessionStorage.getItem('repo_activeView') || 'list');
  const [selectedRepo, setSelectedRepoState] = useState(sessionStorage.getItem('repo_selected') || null);
  const setActiveView = (v) => { setActiveViewState(v); sessionStorage.setItem('repo_activeView', v); };
  const setSelectedRepo = (r) => { setSelectedRepoState(r); if (r) sessionStorage.setItem('repo_selected', r); else sessionStorage.removeItem('repo_selected'); };
  const [repoSearch, setRepoSearchState] = useState(sessionStorage.getItem('repoSearch') || '');
  const [issueSearch, setIssueSearchState] = useState(sessionStorage.getItem('repo_issueSearch') || '');
  const setRepoSearch = (v) => { setRepoSearchState(v); sessionStorage.setItem('repoSearch', v); };
  const setIssueSearch = (v) => { setIssueSearchState(v); sessionStorage.setItem('repo_issueSearch', v); };
  const [scanningRepos, setScanningRepos] = useState({}); // { repoName: boolean }
  const [issuesCache, setIssuesCache] = useState({}); // { repoName: issueArray }

  const [selectedIssue, setSelectedIssue] = useState(null); // For side panel
  
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [availableGithubRepos, setAvailableGithubRepos] = useState([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [prCreatingIssueId, setPrCreatingIssueId] = useState(null);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  // Auto-load issues for the restored selected repo on mount
  useEffect(() => {
    if (selectedRepo && activeView === 'details' && !issuesCache[selectedRepo]) {
      fetchIssuesForRepo(selectedRepo);
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/config', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesForRepo = async (repoName) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/incidents/repo?repository=${encodeURIComponent(repoName)}`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const issues = await res.json();
        setIssuesCache(prev => ({ ...prev, [repoName]: issues }));
      }
    } catch (e) {
      console.error('Error fetching repo issues', e);
    }
  };

  const handleScan = async (repoName) => {
    setScanningRepos(prev => ({ ...prev, [repoName]: true }));
    try {
      await fetch(`http://localhost:8080/api/v1/scanner/scan?repo=${encodeURIComponent(repoName)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      // The backend is async, we simulate the wait then fetch
      setTimeout(() => {
        setScanningRepos(prev => ({ ...prev, [repoName]: false }));
        fetchIssuesForRepo(repoName);
      }, 5000);
    } catch (e) {
      console.error(e);
      setScanningRepos(prev => ({ ...prev, [repoName]: false }));
    }
  };

  const handleScanAll = () => {
    if (config?.githubRepositories) {
      config.githubRepositories.forEach(repo => handleScan(repo));
    }
  };

  const fetchGithubRepos = async () => {
    if (!config?.githubToken) {
      toast.error("Please configure your GitHub token in Settings first.");
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

  const handleAddRepository = () => {
    setShowAddRepoModal(true);
    setSelectedRepos([]);
    setRepoSearchQuery('');
    if (availableGithubRepos.length === 0) {
      fetchGithubRepos();
    }
  };

  const toggleRepoSelection = (repo) => {
    if (selectedRepos.includes(repo)) {
      setSelectedRepos(prev => prev.filter(r => r !== repo));
    } else {
      setSelectedRepos(prev => [...prev, repo]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredRepos = availableGithubRepos
      .filter(r => !config.githubRepositories.includes(r))
      .filter(r => r.toLowerCase().includes(repoSearchQuery.toLowerCase()));
      
    const allSelected = filteredRepos.every(r => selectedRepos.includes(r));
    if (allSelected) {
      setSelectedRepos(prev => prev.filter(r => !filteredRepos.includes(r)));
    } else {
      const toAdd = filteredRepos.filter(r => !selectedRepos.includes(r));
      setSelectedRepos(prev => [...prev, ...toAdd]);
    }
  };

  const submitSelectedRepositories = async () => {
    const reposToAdd = [];
    
    selectedRepos.forEach(r => {
      if (!config.githubRepositories.includes(r) && !reposToAdd.includes(r)) {
        reposToAdd.push(r);
      }
    });

    if (reposToAdd.length === 0) {
      toast.error("Please select at least one new repository.");
      return;
    }
      
      const newConfig = {
        ...config,
        githubRepositories: [...config.githubRepositories, ...reposToAdd]
      };
      
      try {
        const response = await fetch('http://localhost:8080/api/v1/config', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newConfig)
        });
        
        if (response.ok) {
          setConfig(newConfig);
          toast.success("Repositories added successfully!");
          setShowAddRepoModal(false);
          setSelectedRepos([]);
        } else {
          toast.error("Failed to add repositories.");
        }
      } catch (err) {
        console.error("Error adding repositories", err);
        toast.error("Error adding repositories: " + err.message);
      }
  };

  const viewRepoDetails = (repoName) => {
    setSelectedRepo(repoName);
    setActiveView('details');
    // Always fetch latest issues from backend when opening a repo
    fetchIssuesForRepo(repoName);
  };

  const handleSeverityChange = async (issueId, newSeverity) => {
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/severity`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ severity: newSeverity })
      });
      // Refresh local state for this repo
      if (selectedRepo) fetchIssuesForRepo(selectedRepo);
    } catch (e) {
      console.error('Error updating severity', e);
    }
  };
  
  const handleCreatePR = async (e, issue) => {
    e.stopPropagation();
    setPrCreatingIssueId(issue.id);
    toast.loading("Creating Pull Request...", { id: 'pr-toast' });
    try {
      const response = await fetch('http://localhost:8080/api/v1/scanner/autofix', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository: issue.repository || selectedRepo,
          filePath: issue.filePath,
          exactCodeFix: issue.exactCodeFix,
          issueTitle: issue.title
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(
          <div>
            PR Created! <a href={data.prUrl} target="_blank" rel="noreferrer" style={{color: 'white', textDecoration: 'underline'}}>View PR</a>
          </div>,
          { id: 'pr-toast', duration: 10000 }
        );
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create PR: ${errorData.error || 'Unknown error'}`, { id: 'pr-toast' });
      }
    } catch (err) {
      console.error('Error creating PR', err);
      toast.error('Error creating PR: ' + err.message, { id: 'pr-toast' });
    } finally {
      setPrCreatingIssueId(null);
    }
  };

  const handleJiraCreate = async (issueId) => {
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      // Refresh repo issues to get updated Jira key
      setTimeout(() => {
        if (selectedRepo) fetchIssuesForRepo(selectedRepo);
      }, 1000);
    } catch (e) {
      console.error('Error creating Jira ticket', e);
    }
  };

  const handleJiraSync = async (issueId) => {
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      setTimeout(() => {
        if (selectedRepo) fetchIssuesForRepo(selectedRepo);
      }, 1000);
    } catch (e) {
      console.error('Error syncing Jira ticket', e);
    }
  };

  const handleTransition = async (issueId, transitionId, transitionName) => {
    if (!transitionId || !issueId) return;
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira/transitions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transitionId, transitionName })
      });
      handleJiraSync(issueId);
    } catch (e) {
      console.error('Error transitioning issue', e);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading repositories...</div>;
  }

  const repos = (config?.githubRepositories || []).filter(r => r.toLowerCase().includes(repoSearch.toLowerCase()));

  if (activeView === 'details' && selectedRepo) {
    const rawIssues = issuesCache[selectedRepo] || [];
    const issues = rawIssues.filter(i => 
      i.title.toLowerCase().includes(issueSearch.toLowerCase()) || 
      (i.id && i.id.toLowerCase().includes(issueSearch.toLowerCase())) ||
      (i.file && i.file.toLowerCase().includes(issueSearch.toLowerCase()))
    );
    const isScanning = scanningRepos[selectedRepo];

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="page-header" style={{ cursor: 'pointer', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-border)', marginBottom: '1rem' }} onClick={() => { setActiveView('list'); setSelectedIssue(null); }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back to Repositories
            </div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              {selectedRepo}
            </h2>
            <p style={{ marginTop: '0.25rem' }}>Vulnerability scan results and detailed findings.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn" onClick={(e) => { e.stopPropagation(); handleScan(selectedRepo); }} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Run Scan Again'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
          <div className={isScanning || issues.length === 0 ? "card" : ""} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, transition: 'flex 0.3s' }}>
            {isScanning ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <h3 style={{ marginTop: '1rem' }}>Scanning {selectedRepo}...</h3>
              <p>Analyzing code with LLM and regex patterns.</p>
            </div>
          ) : issues.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>No Issues Found</h3>
              <p>This repository looks clean, or hasn't been scanned yet.</p>
              {!issuesCache[selectedRepo] && (
                <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => handleScan(selectedRepo)}>Scan Now</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingBottom: '1rem', overflow: 'hidden' }}>
              <IssueList 
                issues={rawIssues}
                jwtToken={jwtToken}
                showFilters={true}
                onJiraSync={handleJiraSync}
                onJiraCreate={handleJiraCreate}
                onUpdateSeverity={handleSeverityChange}
                onTransition={handleTransition}
                onCreatePR={handleCreatePR}
                prCreatingIssueId={prCreatingIssueId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Connected Repositories</h2>
          <p>Manage source code repositories for AI scanning and vulnerability detection.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search repositories..." 
            className="input-field" 
            value={repoSearch} 
            onChange={(e) => setRepoSearch(e.target.value)} 
            style={{ width: '250px', padding: '0.5rem 1rem' }} 
          />
          <button className="btn btn-secondary" onClick={handleScanAll} disabled={repos.length === 0}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Scan All
          </button>
          <button className="btn" onClick={handleAddRepository}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Repository
          </button>
        </div>
      </div>

      {repos.length === 0 ? (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <h3 style={{ marginBottom: '0.5rem' }}>No Repositories Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>No connected repositories match your search.</p>
        </div>
      ) : (
        <div className="hide-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {repos.map(repo => {
            const issues = issuesCache[repo];
            const isScanning = scanningRepos[repo];
            
            return (
              <div 
                key={repo} 
                className="saas-card" 
                style={{ padding: '1rem', marginBottom: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                onClick={() => viewRepoDetails(repo)}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="saas-badge" style={{ color: 'var(--text-muted)', border: '1px solid var(--surface-border)', background: 'transparent' }}>
                      Repository
                    </span>
                    {isScanning ? (
                      <span className="saas-badge" style={{ background: '#ebf4ff', color: '#2b6cb0', border: '1px solid #90cdf4' }}>Scanning...</span>
                    ) : issues ? (
                      <span className="saas-badge" style={{ background: issues.length > 0 ? '#fff5f5' : '#f0fdf4', color: issues.length > 0 ? '#c53030' : '#166534', border: '1px solid ' + (issues.length > 0 ? '#feb2b2' : '#bbf7d0') }}>
                        {issues.length} Issues Found
                      </span>
                    ) : (
                      <span className="saas-badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>Not Scanned</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', fontSize: '1rem', color: 'var(--text-main)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    {repo}
                  </div>
                </div>
                <div>
                  <button className="btn" onClick={(e) => { e.stopPropagation(); handleScan(repo); }} disabled={isScanning} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    {isScanning ? 'Scanning...' : 'Scan Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddRepoModal && (
        <div className="modal-overlay" onClick={() => setShowAddRepoModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: '2rem', borderRadius: '12px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Track New Repositories
                </h3>
                <button onClick={() => setShowAddRepoModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Select from your connected GitHub account.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Search repositories..." 
                    value={repoSearchQuery}
                    onChange={e => setRepoSearchQuery(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', background: 'var(--bg-color)', border: '1px solid var(--surface-border)' }}
                    autoFocus
                  />
                </div>
                <button className="btn btn-secondary" onClick={handleSelectAllFiltered} title="Select all filtered">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                </button>
                <button className="btn btn-secondary" onClick={fetchGithubRepos} disabled={fetchingRepos || !config?.githubToken} title="Refresh">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={fetchingRepos ? 'spinning' : ''}><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              </div>
              
              <div style={{ height: '320px', overflowY: 'auto', border: '1px solid var(--surface-border)', borderRadius: '8px', background: 'var(--bg-color)' }}>
                {!config?.githubToken ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                    <p style={{ margin: 0 }}>GitHub token is missing.</p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Configure it in Settings to browse repositories.</p>
                  </div>
                ) : availableGithubRepos.length === 0 && !fetchingRepos ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No repositories found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {availableGithubRepos
                      .filter(r => !config.githubRepositories.includes(r))
                      .filter(r => r.toLowerCase().includes(repoSearchQuery.toLowerCase()))
                      .map((repo, idx, arr) => (
                      <div 
                        key={repo} 
                        onClick={() => toggleRepoSelection(repo)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0.85rem 1rem', 
                          cursor: 'pointer', 
                          borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--surface-border)',
                          background: selectedRepos.includes(repo) ? 'rgba(56, 152, 236, 0.08)' : 'transparent', 
                          transition: 'background-color 0.15s' 
                        }}
                        onMouseEnter={e => { if (!selectedRepos.includes(repo)) e.currentTarget.style.background = 'var(--table-hover-bg)' }}
                        onMouseLeave={e => { if (!selectedRepos.includes(repo)) e.currentTarget.style.background = 'transparent' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginRight: '0.75rem' }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: selectedRepos.includes(repo) ? '500' : '400', color: selectedRepos.includes(repo) ? 'var(--primary-color)' : 'var(--text-main)' }}>
                          {repo}
                        </span>
                        {selectedRepos.includes(repo) && (
                          <svg style={{ marginLeft: 'auto', color: 'var(--primary-color)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddRepoModal(false)} style={{ padding: '0.6rem 1.2rem' }}>Cancel</button>
              <button className="btn" onClick={submitSelectedRepositories} style={{ padding: '0.6rem 1.2rem' }} disabled={selectedRepos.length === 0}>
                Add Selected {selectedRepos.length > 0 ? `(${selectedRepos.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoriesDashboard;
