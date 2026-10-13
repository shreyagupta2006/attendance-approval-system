import React from 'react';
import {
  Users, UserCheck, Shield, Building, Layers, BookOpen, Link as LinkIcon,
  AlertTriangle, Clock, CheckCircle2, ArrowRight, Activity, FileText
} from 'lucide-react';

const DashboardOverview = ({ stats, auditLogs, onNavigateTab }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Misconfigured Section Alert Banner */}
      {stats.unassigned_section_warnings > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: '#d97706' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.9375rem' }}>
                Academic Configuration Alert ({stats.unassigned_section_warnings} unroutable approval{stats.unassigned_section_warnings > 1 ? 's' : ''})
              </div>
              <div style={{ color: '#b45309', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                There are HOD-approved leave applications from sections with zero assigned faculty members. These cannot be routed for acknowledgement until teachers are mapped.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ backgroundColor: '#d97706', color: '#ffffff', whiteSpace: 'nowrap', border: 'none' }}
            onClick={() => onNavigateTab('assignments')}
          >
            Resolve in Assignments <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
          </button>
        </div>
      )}

      {/* Primary Infrastructure Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigateTab('students')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Users className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Enrolled Students</div>
            <div className="stat-value">{stats.total_students}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigateTab('teachers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper stat-icon-green">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Faculty Members</div>
            <div className="stat-value">{stats.total_teachers}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigateTab('hods')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Department HODs</div>
            <div className="stat-value">{stats.total_hods}</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigateTab('departments')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Building className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Departments</div>
            <div className="stat-value">{stats.total_departments}</div>
          </div>
        </div>
      </div>

      {/* Live Operational Pipeline */}
      <div className="app-card">
        <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Live Institutional Workflow Pipeline</h3>
        <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
          Real-time tracking of applications moving through HOD approvals, teacher acknowledgements, and corrections.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* HOD Approvals */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>HOD APPROVAL QUEUE</span>
                <Clock className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: stats.pending_hod_approvals > 0 ? 'var(--warning-text)' : 'var(--text-main)' }}>
                {stats.pending_hod_approvals}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Leave applications submitted by students awaiting departmental HOD decisions.
              </div>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span className="badge badge-default" style={{ background: stats.pending_hod_approvals > 0 ? 'var(--warning-bg)' : 'var(--success-bg)', color: stats.pending_hod_approvals > 0 ? 'var(--warning-text)' : 'var(--success-text)', fontSize: '0.75rem' }}>
                {stats.pending_hod_approvals > 0 ? 'Action Required by HODs' : 'All HOD queues cleared'}
              </span>
            </div>
          </div>

          {/* Teacher Acknowledgements */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>AWAITING FACULTY ACK</span>
                <FileText className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: stats.applications_awaiting_teacher_ack > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                {stats.applications_awaiting_teacher_ack}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                HOD-approved applications routed to section teachers ({stats.total_unacknowledged_teacher_slots} outstanding teacher slot{stats.total_unacknowledged_teacher_slots !== 1 ? 's' : ''}).
              </div>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.75rem' }}>
                Strict Teacher Section Isolation Enforced
              </span>
            </div>
          </div>

          {/* Attendance Corrections */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>ATTENDANCE CORRECTIONS</span>
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--purple)' }} />
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: stats.pending_attendance_corrections > 0 ? 'var(--purple-text)' : 'var(--text-main)' }}>
                {stats.pending_attendance_corrections}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Direct student-to-teacher requests for missed lectures (bypasses HOD approval).
              </div>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span className="badge badge-default" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)', fontSize: '0.75rem' }}>
                Direct Faculty Discretion
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum & Academic Mapping Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="app-card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Academic Hierarchy Master Data</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-alt)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers className="w-4 h-4 text-primary" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Academic Sections</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{stats.total_sections}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-alt)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen className="w-4 h-4 text-purple" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Curriculum Subjects</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{stats.total_subjects}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-alt)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon className="w-4 h-4 text-success" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Faculty Section Assignments</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{stats.total_teacher_assignments}</span>
            </div>
          </div>
        </div>

        {/* Recent Admin Audit Mini-feed */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title">Recent Administrative Actions</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateTab('audit')}
            >
              View Full Trail
            </button>
          </div>

          {(!auditLogs || auditLogs.length === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem', textAlign: 'center' }}>
              No audit logs recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} style={{
                  padding: '0.625rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8125rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.action}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      By {log.actor_name || 'System'} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="badge badge-default" style={{ fontSize: '0.6875rem' }}>{log.entity_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardOverview;
