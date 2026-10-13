import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { Plus, Search, Edit2, Trash2, Power, BookOpen, UserCheck, ShieldAlert, X } from 'lucide-react';
import StudentProfileDrawer from './StudentProfileDrawer';

const StudentManagement = ({ students, departments, sections, onReload, setMessage }) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer & Modal States
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ name: '', email: '', password: '', roll_number: '', section_id: '' });
  const [modalDeptId, setModalDeptId] = useState('');

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === 'ACTIVE' && !s.is_active) return false;
      if (statusFilter === 'INACTIVE' && s.is_active) return false;
      if (deptFilter && s.department_id !== deptFilter) return false;
      if (semFilter && s.semester !== parseInt(semFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = s.full_name?.toLowerCase().includes(q);
        const matchEmail = s.email?.toLowerCase().includes(q);
        const matchRoll = s.roll_number?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRoll) return false;
      }
      return true;
    });
  }, [students, search, deptFilter, semFilter, statusFilter]);

  // Sections filtered by selected department in Add/Edit modal
  const modalAvailableSections = useMemo(() => {
    if (!modalDeptId) return sections;
    return sections.filter((sec) => sec.department_id === modalDeptId);
  }, [sections, modalDeptId]);

  const handleOpenAdd = () => {
    const initialDept = departments[0]?.id || '';
    setModalDeptId(initialDept);
    const initialSec = sections.find((sec) => sec.department_id === initialDept)?.id || sections[0]?.id || '';
    setForm({ name: '', email: '', password: '', roll_number: '', section_id: initialSec });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (s) => {
    const currentSec = sections.find((sec) => sec.id === s.section_id);
    setModalDeptId(currentSec?.department_id || s.department_id || '');
    setForm({
      name: s.full_name,
      email: s.email,
      password: '',
      roll_number: s.roll_number,
      section_id: s.section_id || ''
    });
    setModal({ isOpen: true, isEdit: true, data: s });
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/students/${modal.data.student_id}`, {
          full_name: form.name,
          email: form.email,
          roll_number: form.roll_number,
          section_id: form.section_id || null
        });
        setMessage({ type: 'success', text: `Student ${form.name} updated successfully!` });
      } else {
        await api.post('/admin/students', {
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: 'STUDENT',
          roll_number: form.roll_number,
          section_id: form.section_id || null
        });
        setMessage({ type: 'success', text: `New student ${form.name} enrolled successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save student record.' });
    }
  };

  const handleToggleStatus = async (student) => {
    const newStatus = !student.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionWord} account for ${student.full_name}?`)) return;

    try {
      await api.patch(`/admin/users/${student.id}/status`, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `Student ${student.full_name} is now ${newStatus ? 'Active' : 'Deactivated'}. Historical records remain preserved.`
      });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update account status.' });
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to permanently delete student ${student.full_name}? If they have leave applications, deletion will be blocked to preserve records.`)) return;

    try {
      await api.delete(`/admin/students/${student.student_id}`);
      setMessage({ type: 'success', text: `Student ${student.full_name} removed successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete student.' });
    }
  };

  return (
    <div className="app-card">
      {/* Header with Title and Add Button */}
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Student Directory & Academic Enrollment</h3>
          <p className="card-subtitle">Manage student enrollment, section assignments, and view derived course curricula</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Filter and Search Bar */}
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
        <div style={{ position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search name, roll, email..."
            className="form-control"
            style={{ paddingLeft: '2.25rem', height: '2.375rem', fontSize: '0.8125rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="form-select"
            style={{ height: '2.375rem', fontSize: '0.8125rem' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
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
            onChange={(e) => setSemFilter(e.target.value)}
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>Email Address</th>
              <th>Section Assignment</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No students match the selected filters or search query.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s.student_id} style={{ opacity: s.is_active ? 1 : 0.75 }}>
                  <td>
                    <strong>{s.full_name}</strong>
                  </td>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--surface-alt)' }}>
                      {s.roll_number}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.email}</td>
                  <td>
                    {s.section_label ? (
                      <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {s.section_label}
                      </span>
                    ) : (
                      <span className="badge badge-default" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem' }}>
                      {s.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="View derived curriculum and assigned faculty"
                        onClick={() => setDrawerStudent(s)}
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Curriculum
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Edit student details"
                        onClick={() => handleOpenEdit(s)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className={`btn btn-sm ${s.is_active ? 'btn-outline' : 'btn-success'}`}
                        style={{ color: s.is_active ? 'var(--warning-text)' : '#ffffff' }}
                        title={s.is_active ? 'Deactivate account (preserves historical applications)' : 'Reactivate account'}
                        onClick={() => handleToggleStatus(s)}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Delete student (guarded: blocked if historical records exist)"
                        onClick={() => handleDelete(s)}
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

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        student={drawerStudent}
        isOpen={Boolean(drawerStudent)}
        onClose={() => setDrawerStudent(null)}
        onRefreshStudent={onReload}
      />

      {/* Add / Edit Student Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Student Record' : 'Enroll New Student'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Roll Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      required
                      value={form.roll_number}
                      onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                      className="form-control"
                      placeholder="e.g. 21CSE045"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="form-control"
                      placeholder="student@college.edu"
                    />
                  </div>
                </div>

                {!modal.isEdit && (
                  <div className="form-group">
                    <label className="form-label">Initial Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="form-control"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      value={modalDeptId}
                      onChange={(e) => {
                        setModalDeptId(e.target.value);
                        const compatibleSec = sections.find((sec) => sec.department_id === e.target.value);
                        setForm({ ...form, section_id: compatibleSec?.id || '' });
                      }}
                      className="form-select"
                    >
                      <option value="">-- All / Filter Sections --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Academic Section</label>
                    <select
                      value={form.section_id}
                      onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">-- Unassigned --</option>
                      {modalAvailableSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.department_name} (Sem {sec.semester} - Section {sec.section_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  ℹ️ Students assigned to a section automatically inherit that section's curriculum subjects and faculty members.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modal.isEdit ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
