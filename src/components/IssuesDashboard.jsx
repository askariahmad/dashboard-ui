import React, { useState, useEffect } from 'react';
import IssueList from './IssueList';

const IssuesDashboard = ({ jwtToken }) => {
  const [incidents, setIncidents] = useState([]);
  // Global Add Comment logic
  useEffect(() => {
    window.onAddCommentCallback = async (issueId, text) => {
      try {
        await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira/comments`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body: text })
        });
        handleJiraSync(issueId);
      } catch (e) {
        console.error('Error adding comment', e);
      }
    };
    return () => {
      delete window.onAddCommentCallback;
    };
  }, [jwtToken]);

  useEffect(() => {
    if (!jwtToken) return;
    fetch('http://localhost:8080/api/v1/incidents', {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    })
    .catch(err => {
      console.error('Failed to fetch incidents:', err);
    });
  }, [jwtToken]);

  const fetchIncidents = () => {
    fetch('http://localhost:8080/api/v1/incidents', {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    })
    .catch(err => {
      console.error('Failed to refresh incidents:', err);
    });
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
      fetchIncidents();
    } catch (e) {
      console.error('Error updating severity', e);
    }
  };

  const handleJiraCreate = async (issueId) => {
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      setTimeout(() => {
        fetchIncidents();
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
        fetchIncidents();
      }, 1000);
    } catch (e) {
      console.error('Error syncing Jira ticket', e);
    }
  };

  const handleTransition = async (issueId, transitionId) => {
    if (!transitionId || !issueId) return;
    try {
      await fetch(`http://localhost:8080/api/v1/incidents/${issueId}/jira/transitions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transitionId })
      });
      handleJiraSync(issueId);
    } catch (e) {
      console.error('Error transitioning issue', e);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h2>Incidents & Vulnerabilities</h2>
          <p>AI-detected issues across logs and source code.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={fetchIncidents}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, paddingBottom: '1rem' }}>
        <IssueList 
          issues={incidents}
          jwtToken={jwtToken}
          showFilters={true}
          onJiraSync={handleJiraSync}
          onJiraCreate={handleJiraCreate}
          onUpdateSeverity={handleSeverityChange}
          onTransition={handleTransition}
        />
      </div>
    </div>
  );
};

export default IssuesDashboard;
