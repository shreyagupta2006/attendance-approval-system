import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, Link as LinkIcon, AlertCircle, CheckCircle2, UserCheck, X } from 'lucide-react';

const AcademicAssignments = ({
  assignments,
  departments,
  sections,
  subjects,
  teachers,
  onReload,
  setMessage
}) => {
  // Filters
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reassignModal, setReassignModal] = useState({ isOpen: false, assignment: null, newTeacherId: '' });

  // Add Assignment Form State (Cascading)
  const [addForm, setAddForm] = useState({
    department_id: '',
    semester: '',
    section_id: '',
    subject_id: '',
    teacher_id: ''
  });

  // Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a) => {
      if (deptFilter && a.department_id !== deptFilter) return false;
      if (semFilter && a.semester !== parseInt(semFilter)) return false;
      if (secFilter && a.section_id !== secFilter) return false;
      if (teacherFilter && a.teacher_id !== teacherFilter) return false;
      return true;
    });
  }, [assignments, deptFilter, semFilter, secFilter, teacherFilter]);

  // Cascading options for Add Modal
  const availableSemesters = useMemo(() => {
    if (!addForm.department_id) return [1, 2, 3, 4, 5, 6, 7, 8];
    const deptSecs = sections.filter((s) => s.department_id === addForm.department_id);
    const sems = Array.from(new Set(deptSecs.map((s) => s.semester))).sort((a, b) => a - b);
    return sems.length > 0 ? sems : [1, 2, 3, 4, 5, 6, 7, 8];
  }, [sections, addForm.department_id]);

  const availableSections = useMemo(() => {
    return sections.filter((s) => {
      if (addForm.department_id && s.department_id !== addForm.department_id) return false;
      if (addForm.semester && s.semester !== parseInt(addForm.semester)) return false;
      return true;
    });
  }, [sections, addForm.department_id, addForm.semester]);

  const availableSubjects = useMemo(() => {
    if (!addForm.department_id) return subjects;
    return subjects.filter((s) => s.department_id === addForm.department_id);
  }, [subjects, addForm.department_id]);

  const availableTeachers = useMemo(() => {
    // Only active teachers
    return (teachers || []).filter((t) => t.is_active);
  }, [teachers]);

  const handleOpenAdd = () => {
    const initialDept = departments[0]?.id || '';
    setAddForm({
      department_id: initialDept,
      semester: '',
      section_id: '',
      subject_id: '',
      teacher_id: ''
    });
    setAddModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!addForm.section_id || !addForm.subject_id || !addForm.teacher_id) {
      setMessage({ type: 'error', text: 'Please select a section, subject, and faculty member.' });
      return;
    }

    try {
      await api.post('/admin/assignments', {
        teacher_id: addForm.teacher_id,
        subject_id: addForm.subject_id,
        section_id: addForm.section_id
      });
      setMessage({ type: 'success', text: 'Faculty subject assignment mapped successfully!' });
      setAddModalOpen(false);
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to map assignment.' });
    }
  };

  const handleOpenReassign = (asgn) => {
    setReassignModal({
      isOpen: true,
      assignment: asgn,
      newTeacherId: asgn.teacher_id
    });
  };

  const handleSaveReassign = async (e) => {
    e.preventDefault();
    if (!reassignModal.newTeacherId) return;

    try {
      await api.put(`/admin/assignments/${reassignModal.assignment.id}`, {
        teacher_id: reassignModal.newTeacherId
      });
      setMessage({
        type: 'success',
        text: `Faculty reassigned successfully for ${reassignModal.assignment.subject_code} (Section ${reassignModal.assignment.section_name})!`
      });
      setReassignModal({ isOpen: false, assignment: null, newTeacherId: '' });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to reassign faculty.' });
    }
  };

  const handleDelete = async (asgn) => {
    if (!window.confirm(`Are you sure you want to remove the assignment for ${asgn.subject_code} in Section ${asgn.section_name}? Historical acknowledgements will be preserved.`)) return;

    try {
      await api.delete(`/admin/assignments/${asgn.id}`);
      setMessage({ type: 'success', text: 'Assignment removed successfully.' });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to remove assignment.' });
    }
  };

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Academic Assignments & Faculty Mapping</h3>
          <p className="card-subtitle">
            Map faculty members to teach subjects for cohort sections. Student curricula and teacher leave-acknowledgement routing are derived directly from these assignments.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Map New Assignment
        </button>
      </div>

      {/* Policy Notice */}
      <div style={{
        padding: '0.875rem 1rem',
        backgroundColor: 'var(--primary-light)',
        border: '1px solid var(--primary-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.25rem',
        fontSize: '0.8125rem',
        color: 'var(--primary-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <LinkIcon className="w-4 h-4 shrink-0" />
        <span>
          <strong>Single-Faculty Policy:</strong> Exactly one faculty member is assigned per subject per section. Reassigning a teacher automatically transfers application acknowledgement rights for that section while preserving historical sign-off records.
        </span>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        padding: '1rem',
        backgroundColor: 'var(--surface-alt)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <div>
          <select
            className="form-select"
            style={{ height: '2.375rem', fontSize: '0.8125rem' }}
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setSecFilter('');
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="form-select"
            style={{ height: '2.375rem', fontSize: '0.8125rem' }}
            value={semFilter}
            onChange={(e) => {
              setSemFilter(e.target.value);
              setSecFilter('');
            }}
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="form-select"
            style={{ height: '2.375rem', fontSize: '0.8125rem' }}
            value={secFilter}
            onChange={(e) => setSecFilter(e.target.value)}
          >
            <option value="">All Sections</option>
            {sections
              .filter((sec) => !deptFilter || sec.department_id === deptFilter)
              .filter((sec) => !semFilter || sec.semester === parseInt(semFilter))
              .map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.department_code} Sem {sec.semester} - Sec {sec.section_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <select
            className="form-select"
            style={{ height: '2.375rem', fontSize: '0.8125rem' }}
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="">All Faculty</option>
            {teachers.map((t) => (
              <option key={t.teacher_id} value={t.teacher_id}>{t.full_name} ({t.employee_id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Curriculum Subject</th>
              <th>Class Section</th>
              <th>Department</th>
              <th>Assigned Faculty Member</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No academic assignments found matching selected filters.
                </td>
              </tr>
            ) : (
              filteredAssignments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.subject_code}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.subject_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      Sem {a.semester} - Section {a.section_name}
                    </span>
                  </td>
                  <td>{a.department_name}</td>
                  <td>
                    <strong>{a.teacher_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {a.teacher_employee_id}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Reassign faculty for this class"
                        onClick={() => handleOpenReassign(a)}
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Reassign
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Remove assignment"
                        onClick={() => handleDelete(a)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Map New Assignment Modal (Cascading) */}
      {addModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Map Faculty Subject Assignment</h3>
              <button type="button" className="modal-close-btn" onClick={() => setAddModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAdd}>
              <div className="modal-body">
                {/* 1. Department */}
                <div className="form-group">
                  <label className="form-label">1. Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={addForm.department_id}
                    onChange={(e) => {
                      setAddForm({
                        ...addForm,
                        department_id: e.target.value,
                        semester: '',
                        section_id: '',
                        subject_id: ''
                      });
                    }}
                    className="form-select"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Semester & Section */}
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">2. Semester</label>
                    <select
                      value={addForm.semester}
                      onChange={(e) => {
                        setAddForm({ ...addForm, semester: e.target.value, section_id: '' });
                      }}
                      className="form-select"
                    >
                      <option value="">-- All / Filter --</option>
                      {availableSemesters.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">3. Target Section <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      required
                      value={addForm.section_id}
                      onChange={(e) => setAddForm({ ...addForm, section_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">-- Select Section --</option>
                      {availableSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Sem {sec.semester} - Section {sec.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Subject */}
                <div className="form-group">
                  <label className="form-label">4. Curriculum Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={addForm.subject_id}
                    onChange={(e) => setAddForm({ ...addForm, subject_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Select Subject --</option>
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Faculty */}
                <div className="form-group">
                  <label className="form-label">5. Assigned Faculty Member <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={addForm.teacher_id}
                    onChange={(e) => setAddForm({ ...addForm, teacher_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Select Active Faculty --</option>
                    {availableTeachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>
                        {t.full_name} ({t.employee_id}) — {t.department_name || 'General'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Faculty Modal */}
      {reassignModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Reassign Class Faculty</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {reassignModal.assignment?.subject_code} ({reassignModal.assignment?.subject_name}) — Section {reassignModal.assignment?.section_name}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setReassignModal({ isOpen: false, assignment: null, newTeacherId: '' })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveReassign}>
              <div className="modal-body">
                <div style={{
                  padding: '0.875rem',
                  backgroundColor: 'var(--surface-alt)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.8125rem'
                }}>
                  <div style={{ color: 'var(--text-muted)' }}>Currently Assigned:</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.125rem' }}>
                    {reassignModal.assignment?.teacher_name} ({reassignModal.assignment?.teacher_employee_id})
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Faculty Member <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={reassignModal.newTeacherId}
                    onChange={(e) => setReassignModal({ ...reassignModal, newTeacherId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Select Alternate Faculty --</option>
                    {availableTeachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>
                        {t.full_name} ({t.employee_id}) — {t.department_name || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ℹ️ Note: Any applications already acknowledged by the previous faculty member retain their verified sign-off record. New and pending applications will route to the newly assigned teacher.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setReassignModal({ isOpen: false, assignment: null, newTeacherId: '' })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicAssignments;
