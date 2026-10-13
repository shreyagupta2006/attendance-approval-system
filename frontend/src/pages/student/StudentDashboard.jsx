import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import DocumentViewerModal from '../../components/common/DocumentViewerModal';
import ApprovalStepper from '../../components/common/ApprovalStepper';
import FileUploadArea from '../../components/common/FileUploadArea';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import {
  FilePlus, ListFilter, User, Calendar, FileText, Upload,
  CheckCircle, AlertCircle, Clock, Eye, Send, FileCheck, Layers, GraduationCap, CheckCircle2, XCircle
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'my-requests' | 'corrections'

  // Form States for Application
  const [requestType, setRequestType] = useState('MEDICAL_LEAVE');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Data List States
  const [applications, setApplications] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Attendance Correction Form State
  const [corrTeacherId, setCorrTeacherId] = useState('');
  const [corrSubjectId, setCorrSubjectId] = useState('');
  const [corrDate, setCorrDate] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrFile, setCorrFile] = useState(null);
  const [corrSubmitting, setCorrSubmitting] = useState(false);

  // Document Modal Viewer State
  const [viewerModal, setViewerModal] = useState({ isOpen: false, url: '', name: '', type: '' });

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications/my-applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCorrections = async () => {
    try {
      const res = await api.get('/corrections/my-corrections');
      setCorrections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjectsAndTeachers = async () => {
    try {
      const subRes = await api.get('/academic/subjects');
      setSubjects(subRes.data);
      const asgnRes = await api.get('/academic/assignments');
      setTeachers(asgnRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchApplications(), fetchCorrections(), fetchSubjectsAndTeachers()])
      .finally(() => setLoading(false));
  }, []);

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please attach a supporting document or signed application PDF/Image.' });
      return;
    }
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('request_type', requestType);
      formData.append('title', title);
      formData.append('reason', reason);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('document', file);

      await api.post('/applications/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Application submitted successfully! Sent for HOD review.' });
      setTitle('');
      setReason('');
      setStartDate('');
      setEndDate('');
      setFile(null);
      fetchApplications();
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
      setActiveTab('my-requests');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
          : 'Failed to submit application.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!corrTeacherId || !corrSubjectId || !corrDate || !corrReason) {
      setMessage({ type: 'error', text: 'Please fill out all required correction fields.' });
      return;
    }
    setCorrSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('teacher_id', corrTeacherId);
      formData.append('subject_id', corrSubjectId);
      formData.append('date_of_absence', corrDate);
      formData.append('reason', corrReason);
      if (corrFile) {
        formData.append('proof_file', corrFile);
      }

      await api.post('/corrections/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Attendance correction request submitted directly to Subject Teacher!' });
      setCorrReason('');
      setCorrDate('');
      setCorrFile(null);
      fetchCorrections();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit attendance correction.' });
    } finally {
      setCorrSubmitting(false);
    }
  };

  // Metrics
  const totalApps = applications.length;
  const pendingApps = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'PENDING').length;
  const approvedApps = applications.filter(a => a.status === 'APPROVED_BY_HOD' || a.status === 'APPROVED').length;
  const rejectedApps = applications.filter(a => a.status === 'REJECTED_BY_HOD' || a.status === 'REJECTED').length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="app-container">
        
        {/* Header Banner */}
        <div className="header-banner">
          <div className="header-user-info">
            <div className="avatar-badge avatar-student">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="user-display-name">{user?.full_name}</h2>
              <p className="user-meta-sub">
                Roll No: <strong style={{ color: 'var(--text-main)' }}>{user?.roll_number || 'N/A'}</strong> • Section: <strong style={{ color: 'var(--primary)' }}>{user?.section_label || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          <div className="tabs-nav-container">
            <button
              onClick={() => { setActiveTab('submit'); setMessage({ type: '', text: '' }); }}
              className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
            >
              <FilePlus className="w-4 h-4" /> Submit Application
            </button>
            <button
              onClick={() => { setActiveTab('my-requests'); setMessage({ type: '', text: '' }); }}
              className={`tab-btn ${activeTab === 'my-requests' ? 'active' : ''}`}
            >
              <ListFilter className="w-4 h-4" /> My Applications ({totalApps})
            </button>
            <button
              onClick={() => { setActiveTab('corrections'); setMessage({ type: '', text: '' }); }}
              className={`tab-btn ${activeTab === 'corrections' ? 'active' : ''}`}
            >
              <FileCheck className="w-4 h-4" /> Attendance Corrections ({corrections.length})
            </button>
          </div>
        </div>

        {/* Global Messages */}
        {message.text && (
          <div className={`alert-box ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-blue">
              <FileText className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Submitted</div>
              <div className="stat-value">{totalApps}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-amber">
              <Clock className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Pending Review</div>
              <div className="stat-value">{pendingApps}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-green">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">HOD Approved</div>
              <div className="stat-value">{approvedApps}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon-red">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{rejectedApps}</div>
            </div>
          </div>
        </div>

        {/* TAB 1: SUBMIT APPLICATION */}
        {activeTab === 'submit' && (
          <div className="app-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">New Attendance Approval Application</h3>
                <p className="card-subtitle">Submit leave or activity request directly to your Department HOD</p>
              </div>
            </div>

            <form onSubmit={handleApplicationSubmit}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Request Type <span className="text-required">*</span></label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="form-select"
                  >
                    <option value="MEDICAL_LEAVE">Medical Leave</option>
                    <option value="ATTENDANCE_CORRECTION">Attendance Correction</option>
                    <option value="EVENT_PERMISSION">Event Permission / Fest</option>
                    <option value="COLLEGE_ACTIVITY">College Activity / Sports</option>
                    <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                    <option value="OTHER">Other Request</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Application Title <span className="text-required">*</span></label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Medical Leave Request for Fever"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Start Date <span className="text-required">*</span></label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date <span className="text-required">*</span></label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Explanation <span className="text-required">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide complete reason details for the attendance approval..."
                  className="form-textarea"
                />
              </div>

              {/* Enhanced File Upload Component */}
              <FileUploadArea
                file={file}
                onFileSelect={setFile}
                label="Supporting Document / Signed Application (PDF / Image)"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY APPLICATIONS LIST */}
        {activeTab === 'my-requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <CardSkeleton count={3} />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Applications Submitted Yet"
                description="Your submitted attendance approval requests will appear here with full journey progress."
                actionLabel="Submit First Application"
                onAction={() => setActiveTab('submit')}
              />
            ) : (
              applications.map((app) => (
                <div key={app.id} className="app-card app-card-hover">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{app.title}</h4>
                        <StatusBadge status={app.status} />
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                        <span>Type: <strong style={{ color: 'var(--text-main)' }}>{app.request_type}</strong></span>
                        <span>Duration: <strong style={{ color: 'var(--text-main)' }}>{app.start_date} to {app.end_date}</strong></span>
                        <span>Submitted: <strong style={{ color: 'var(--text-main)' }}>{new Date(app.created_at).toLocaleDateString()}</strong></span>
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.75rem', background: 'var(--surface-alt)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        {app.reason}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
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
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <ApprovalStepper application={app} />
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: ATTENDANCE CORRECTIONS */}
        {activeTab === 'corrections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="app-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Request Attendance Correction</h3>
                  <p className="card-subtitle">Submit direct correction request to your subject faculty for missed lectures</p>
                </div>
              </div>

              <form onSubmit={handleCorrectionSubmit}>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Subject <span className="text-required">*</span></label>
                    <select
                      value={corrSubjectId}
                      onChange={(e) => setCorrSubjectId(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Subject --</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} - {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject Teacher <span className="text-required">*</span></label>
                    <select
                      value={corrTeacherId}
                      onChange={(e) => setCorrTeacherId(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Assigned Faculty --</option>
                      {teachers.map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.teacher_name} ({t.subject_code} - {t.section_label})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Absence <span className="text-required">*</span></label>
                  <input
                    type="date"
                    required
                    value={corrDate}
                    onChange={(e) => setCorrDate(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Correction <span className="text-required">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={corrReason}
                    onChange={(e) => setCorrReason(e.target.value)}
                    placeholder="State reason for absence on this specific subject lecture..."
                    className="form-textarea"
                  />
                </div>

                <FileUploadArea
                  file={corrFile}
                  onFileSelect={setCorrFile}
                  label="Proof Attachment (Optional)"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={corrSubmitting}
                    className="btn btn-primary btn-lg"
                  >
                    {corrSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Correction Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Corrections Table */}
            <div className="app-card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Submitted Correction Requests</h3>

              {corrections.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="No Attendance Correction Requests"
                  description="Direct subject attendance correction requests submitted to teachers will appear here."
                />
              ) : (
                <div className="table-responsive">
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Absence Date</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.subject_code}</strong> - {c.subject_name}</td>
                          <td>{c.teacher_name}</td>
                          <td>{c.date_of_absence}</td>
                          <td>{c.reason}</td>
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          <td>{c.teacher_remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

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

export default StudentDashboard;
