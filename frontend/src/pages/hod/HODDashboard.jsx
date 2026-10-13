import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import DocumentViewerModal from '../../components/common/DocumentViewerModal';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, FileText,
  MessageSquare, User, Calendar, History, Activity, AlertCircle, X, Eye, Search
} from 'lucide-react';

const HODDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history' | 'audit'

  const [pendingApps, setPendingApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal State
  const [reviewModal, setReviewModal] = useState({ isOpen: false, app: null, decision: 'APPROVED', remarks: '' });
  const [reviewing, setReviewing] = useState(false);

  // Document Viewer Modal State
  const [viewerModal, setViewerModal] = useState({ isOpen: false, url: '', name: '', type: '' });

  const fetchPending = async () => {
    try {
      const res = await api.get('/hod/applications/pending');
      setPendingApps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAll = async () => {
    try {
      const res = await api.get('/hod/applications/all');
      setAllApps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await api.get('/audit/');
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const reloadData = async () => {
    setLoading(true);
    await Promise.all([fetchPending(), fetchAll(), fetchAudit()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadData();

    const interval = setInterval(() => {
      fetchPending();
      fetchAll();
      fetchAudit();
    }, 5000);

    const handleFocus = () => {
      fetchPending();
      fetchAll();
      fetchAudit();
    };
    window.addEventListener('focus', handleFocus);

    const handleRefreshEvent = () => {
      fetchPending();
      fetchAll();
      fetchAudit();
    };
    window.addEventListener('refresh-dashboard', handleRefreshEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('refresh-dashboard', handleRefreshEvent);
    };
  }, []);

  const openReviewModal = (app, decision) => {
    setReviewModal({
      isOpen: true,
      app: app,
      decision: decision,
      remarks: decision === 'APPROVED' ? 'Approved as requested.' : ''
    });
  };

  const submitReview = async () => {
    if (!reviewModal.app) return;
    setReviewing(true);

    try {
      await api.post(`/hod/applications/${reviewModal.app.id}/review`, {
        decision: reviewModal.decision,
        remarks: reviewModal.remarks
      });

      setReviewModal({ isOpen: false, app: null, decision: 'APPROVED', remarks: '' });
      await reloadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit HOD decision.');
    } finally {
      setReviewing(false);
    }
  };

  // Metrics
  const pendingCount = pendingApps.length;
  const totalApproved = allApps.filter(a => a.status === 'APPROVED_BY_HOD' || a.status === 'APPROVED').length;
  const totalRejected = allApps.filter(a => a.status === 'REJECTED_BY_HOD' || a.status === 'REJECTED').length;

  const filteredHistory = allApps.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.student_name.toLowerCase().includes(q) ||
      a.student_roll.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.request_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="app-container">
        
        {/* HOD Header Banner */}
        <div className="header-banner">
          <div className="header-user-info">
            <div className="avatar-badge avatar-hod">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="user-display-name">{user?.full_name}</h2>
              <p className="user-meta-sub">
                Head of Department (HOD) — <strong style={{ color: 'var(--purple-text)' }}>{user?.department_name || 'CSE'} Department</strong>
              </p>
            </div>
          </div>

          <div className="tabs-nav-container">
            <button
              onClick={() => setActiveTab('pending')}
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            >
              <Clock className="w-4 h-4" /> Pending Queue ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History className="w-4 h-4" /> Application History ({allApps.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            >
              <Activity className="w-4 h-4" /> Audit Log ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* Executive Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-amber">
              <Clock className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Review</div>
              <div className="stat-value">{pendingCount}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-green">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Approved</div>
              <div className="stat-value">{totalApproved}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-red">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Rejected</div>
              <div className="stat-value">{totalRejected}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-purple">
              <FileText className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Applications</div>
              <div className="stat-value">{allApps.length}</div>
            </div>
          </div>
        </div>

        {/* TAB 1: PENDING QUEUE */}
        {activeTab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Department Pending Approval Queue</h3>
                <p className="card-subtitle">Review student attendance requests requiring HOD action</p>
              </div>
            </div>

            {loading ? (
              <CardSkeleton count={3} />
            ) : pendingApps.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All Pending Requests Reviewed!"
                description="There are currently no pending student applications requiring your approval in this department."
              />
            ) : (
              pendingApps.map((app) => (
                <div key={app.id} className="app-card app-card-hover">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{app.title}</h4>
                        <StatusBadge status={app.status} />
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                        <span>Student: <strong style={{ color: 'var(--text-main)' }}>{app.student_name} ({app.student_roll})</strong></span>
                        <span>Section: <strong style={{ color: 'var(--primary)' }}>{app.section_label || 'N/A'}</strong></span>
                        <span>Type: <strong style={{ color: 'var(--text-main)' }}>{app.request_type}</strong></span>
                        <span>Dates: <strong style={{ color: 'var(--text-main)' }}>{app.start_date} to {app.end_date}</strong></span>
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.75rem', background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <strong>Reason:</strong> {app.reason}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                      {app.documents && app.documents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setViewerModal({
                            isOpen: true,
                            url: app.documents[0].signed_url,
                            name: app.documents[0].file_name,
                            type: app.documents[0].file_type
                          })}
                          className="btn btn-outline btn-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Document
                        </button>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => openReviewModal(app, 'REJECTED')}
                          className="btn btn-danger btn-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => openReviewModal(app, 'APPROVED')}
                          className="btn btn-success btn-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: APPLICATION HISTORY */}
        {activeTab === 'history' && (
          <div className="app-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Department Application History</h3>
                <p className="card-subtitle">Complete record of approved and rejected attendance applications</p>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="Search student or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="No History Records Found"
                description="No department applications match your search query."
              />
            ) : (
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Section</th>
                      <th>Title & Type</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>HOD Remarks</th>
                      <th>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((app) => (
                      <tr key={app.id}>
                        <td><strong>{app.student_name}</strong></td>
                        <td>{app.student_roll}</td>
                        <td>{app.section_label || '—'}</td>
                        <td>
                          <div><strong>{app.title}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.request_type}</div>
                        </td>
                        <td>{app.start_date} to {app.end_date}</td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td>{app.hod_approval?.remarks || '—'}</td>
                        <td>
                          {app.documents && app.documents.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setViewerModal({
                                isOpen: true,
                                url: app.documents[0].signed_url,
                                name: app.documents[0].file_name,
                                type: app.documents[0].file_type
                              })}
                              className="btn btn-outline btn-sm"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="app-card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Department Security & Action Audit Trail</h3>

            {auditLogs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Audit Logs"
                description="System activities and approval audit events will be logged here."
              />
            ) : (
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td><strong>{log.actor_name || log.actor_id}</strong></td>
                        <td>
                          <span className="status-badge badge-default">{log.action}</span>
                        </td>
                        <td>{log.entity_type} ({log.entity_id ? log.entity_id.substring(0, 8) : ''}...)</td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Review Confirmation Modal */}
      {reviewModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {reviewModal.decision === 'APPROVED' ? 'Approve Application' : 'Reject Application'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem', background: 'var(--surface-alt)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  {reviewModal.app?.student_name} ({reviewModal.app?.student_roll})
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {reviewModal.app?.title} • {reviewModal.app?.start_date} to {reviewModal.app?.end_date}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">HOD Decision Remarks / Reason</label>
                <textarea
                  rows={3}
                  value={reviewModal.remarks}
                  onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
                  placeholder="Enter official HOD decision remarks..."
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewing}
                className={`btn ${reviewModal.decision === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                onClick={submitReview}
              >
                {reviewing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  reviewModal.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerModal.isOpen}
        onClose={() => setViewerModal({ ...viewerModal, isOpen: false })}
        documentUrl={viewerModal.url}
        fileName={viewerModal.name}
        fileType={viewerModal.type}
      />
    </div>
  );
};

export default HODDashboard;
