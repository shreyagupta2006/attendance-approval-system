import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { Plus, Search, Edit2, Trash2, Power, BookOpen, UserCheck, X } from 'lucide-react';
import TeacherProfileDrawer from './TeacherProfileDrawer';

const TeacherManagement = ({ teachers, departments, onReload, setMessage }) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer & Modal States
  const [drawerTeacher, setDrawerTeacher] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ name: '', email: '', password: '', employee_id: '', department_id: '' });

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (statusFilter === 'ACTIVE' && !t.is_active) return false;
      if (statusFilter === 'INACTIVE' && t.is_active) return false;
      if (deptFilter && t.department_id !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = t.full_name?.toLowerCase().includes(q);
        const matchEmail = t.email?.toLowerCase().includes(q);
        const matchEmp = t.employee_id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchEmp) return false;
      }
      return true;
    });
  }, [teachers, search, deptFilter, statusFilter]);

  const handleOpenAdd = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      employee_id: '',
      department_id: departments[0]?.id || ''
    });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (t) => {
    setForm({
      name: t.full_name,
      email: t.email,
      password: '',
      employee_id: t.employee_id,
      department_id: t.department_id || ''
    });
    setModal({ isOpen: true, isEdit: true, data: t });
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/teachers/${modal.data.teacher_id}`, {
          full_name: form.name,
          email: form.email,
          employee_id: form.employee_id,
          department_id: form.department_id || null
        });
        setMessage({ type: 'success', text: `Faculty member ${form.name} updated successfully!` });
      } else {
        await api.post('/admin/teachers', {
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: 'TEACHER',
          employee_id: form.employee_id,
          department_id: form.department_id || null
        });
        setMessage({ type: 'success', text: `New faculty member ${form.name} added successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save faculty record.' });
    }
  };

  const handleToggleStatus = async (teacher) => {
    const newStatus = !teacher.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionWord} account for ${teacher.full_name}?`)) return;

    try {
      await api.patch(`/admin/users/${teacher.id}/status`, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `Faculty member ${teacher.full_name} is now ${newStatus ? 'Active' : 'Deactivated'}. Historical teaching records remain preserved.`
      });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update account status.' });
    }
  };

  const handleDelete = async (teacher) => {
    if (!window.confirm(`Are you sure you want to delete ${teacher.full_name}? Deletion is guarded and will be blocked if active teaching assignments exist.`)) return;

    try {
      await api.delete(`/admin/teachers/${teacher.teacher_id}`);
      setMessage({ type: 'success', text: `Teacher ${teacher.full_name} deleted successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete teacher.' });
    }
  };

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Faculty Members Directory</h3>
          <p className="card-subtitle">Manage faculty accounts, employee identifiers, and view active teaching loads</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Add Faculty Member
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            placeholder="Search name, employee ID, email..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Faculty Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Faculty Name</th>
              <th>Employee ID</th>
              <th>Email Address</th>
              <th>Department</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No faculty members match the selected filters or search query.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((t) => (
                <tr key={t.teacher_id} style={{ opacity: t.is_active ? 1 : 0.75 }}>
                  <td><strong>{t.full_name}</strong></td>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--surface-alt)' }}>
                      {t.employee_id}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t.email}</td>
                  <td>
                    {t.department_name ? (
                      <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {t.department_name}
                      </span>
                    ) : (
                      <span className="badge badge-default" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${t.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem' }}>
                      {t.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="View active teaching load & assignments"
                        onClick={() => setDrawerTeacher(t)}
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Teaching Load
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Edit faculty member details"
                        onClick={() => handleOpenEdit(t)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className={`btn btn-sm ${t.is_active ? 'btn-outline' : 'btn-success'}`}
                        style={{ color: t.is_active ? 'var(--warning-text)' : '#ffffff' }}
                        title={t.is_active ? 'Deactivate account (preserves historical teaching records)' : 'Reactivate account'}
                        onClick={() => handleToggleStatus(t)}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Delete teacher (guarded: blocked if teaching assignments exist)"
                        onClick={() => handleDelete(t)}
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

      {/* Teacher Profile Drawer */}
      <TeacherProfileDrawer
        teacher={drawerTeacher}
        isOpen={Boolean(drawerTeacher)}
        onClose={() => setDrawerTeacher(null)}
      />

      {/* Add / Edit Teacher Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Faculty Member' : 'Add New Faculty Member'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeacher}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. Prof. Amit Sharma"
                  />
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Employee ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      required
                      value={form.employee_id}
                      onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                      className="form-control"
                      placeholder="e.g. EMP-CSE-001"
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
                      placeholder="prof.sharma@college.edu"
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

                <div className="form-group">
                  <label className="form-label">Department Affiliation</label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modal.isEdit ? 'Save Changes' : 'Create Faculty Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
