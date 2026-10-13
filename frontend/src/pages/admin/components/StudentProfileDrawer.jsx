import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, BookOpen, Layers, User, Mail, Hash, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

const StudentProfileDrawer = ({ student, isOpen, onClose, onRefreshStudent }) => {
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && student?.student_id) {
      setLoading(true);
      setError('');
      api.get(`/admin/students/${student.student_id}/derived-curriculum`)
        .then((res) => {
          setCurriculum(res.data);
        })
        .catch((err) => {
          console.error(err);
          setError(err.response?.data?.detail || 'Failed to load student curriculum');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setCurriculum(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

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
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>Student Academic Profile</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Curriculum mapping & section enrollment</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Student Identity Card */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{student.full_name}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    Roll: {student.roll_number}
                  </span>
                  <span className={`badge ${student.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {student.is_active ? 'Active Account' : 'Deactivated'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{student.email}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Section Enrollment:</span>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{student.section_label || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          {/* Derived Curriculum Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <BookOpen className="w-4 h-4 text-primary" />
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Derived Curriculum
              </h4>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Curriculum subjects and faculty assignments are inherited automatically from Section {student.section_label || 'assignment'}.
            </p>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading curriculum assignments...
              </div>
            ) : error ? (
              <div className="alert-box alert-danger">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (!curriculum || !curriculum.assigned_subjects || curriculum.assigned_subjects.length === 0) ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface-alt)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)'
              }}>
                <Layers className="w-8 h-8 text-muted mx-auto mb-2" style={{ opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>No Faculty Mappings for this Section</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  This student's section currently has no subjects mapped in the Academic Assignments module.
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="app-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assigned Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curriculum.assigned_subjects.map((sub) => (
                      <tr key={sub.assignment_id}>
                        <td>
                          <strong>{sub.subject_code}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.subject_name}</div>
                        </td>
                        <td>
                          <strong>{sub.teacher_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {sub.teacher_employee_id || '—'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Academic Governance Notice */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #bfdbfe',
            fontSize: '0.8125rem',
            color: '#1e40af'
          }}>
            <strong>Cohort Curriculum Notice:</strong> All students in Section {student.section_label} take these subjects with the assigned faculty above. To change assigned faculty, navigate to the Academic Assignments module. To change this student's schedule, edit their section.
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

export default StudentProfileDrawer;
