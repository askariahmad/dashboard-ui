import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const getJiraStatusStyles = (status) => {
  if (!status) return { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
  const s = status.toUpperCase();
  if (s === 'DONE' || s === 'CLOSED' || s === 'RESOLVED') {
    return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
  }
  if (s === 'IN PROGRESS' || s === 'ACTIVE') {
    return { background: '#ebf4ff', color: '#2b6cb0', border: '1px solid #90cdf4' };
  }
  if (s === 'TO DO' || s === 'OPEN' || s === 'NEW' || s === 'TODO') {
    return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
  }
  return { background: '#fdf4ff', color: '#86198f', border: '1px solid #fae8ff' };
};

const getTypeStyles = (type) => {
  if (!type) return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
  const t = type.toUpperCase();
  if (t === 'VULNERABILITY') return { background: '#fdf4ff', color: '#86198f', border: '1px solid #fae8ff' };
  if (t === 'CODE SMELL' || t === 'CODESMELL') return { background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1' };
  if (t === 'LOG') return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
  if (t === 'BUG' || t === 'ISSUE') return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
  return { background: '#f4f4f5', color: '#3f3f46', border: '1px solid #e4e4e7' };
};

const getSeverityStyles = (severity) => {
  if (!severity) return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
  const s = severity.toUpperCase();
  if (s === 'CRITICAL') return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
  if (s === 'HIGH') return { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
  if (s === 'MEDIUM') return { background: '#fefce8', color: '#a16207', border: '1px solid #fef08a' };
  if (s === 'LOW') return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
  return { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
};

const getHumanId = (id) => {
  if (!id) return '';
  // The last 6 characters of a MongoDB ObjectId represent a 3-byte incrementing counter.
  // Using these 6 chars ensures almost zero chance of collision for human-readable IDs.
  return 'INC-' + id.substring(id.length - 6).toUpperCase();
};

const DiffRenderer = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  if (!inline && match && match[1].toLowerCase() === 'diff') {
    const lines = String(children).replace(/\n$/, '').split('\n');
    
    let title = '';
    const diffLines = [];
    let oldLineNum = 1;
    let newLineNum = 1;
    
    lines.forEach(line => {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        if (!title || title.startsWith('a/')) {
          title = line.substring(6);
        }
      } else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10);
          newLineNum = parseInt(match[2], 10);
        }
        diffLines.push({ type: 'header', content: line, num: '' });
      } else if (line.startsWith('-')) {
        diffLines.push({ type: 'removed', content: line, num: oldLineNum++ });
      } else if (line.startsWith('+')) {
        diffLines.push({ type: 'added', content: line, num: newLineNum++ });
      } else {
        diffLines.push({ type: 'context', content: line, num: newLineNum });
        oldLineNum++;
        newLineNum++;
      }
    });

    return (
      <div style={{ border: '1px solid var(--surface-border)', borderRadius: '6px', overflow: 'hidden', margin: '1rem 0', fontFamily: 'monospace' }}>
        {title && (
          <div style={{ background: '#1e293b', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', borderBottom: '1px solid #334155' }}>
            {title}
          </div>
        )}
        <div style={{ background: '#0f172a', overflowX: 'auto' }}>
          <pre style={{ margin: 0, padding: 0, background: 'transparent' }}>
            <code className={className} style={{ display: 'block', fontSize: '0.85rem', lineHeight: 1.5, padding: '0.5rem 0' }}>
              {diffLines.map((l, i) => {
                let color = '#cbd5e1';
                let bg = 'transparent';
                if (l.type === 'added') { color = '#4ade80'; bg = 'rgba(74, 222, 128, 0.15)'; }
                else if (l.type === 'removed') { color = '#f87171'; bg = 'rgba(248, 113, 113, 0.15)'; }
                else if (l.type === 'header') { color = '#94a3b8'; bg = '#1e293b'; }

                return (
                  <div key={i} style={{ display: 'flex', color, backgroundColor: bg, padding: '0 1rem' }}>
                    <span style={{ width: '40px', flexShrink: 0, textAlign: 'right', paddingRight: '1rem', color: '#64748b', userSelect: 'none', borderRight: '1px solid #334155', marginRight: '1rem' }}>
                      {l.num}
                    </span>
                    <span style={{ whiteSpace: 'pre' }}>{l.content}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
};

const IssueList = ({ 
  issues, 
  onJiraSync, 
  onJiraCreate, 
  onUpdateSeverity, 
  onTransition, 
  onCreatePR,
  jwtToken,
  showFilters = true 
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  // Local Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT'); // DEFAULT, SEVERITY_DESC, OCCURRENCES_DESC

  // Lazy Loading State
  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  // Sync selectedItem when issues array updates
  useEffect(() => {
    if (selectedItem) {
      const updated = issues.find(i => i.id === selectedItem.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedItem)) {
        setSelectedItem(updated);
      }
    }
  }, [issues, selectedItem]);

  // Derive common properties for both dashboard incident types
  const normalizeItem = (item) => {
    return {
      ...item,
      normalizedTitle: item.title || '',
      normalizedSeverity: item.severity || 'LOW',
      normalizedOccurrences: item.occurrences || 1,
      normalizedType: item.type || 'ISSUE',
      normalizedWhat: item.what || item.rawData || '',
      normalizedWhy: item.why || item.reason || '',
      normalizedWhere: item.where || item.filePath || (item.file && item.line ? `${item.file}:${item.line}` : ''),
      normalizedHowToFix: item.howToFix || item.fix || ''
    };
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    issues.forEach(item => {
      const type = item.type || 'ISSUE';
      types.add(type);
    });
    return Array.from(types).sort();
  }, [issues]);

  const processedIssues = useMemo(() => {
    let result = issues.map(normalizeItem);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.normalizedTitle.toLowerCase().includes(q) || 
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.jiraTicketKey && item.jiraTicketKey.toLowerCase().includes(q))
      );
    }

    if (severityFilter !== 'ALL') {
      result = result.filter(item => (item.normalizedSeverity || '').toUpperCase() === severityFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNASSIGNED') {
        result = result.filter(item => !item.jiraTicketKey);
      } else {
        result = result.filter(item => item.jiraStatus && item.jiraStatus.toUpperCase() === statusFilter);
      }
    }

    if (typeFilter !== 'ALL') {
      result = result.filter(item => item.normalizedType === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'SEVERITY_DESC') {
        const severityMap = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const valA = severityMap[a.normalizedSeverity] || 0;
        const valB = severityMap[b.normalizedSeverity] || 0;
        return valB - valA;
      } else if (sortBy === 'OCCURRENCES_DESC') {
        return b.normalizedOccurrences - a.normalizedOccurrences;
      }
      return 0; // DEFAULT
    });

    return result;
  }, [issues, searchQuery, severityFilter, statusFilter, typeFilter, sortBy]);

  const visibleIssues = processedIssues.slice(0, visibleCount);

  // Lazy loading observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 20, processedIssues.length));
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [processedIssues.length]);

  // Reset selected item if it's no longer in the list
  useEffect(() => {
    if (selectedItem) {
      const updated = issues.find(i => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  }, [issues]);

  const [transitions, setTransitions] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descTab, setDescTab] = useState('raw'); // 'raw' or 'preview'
  const [editedWhy, setEditedWhy] = useState('');
  const [editedHowToFix, setEditedHowToFix] = useState('');
  const [regeneratingIds, setRegeneratingIds] = useState([]);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartEdit = () => {
    setEditedWhy(selectedNorm?.normalizedWhy || '');
    setEditedHowToFix(selectedNorm?.normalizedHowToFix || '');
    setDescTab('raw');
    setIsEditingDesc(true);
  };

  const handleRegenerate = () => {
    if (!selectedNorm) return;
    const currentId = selectedNorm.id;
    setRegeneratingIds(prev => [...prev, currentId]);
    fetch(`http://localhost:8080/api/v1/scanner/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'tenant-1', 'Authorization': `Bearer ${jwtToken}` },
      body: JSON.stringify(selectedItem) // Pass original issue to regenerate
    })
    .then(res => {
      if (!res.ok) throw new Error('Regeneration failed');
      return res.json();
    })
    .then(data => {
      return fetch(`http://localhost:8080/api/v1/incidents/${currentId}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
        body: JSON.stringify({ why: data.why, howToFix: data.howToFix })
      }).then(() => data);
    })
    .then(data => {
      setRegeneratingIds(prev => prev.filter(id => id !== currentId));
      showToast('Description regenerated successfully!');
      if (onJiraSync) onJiraSync(currentId);
    })
    .catch(err => {
      console.error(err);
      setRegeneratingIds(prev => prev.filter(id => id !== currentId));
      showToast('Failed to regenerate description.');
    });
  };

  const handleSaveDescription = () => {
    if (!selectedNorm) return;
    setIsSavingDesc(true);
    fetch(`http://localhost:8080/api/v1/incidents/${selectedItem.id}/description`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      body: JSON.stringify({ why: editedWhy, howToFix: editedHowToFix })
    })
    .then(res => {
      if (!res.ok) throw new Error('Save failed');
      setIsSavingDesc(false);
      setIsEditingDesc(false);
      showToast('Description saved successfully!');
      if (onJiraSync) onJiraSync(selectedItem.id);
    })
    .catch(err => {
      console.error(err);
      setIsSavingDesc(false);
      showToast('Failed to save description.');
    });
  };

  useEffect(() => {
    if (selectedItem?.id && selectedItem?.jiraTicketKey && jwtToken) {
      fetch(`http://localhost:8080/api/v1/incidents/${selectedItem.id}/jira/transitions`, {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      })
      .then(res => res.json())
      .then(data => setTransitions(data || []))
      .catch(console.error);
    } else {
      setTransitions([]);
    }
  }, [selectedItem?.id, selectedItem?.jiraTicketKey, jwtToken]);

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedItem) return;
    if (window.onAddCommentCallback) {
        window.onAddCommentCallback(selectedItem.id, newComment);
        setNewComment('');
    }
  };

  const selectedNorm = selectedItem ? normalizeItem(selectedItem) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {showFilters && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', flexShrink: 0 }}>
          <input 
            type="text" 
            placeholder="Search issues..." 
            className="input-field" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={{ width: '250px', padding: '0.5rem 1rem' }} 
          />
          
          <select className="input-field" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          
          <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
            <option value="ALL">All Jira Status</option>
            <option value="UNASSIGNED">No Jira Ticket</option>
            <option value="TO DO">To Do</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          <select className="input-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
            <option value="ALL">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort by:</span>
            <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
              <option value="DEFAULT">Default</option>
              <option value="SEVERITY_DESC">Severity (High to Low)</option>
              <option value="OCCURRENCES_DESC">Occurrences</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {/* Master List Pane */}
        <div className="hide-scrollbar" style={{ flex: selectedNorm ? 1 : '1 1 100%', transition: 'flex 0.3s', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visibleIssues.map(item => (
              <div 
                key={item.id} 
                className="saas-card"
                style={{ 
                  padding: '1rem', 
                  marginBottom: '0.75rem',
                  cursor: 'pointer',
                  borderLeft: selectedItem?.id === item.id ? '3px solid #2563eb' : '',
                  background: selectedItem?.id === item.id ? 'var(--table-selected-bg)' : ''
                }}
                onClick={() => setSelectedItem(item)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="saas-badge" style={{ ...getSeverityStyles(item.normalizedSeverity) }}>
                      {item.normalizedSeverity}
                    </span>
                    <span className="saas-badge" style={{ ...getTypeStyles(item.normalizedType) }}>{item.normalizedType}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {item.jiraStatus && (
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: '600', ...getJiraStatusStyles(item.jiraStatus) }}>
                        {item.jiraStatus}
                      </span>
                    )}
                    {item.jiraTicketKey && (
                      <span style={{ fontSize: '0.7rem', background: '#ebf4ff', color: '#2b6cb0', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #90cdf4', fontWeight: '600' }}>
                        {item.jiraTicketKey}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontWeight: '500', fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{item.normalizedTitle}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, background: 'var(--bg-color)', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>{getHumanId(item.id)}</span>
                    {item.repository && <span>{item.repository}</span>}
                    <span>{item.normalizedOccurrences} Occurrences</span>
                  </div>
                  {item.jiraAssignee && <span style={{ fontStyle: 'italic' }}>{item.jiraAssignee}</span>}
                </div>
              </div>
            ))}
            
            {processedIssues.length === 0 && (
              <div className="empty-state" style={{ border: 'none', background: 'transparent', textAlign: 'center', padding: '3rem' }}>
                No issues match your criteria.
              </div>
            )}
            
            {visibleCount < processedIssues.length && (
              <div ref={observerTarget} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading more...
              </div>
            )}
          </div>
        </div>

        {/* Details Drawer */}
        {selectedNorm && (
          <div style={{ flex: 2, background: 'var(--surface)', borderLeft: '1px solid var(--surface-border)', border: '1px solid var(--surface-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', padding: '0.1rem', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.5rem', paddingRight: '0.25rem' }}>SEVERITY:</span>
                    <select 
                      className="input-field" 
                      value={selectedNorm.normalizedSeverity}
                      onChange={(e) => onUpdateSeverity && onUpdateSeverity(selectedNorm.id, e.target.value)}
                      style={{ border: 'none', width: 'auto', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', ...getSeverityStyles(selectedNorm.normalizedSeverity) }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <span className="saas-badge" style={{ ...getTypeStyles(selectedNorm.normalizedType), padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedNorm.normalizedType}
                  </span>
                  
                  {selectedNorm.jiraStatus && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <select 
                        className="input-field saas-btn"
                        disabled={isTransitioning || !transitions || transitions.length === 0}
                        onChange={(e) => {
                          if (onTransition) {
                            setIsTransitioning(true);
                            const selectedOption = e.target.options[e.target.selectedIndex];
                            onTransition(selectedNorm.id, e.target.value, selectedOption.text);
                            setTimeout(() => {
                              fetch(`http://localhost:8080/api/v1/incidents/${selectedNorm.id}/jira/transitions`, {
                                headers: { 'Authorization': `Bearer ${jwtToken}` }
                              }).then(res => res.json()).then(data => {
                                setTransitions(data || []);
                                setIsTransitioning(false);
                              }).catch(console.error);
                            }, 1500);
                          }
                        }}
                        value="current"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 1.5rem 0.25rem 0.5rem', borderRadius: '4px', fontWeight: '600', appearance: 'none', cursor: (isTransitioning || !transitions || transitions.length === 0) ? 'default' : 'pointer', ...getJiraStatusStyles(selectedNorm.jiraStatus) }}
                      >
                        <option value="current" disabled>{isTransitioning ? 'Updating...' : selectedNorm.jiraStatus}</option>
                        {!isTransitioning && transitions && transitions.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {(!isTransitioning && transitions && transitions.length > 0) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={getJiraStatusStyles(selectedNorm.jiraStatus).color} strokeWidth="3" style={{ position: 'absolute', right: '6px', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', marginRight: '1rem' }}>
                    {selectedNorm.exactCodeFix && onCreatePR && (
                      <button 
                        className="saas-btn"
                        onClick={(e) => onCreatePR(e, selectedNorm)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', borderColor: '#bbf7d0', padding: '0.4rem 0.75rem' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Auto-Fix (PR)
                      </button>
                    )}
                    {selectedNorm.jiraTicketKey ? (
                      <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--surface-border)', background: 'var(--surface)' }}>
                        <a href={selectedNorm.jiraTicketUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', color: '#2b6cb0', fontSize: '0.85rem', fontWeight: 600, borderRight: '1px solid var(--surface-border)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          {selectedNorm.jiraTicketKey}
                        </a>
                        <button onClick={() => onJiraSync && onJiraSync(selectedNorm.id)} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }} className="saas-btn">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                          Sync
                        </button>
                      </div>
                    ) : (
                      <button className="saas-btn" onClick={() => onJiraCreate && onJiraCreate(selectedNorm.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2b6cb0', borderColor: '#90cdf4', padding: '0.4rem 0.75rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"></path></svg>
                        Create Jira Ticket
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={() => setSelectedItem(null)} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', padding: 0, flexShrink: 0 }} title="Close Details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: '1.4' }}>
                  {selectedNorm.normalizedTitle}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }} title={selectedNorm.id}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    {getHumanId(selectedNorm.id)}
                  </span>
                  {selectedNorm.repository && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                      {selectedNorm.repository}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    {selectedNorm.normalizedOccurrences} Occurrences
                  </span>
                  {selectedNorm.jiraTicketKey && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <strong>{selectedNorm.jiraAssignee || 'Unassigned'}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div className="details-body" style={{ flex: 'unset', flexShrink: 0 }}>
                {selectedNorm.normalizedWhat && (
                  <div className="detail-section">
                    <div className="detail-label">WHAT</div>
                    <div className="detail-content markdown-body" style={{ fontSize: '0.95rem' }}>
                      <ReactMarkdown components={{ code: DiffRenderer }}>{selectedNorm.normalizedWhat}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {selectedNorm.normalizedWhere && (
                  <div className="detail-section">
                    <div className="detail-label">WHERE</div>
                    <div className="detail-content markdown-body" style={{ fontSize: '0.95rem' }}>
                      <ReactMarkdown components={{ code: DiffRenderer }}>{`\`${selectedNorm.normalizedWhere}\``}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                <div className="detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div className="detail-label" style={{ marginBottom: 0 }}>ANALYSIS (WHY & HOW TO FIX)</div>
                    {!isEditingDesc && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="saas-btn" onClick={handleRegenerate} disabled={regeneratingIds.includes(selectedNorm.id)}>
                          {regeneratingIds.includes(selectedNorm.id) ? (
                            <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '0.4rem', verticalAlign: 'middle' }}></span>Regenerating...</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>Regenerate</>
                          )}
                        </button>
                        <button className="saas-btn" onClick={handleStartEdit}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isEditingDesc ? (
                    <div style={{ border: '1px solid var(--surface-border)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', background: 'var(--bg-color)' }}>
                        <button 
                          style={{ padding: '0.5rem 1rem', border: 'none', background: descTab === 'raw' ? 'var(--surface)' : 'transparent', color: descTab === 'raw' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: descTab === 'raw' ? 600 : 400, cursor: 'pointer', borderRight: '1px solid var(--surface-border)' }}
                          onClick={() => setDescTab('raw')}
                        >Raw Markdown</button>
                        <button 
                          style={{ padding: '0.5rem 1rem', border: 'none', background: descTab === 'preview' ? 'var(--surface)' : 'transparent', color: descTab === 'preview' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: descTab === 'preview' ? 600 : 400, cursor: 'pointer', borderRight: '1px solid var(--surface-border)' }}
                          onClick={() => setDescTab('preview')}
                        >Preview</button>
                      </div>
                      
                      <div style={{ padding: '1rem', background: 'var(--surface)' }}>
                        {descTab === 'raw' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WHY</div>
                              <textarea 
                                className="input-field" 
                                style={{ width: '100%', minHeight: '150px', fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                                value={editedWhy}
                                onChange={(e) => setEditedWhy(e.target.value)}
                              />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>HOW TO FIX</div>
                              <textarea 
                                className="input-field" 
                                style={{ width: '100%', minHeight: '150px', fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                                value={editedHowToFix}
                                onChange={(e) => setEditedHowToFix(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="markdown-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>WHY</h4>
                              {editedWhy ? <ReactMarkdown components={{ code: DiffRenderer }}>{editedWhy}</ReactMarkdown> : <span style={{color: 'var(--text-muted)'}}>No content</span>}
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>HOW TO FIX</h4>
                              {editedHowToFix ? <ReactMarkdown components={{ code: DiffRenderer }}>{editedHowToFix}</ReactMarkdown> : <span style={{color: 'var(--text-muted)'}}>No content</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--surface-border)', background: 'var(--bg-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="saas-btn" onClick={() => setIsEditingDesc(false)}>Cancel</button>
                        <button className="saas-btn-primary" onClick={handleSaveDescription} disabled={isSavingDesc}>
                          {isSavingDesc ? 'Saving...' : 'Save Description'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedNorm.normalizedWhy && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WHY</div>
                          <div className="detail-content markdown-body" style={{ fontSize: '0.95rem', padding: 0 }}>
                            <ReactMarkdown components={{ code: DiffRenderer }}>{selectedNorm.normalizedWhy}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      
                      {selectedNorm.normalizedHowToFix && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>HOW TO FIX</div>
                          <div className="detail-content markdown-body" style={{ fontSize: '0.95rem', padding: 0 }}>
                            <ReactMarkdown components={{ code: DiffRenderer }}>{selectedNorm.normalizedHowToFix}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {selectedNorm.jiraTicketKey && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', background: 'var(--bg-color)', flexShrink: 0 }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>Jira Comments</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[...(selectedNorm.jiraComments || [])]
                      .sort((a, b) => new Date(b.created) - new Date(a.created))
                      .map(c => (
                      <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{c.author}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(c.created).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {c.body}
                        </div>
                      </div>
                    ))}
                    {(!selectedNorm.jiraComments || selectedNorm.jiraComments.length === 0) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments yet.</div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea 
                      className="input-field" 
                      placeholder="Add a comment to Jira..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--surface-border)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="saas-btn-primary" onClick={handleAddComment} disabled={!newComment.trim()}>
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--surface)', color: 'var(--text-main)', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--surface-border)', zIndex: 1000, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          {toastMessage}
        </div>
      )}
    </div>
    </div>
  );
};

export default IssueList;
