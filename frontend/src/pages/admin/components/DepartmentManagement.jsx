import React, { useState } from 'react';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, Building, Layers, BookOpen, UserCheck, X } from 'lucide-react';

const DepartmentManagement = ({ departments, onReload, setMessage }) => {
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ code: '', name: '' });

  const handleOpenAdd = () => {
    setForm({ code: '', name: '' });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (d) => {
    setForm({ code: d.code, name: d.name });
    setModal({ isOpen: true, isEdit: true, data: d });
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/departments/${modal.data.id}`, form);
        setMessage({ type: 'success', text: `Department ${form.code} updated successfully!` });
      } else {
        await api.post('/admin/departments', form);
        setMessage({ type: 'success', text: `Department ${form.code} created successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save department.' });
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department ${dept.code} (${dept.name})? Deletion is strictly guarded and will be blocked if active sections, subjects, or faculty exist.`)) return;

    try {
      await api.delete(`/admin/departments/${dept.id}`);
      setMessage({ type: 'success', text: `Department ${dept.code} deleted successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete department.' });
    }
  };

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">College Academic Departments</h3>
          <p className="card-subtitle">Manage degree programs and monitor department-level academic infrastructure</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Department Full Name</th>
              <th>Assigned HOD</th>
              <th>Sections</th>
              <th>Subjects</th>
              <th>Faculty</th>
              <th>Enrolled Students</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No departments created yet.
                </td>
              </tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                      {d.code}
                    </span>
                  </td>
                  <td><strong>{d.name}</strong></td>
                  <td>
                    {d.hod_name ? (
                      <span className="badge badge-default" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
                        {d.hod_name}
                      </span>
                    ) : (
                      <span className="badge badge-default" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>{d.section_count ?? '—'}</td>
                  <td>{d.subject_count ?? '—'}</td>
                  <td>{d.teacher_count ?? '—'}</td>
                  <td>{d.student_count ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Edit department code or name"
                        onClick={() => handleOpenEdit(d)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Delete department (guarded: blocked if dependent records exist)"
                        onClick={() => handleDelete(d)}
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

      {/* Add / Edit Department Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Department' : 'Create New Department'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Department Code <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE, ECE, MECH"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science & Engineering"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modal.isEdit ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
