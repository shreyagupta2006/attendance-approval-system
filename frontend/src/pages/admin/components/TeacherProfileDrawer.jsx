import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, BookOpen, Layers, UserCheck, AlertCircle } from 'lucide-react';

const TeacherProfileDrawer = ({ teacher, isOpen, onClose }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && teacher?.teacher_id) {
      setLoading(true);
      setError('');
      api.get(`/admin/teachers/${teacher.teacher_id}/assignments`)
        .then((res) => {
          setAssignments(res.data);
        })
        .catch((err) => {
          console.error(err);
          setError(err.response?.data?.detail || 'Failed to load teacher assignments');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAssignments([]);
    }
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  return (
    <div className="modal-backdrop" style={{ justifyContent: 'flex-end', animation: 'fadeIn 0.15s ease' }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        height: '100vh',
        backgroundColor: 'var(--surface)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-alt)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>Faculty Teaching Profile</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Assigned classes, sections, and subjects</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Teacher Identity Card */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{teacher.full_name}</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge-default" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                Emp ID: {teacher.employee_id}
              </span>
              <span className={`badge ${teacher.is_active ? 'badge-success' : 'badge-danger'}`}>
                {teacher.is_active ? 'Active Faculty' : 'Deactivated'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{teacher.email}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{teacher.department_name || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          {/* Teaching Load Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <BookOpen className="w-4 h-4 text-primary" />
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Active Teaching Assignments ({assignments.length})
              </h4>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Subject courses and department sections this faculty member is currently authorized to teach and acknowledge.
            </p>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading teaching assignments...
              </div>
            ) : error ? (
              <div className="alert-box alert-danger">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : assignments.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface-alt)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)'
              }}>
                <Layers className="w-8 h-8 text-muted mx-auto mb-2" style={{ opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>No Active Teaching Assignments</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  This faculty member currently has zero class sections mapped in the Academic Assignments module.
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="app-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Class Section</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((asgn) => (
                      <tr key={asgn.id}>
                        <td>
                          <strong>{asgn.subject_code}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asgn.subject_name}</div>
                        </td>
                        <td>
                          <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                            Sem {asgn.semester} - Sec {asgn.section_name}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{asgn.department_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--surface-alt)'
        }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfileDrawer;
