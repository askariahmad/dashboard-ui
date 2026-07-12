import React, { useState, useEffect } from 'react';

const mockIncidents = [
  {
    id: '1',
    type: 'LOG',
    title: 'Database Timeout Exception',
    severity: 'HIGH',
    what: 'A connection timeout occurred on table "users".',
    why: 'Heavy read load caused connection pool exhaustion.',
    where: 'com.app.db.UserRepository',
    howToFix: '1. Increase connection pool size.\n2. Add read replicas.',
    occurrences: 4,
    jiraTicketUrl: 'https://jira.mock.com/browse/PROJ-999'
  },
  {
    id: '2',
    type: 'VULNERABILITY',
    title: 'Hardcoded API Token in Source',
    severity: 'HIGH',
    what: 'AWS Secret Key found hardcoded in the configuration file.',
    why: 'Could lead to unauthorized infrastructure access if the repository is compromised.',
    where: 'src/config/aws_config.js:L12',
    howToFix: 'Remove the key and use process.env.AWS_SECRET instead.',
    occurrences: 1,
    jiraTicketUrl: 'https://jira.mock.com/browse/PROJ-1002'
  },
  {
    id: '3',
    type: 'LOG',
    title: 'NullPointerException in AuthenticationFilter',
    severity: 'MEDIUM',
    what: 'Null token was passed to the JWT parser.',
    why: 'Client sent a malformed Authorization header without a Bearer token.',
    where: 'com.app.security.JwtFilter:L45',
    howToFix: 'Add a null check before calling parser.parseClaimsJws().',
    occurrences: 12,
    jiraTicketUrl: null
  }
];

const IssuesDashboard = ({ jwtToken }) => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    if (!jwtToken) return;
    fetch('http://localhost:8080/api/v1/incidents', {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setIncidents(data);
        setSelectedIncident(null);
      }
    })
    .catch(console.error);
  }, [jwtToken]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h2>Incidents & Vulnerabilities</h2>
          <p>AI-detected issues across logs and source code.</p>
        </div>
        <button className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          Run Manual Scan
        </button>
      </div>

      <div className="issues-container">
        {/* Master Table Pane */}
        <div className="table-pane">
          <div className="table-wrapper">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Occurrences</th>
                  <th>Jira Ticket</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(incident => (
                  <tr 
                    key={incident.id} 
                    className={selectedIncident?.id === incident.id ? 'selected' : ''}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <td>
                      <span className="truncate" style={{ width: '80px', color: 'var(--text-muted)' }} title={incident.id}>
                        {incident.id.substring(0, 8)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${incident.severity.toLowerCase()}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      <span className="badge type">{incident.type}</span>
                    </td>
                    <td>
                      <span className="truncate" title={incident.title}>
                        {incident.title}
                      </span>
                    </td>
                    <td>{incident.occurrences}</td>
                    <td>
                      {incident.jiraTicketKey ? (
                        <a href={incident.jiraTicketUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="jira-link">
                          {incident.jiraTicketKey}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="empty-state" style={{ border: 'none', background: 'transparent' }}>
                        No incidents found. System is healthy.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Drawer */}
        {selectedIncident && (
          <div className="drawer-overlay" onClick={() => setSelectedIncident(null)}>
            <div className="drawer-content" onClick={e => e.stopPropagation()}>
              <div className="details-card">
              <div className="details-header">
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className={`badge ${selectedIncident.severity.toLowerCase()}`}>
                      {selectedIncident.severity}
                    </span>
                    <span className="badge type">{selectedIncident.type}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedIncident.title}</h3>
                </div>
                <button className="close-btn" onClick={() => setSelectedIncident(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div className="details-body">
                <div className="detail-section">
                  <div className="detail-label">WHAT</div>
                  <div className="detail-content">{selectedIncident.what}</div>
                </div>
                
                <div className="detail-section">
                  <div className="detail-label">WHY</div>
                  <div className="detail-content">{selectedIncident.why}</div>
                </div>

                <div className="detail-section">
                  <div className="detail-label">WHERE</div>
                  <div className="detail-content" style={{ fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 'bold' }}>
                    {selectedIncident.where}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-label">HOW TO FIX</div>
                  <div className="detail-content">{selectedIncident.howToFix}</div>
                </div>
              </div>

              <div className="issue-footer" style={{ padding: '1.25rem 1.5rem', marginTop: 0, background: 'var(--bg-color)' }}>
                <div className="issue-meta">
                  Seen {selectedIncident.occurrences} times
                </div>
                {selectedIncident.jiraTicketUrl && (
                  <a href={selectedIncident.jiraTicketUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                    View Jira Ticket ↗
                  </a>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesDashboard;
