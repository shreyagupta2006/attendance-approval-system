import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import DocumentViewerModal from '../../components/common/DocumentViewerModal';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import {
  UserCheck, CheckCircle2, Eye, FileText, Calendar, Clock,
  FileCheck, XCircle, AlertCircle, X, Check
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('approved-feed'); // 'approved-feed' | 'corrections' | 'my-acks'

  const [approvedApps, setApprovedApps] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Correction Review Modal State
  const [corrModal, setCorrModal] = useState({ isOpen: false, item: null, status: 'APPROVED', remarks: '' });
  const [reviewingCorr, setReviewingCorr] = useState(false);

  // Document Viewer Modal State
  const [viewerModal, setViewerModal] = useState({ isOpen: false, url: '', name: '', type: '' });

  const fetchApprovedApps = async () => {
    try {
      const res = await api.get('/teacher/applications/approved');
      setApprovedApps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCorrections = async () => {
    try {
      const res = await api.get('/corrections/teacher/all');
      setCorrections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const reloadData = async () => {
    setLoading(true);
    await Promise.all([fetchApprovedApps(), fetchCorrections()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadData();

    const interval = setInterval(() => {
      fetchApprovedApps();
      fetchCorrections();
    }, 5000);

    const handleFocus = () => {
      fetchApprovedApps();
      fetchCorrections();
    };
    window.addEventListener('focus', handleFocus);

    const handleRefreshEvent = () => {
      fetchApprovedApps();
      fetchCorrections();
    };
    window.addEventListener('refresh-dashboard', handleRefreshEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('refresh-dashboard', handleRefreshEvent);
    };
  }, []);

  const handleAcknowledge = async (appId) => {
    try {
      await api.post(`/teacher/applications/${appId}/acknowledge`);
      await fetchApprovedApps();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to acknowledge application.');
    }
  };

  const submitCorrectionReview = async () => {
    if (!corrModal.item) return;
    setReviewingCorr(true);

    try {
      await api.post(`/corrections/${corrModal.item.id}/review`, {
        status: corrModal.status,
        teacher_remarks: corrModal.remarks
      });

      setCorrModal({ isOpen: false, item: null, status: 'APPROVED', remarks: '' });
      await fetchCorrections();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit correction decision.');
    } finally {
      setReviewingCorr(false);
    }
  };

  const pendingCorrectionsCount = corrections.filter(c => c.status === 'PENDING').length;
  const pendingAcksCount = approvedApps.filter(a => !a.is_acknowledged_by_current_teacher).length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="app-container">
        
        {/* Faculty Header Banner */}
        <div className="header-banner">
          <div className="header-user-info">
            <div className="avatar-badge avatar-teacher">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="user-display-name">{user?.full_name}</h2>
              <p className="user-meta-sub">
                Faculty Member — Employee ID: <strong style={{ color: 'var(--text-main)' }}>{user?.employee_id || 'N/A'}</strong> ({user?.department_name || 'CSE'})
              </p>
            </div>
          </div>

          <div className="tabs-nav-container">
            <button
              onClick={() => setActiveTab('approved-feed')}
              className={`tab-btn ${activeTab === 'approved-feed' ? 'active' : ''}`}
            >
              <CheckCircle2 className="w-4 h-4" /> HOD Approved Requests ({approvedApps.length})
            </button>
            <button
              onClick={() => setActiveTab('corrections')}
              className={`tab-btn ${activeTab === 'corrections' ? 'active' : ''}`}
            >
              <FileCheck className="w-4 h-4" /> Attendance Corrections ({pendingCorrectionsCount} Pending)
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-amber">
              <Clock className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Acknowledgements</div>
              <div className="stat-value">{pendingAcksCount}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-green">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total HOD Approved</div>
              <div className="stat-value">{approvedApps.length}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-purple">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Corrections</div>
              <div className="stat-value">{pendingCorrectionsCount}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-blue">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Corrections</div>
              <div className="stat-value">{corrections.length}</div>
            </div>
          </div>
        </div>

        {/* TAB 1: APPROVED REQUESTS FEED */}
        {activeTab === 'approved-feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">HOD Approved Student Requests Feed</h3>
                <p className="card-subtitle">Review HOD approved student attendance applications requiring faculty acknowledgement</p>
              </div>
            </div>

            {loading ? (
              <CardSkeleton count={3} />
            ) : approvedApps.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No Approved Applications Feed"
                description="HOD approved attendance requests for your assigned sections will appear here for faculty acknowledgement."
              />
            ) : (
              approvedApps.map((app) => (
                <div key={app.id} className="app-card app-card-hover">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{app.title}</h4>
                        <StatusBadge status={app.status} />
                        {app.is_acknowledged_by_current_teacher && (
                          <span className="status-badge badge-acknowledged">
                            <Check className="w-3.5 h-3.5" /> Acknowledged by You
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                        <span>Student: <strong style={{ color: 'var(--text-main)' }}>{app.student_name} ({app.student_roll})</strong></span>
                        <span>Section: <strong style={{ color: 'var(--primary)' }}>{app.section_label || 'N/A'}</strong></span>
                        <span>Type: <strong style={{ color: 'var(--text-main)' }}>{app.request_type}</strong></span>
                        <span>Leave Dates: <strong style={{ color: 'var(--text-main)' }}>{app.start_date} to {app.end_date}</strong></span>
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.75rem', background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <strong>Reason:</strong> {app.reason}
                      </p>

                      {app.hod_approval && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-border)' }}>
                          ✓ HOD Decision: <strong>{app.hod_approval.hod_name}</strong> — "{app.hod_approval.remarks || 'Approved'}"
                        </div>
                      )}
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

                      {!app.is_acknowledged_by_current_teacher ? (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(app.id)}
                          className="btn btn-primary btn-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Acknowledge Attendance
                        </button>
                      ) : (
                        <button disabled className="btn btn-secondary btn-sm">
                          <Check className="w-4 h-4" /> Already Acknowledged
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ATTENDANCE CORRECTIONS REVIEW */}
        {activeTab === 'corrections' && (
          <div className="app-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Subject Attendance Corrections</h3>
                <p className="card-subtitle">Direct student requests for correcting missed lecture attendance</p>
              </div>
            </div>

            {corrections.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No Correction Requests"
                description="No direct attendance correction requests submitted for your subjects."
              />
            ) : (
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Subject</th>
                      <th>Absence Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrections.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.student_name}</strong></td>
                        <td>{c.student_roll}</td>
                        <td><strong>{c.subject_code}</strong> - {c.subject_name}</td>
                        <td>{c.date_of_absence}</td>
                        <td>{c.reason}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>
                          {c.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button
                                type="button"
                                onClick={() => setCorrModal({ isOpen: true, item: c, status: 'REJECTED', remarks: '' })}
                                className="btn btn-danger btn-sm"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => setCorrModal({ isOpen: true, item: c, status: 'APPROVED', remarks: 'Approved correction.' })}
                                className="btn btn-success btn-sm"
                              >
                                Approve
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.teacher_remarks || 'Reviewed'}</span>
                          )}
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

      {/* Correction Review Modal */}
      {corrModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Review Attendance Correction</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCorrModal({ ...corrModal, isOpen: false })}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem', background: 'var(--surface-alt)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  {corrModal.item?.student_name} ({corrModal.item?.student_roll})
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {corrModal.item?.subject_code} • Date of Absence: {corrModal.item?.date_of_absence}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Faculty Remarks</label>
                <textarea
                  rows={3}
                  value={corrModal.remarks}
                  onChange={(e) => setCorrModal({ ...corrModal, remarks: e.target.value })}
                  placeholder="Enter faculty decision remarks..."
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCorrModal({ ...corrModal, isOpen: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewingCorr}
                className={`btn ${corrModal.status === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                onClick={submitCorrectionReview}
              >
                {reviewingCorr ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  corrModal.status === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'
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

export default TeacherDashboard;
