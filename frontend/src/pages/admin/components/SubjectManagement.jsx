import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, BookOpen, Search, X } from 'lucide-react';

const SubjectManagement = ({ subjects, departments, assignments, onReload, setMessage }) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modal States
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ code: '', name: '', department_id: '' });

  // Map each subject ID to derived semesters from active assignments
  const derivedSemestersMap = useMemo(() => {
    const map = {};
    (assignments || []).forEach((a) => {
      if (!map[a.subject_id]) {
        map[a.subject_id] = new Set();
      }
      if (a.semester) {
        map[a.subject_id].add(a.semester);
      }
    });
    return map;
  }, [assignments]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      if (deptFilter && sub.department_id !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCode = sub.code?.toLowerCase().includes(q);
        const matchName = sub.name?.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [subjects, deptFilter, search]);

  const handleOpenAdd = () => {
    setForm({
      code: '',
      name: '',
      department_id: departments[0]?.id || ''
    });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (sub) => {
    setForm({
      code: sub.code,
      name: sub.name,
      department_id: sub.department_id
    });
    setModal({ isOpen: true, isEdit: true, data: sub });
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/subjects/${modal.data.id}`, form);
        setMessage({ type: 'success', text: `Subject ${form.code} updated successfully!` });
      } else {
        await api.post('/admin/subjects', form);
        setMessage({ type: 'success', text: `Subject ${form.code} created successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save subject.' });
    }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete subject ${sub.code} (${sub.name})? Blocked if active class assignments or correction records exist.`)) return;

    try {
      await api.delete(`/admin/subjects/${sub.id}`);
      setMessage({ type: 'success', text: `Subject ${sub.code} deleted successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete subject.' });
    }
  };

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Curriculum Subjects Catalog</h3>
          <p className="card-subtitle">Manage curriculum courses and inspect derived cohort semesters</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Add Subject
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
            placeholder="Search subject code, title..."
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
      </div>

      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Department</th>
              <th>Derived Semester</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No subjects found matching selected filters.
                </td>
              </tr>
            ) : (
              filteredSubjects.map((sub) => {
                const sems = derivedSemestersMap[sub.id] ? Array.from(derivedSemestersMap[sub.id]).sort((a, b) => a - b) : [];
                return (
                  <tr key={sub.id}>
                    <td>
                      <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                        {sub.code}
                      </span>
                    </td>
                    <td><strong>{sub.name}</strong></td>
                    <td>{sub.department_name || 'Unassigned'}</td>
                    <td>
                      {sems.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {sems.map((s) => (
                            <span key={s} className="badge badge-default" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
                              Semester {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Not assigned to a semester
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Edit subject"
                          onClick={() => handleOpenEdit(sub)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          title="Delete subject (guarded: blocked if assignments exist)"
                          onClick={() => handleDelete(sub)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Subject Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Subject' : 'Add Curriculum Subject'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Code <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS501"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Management Systems"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Offering Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="form-select"
                  >
                    <option value="">-- Select Department --</option>
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
                  {modal.isEdit ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
