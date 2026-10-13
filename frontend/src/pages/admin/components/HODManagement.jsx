import React, { useState } from 'react';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, Power, Shield, AlertTriangle, X } from 'lucide-react';

const HODManagement = ({ hods, departments, onReload, setMessage }) => {
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ name: '', email: '', password: '', department_id: '' });

  const handleOpenAdd = () => {
    // Select first department that doesn't have an HOD yet, or first department
    const existingHodDeptIds = new Set(hods.map((h) => h.department_id).filter(Boolean));
    const unassignedDept = departments.find((d) => !existingHodDeptIds.has(d.id));
    setForm({
      name: '',
      email: '',
      password: '',
      department_id: unassignedDept?.id || departments[0]?.id || ''
    });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (h) => {
    setForm({
      name: h.full_name,
      email: h.email,
      password: '',
      department_id: h.department_id || ''
    });
    setModal({ isOpen: true, isEdit: true, data: h });
  };

  const handleSaveHOD = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/hods/${modal.data.hod_id}`, {
          full_name: form.name,
          email: form.email,
          department_id: form.department_id
        });
        setMessage({ type: 'success', text: `HOD ${form.name} updated successfully!` });
      } else {
        await api.post('/admin/hods', {
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: 'HOD',
          department_id: form.department_id
        });
        setMessage({ type: 'success', text: `HOD ${form.name} assigned to department successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save HOD.' });
    }
  };

  const handleToggleStatus = async (hod) => {
    const newStatus = !hod.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionWord} HOD account for ${hod.full_name}?`)) return;

    try {
      await api.patch(`/admin/users/${hod.id}/status`, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `HOD ${hod.full_name} is now ${newStatus ? 'Active' : 'Deactivated'}. Historical approval records remain preserved.`
      });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update account status.' });
    }
  };

  const handleDelete = async (hod) => {
    if (!window.confirm(`Are you sure you want to remove HOD ${hod.full_name}? Deletion will be blocked if historical approvals exist.`)) return;

    try {
      await api.delete(`/admin/hods/${hod.hod_id}`);
      setMessage({ type: 'success', text: `HOD ${hod.full_name} removed successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete HOD.' });
    }
  };

  // Check if selected department already has an HOD in modal
  const selectedDeptExistingHod = hods.find(
    (h) => h.department_id === form.department_id && (!modal.isEdit || h.hod_id !== modal.data?.hod_id)
  );

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Head of Department (HOD) Governance</h3>
          <p className="card-subtitle">Manage departmental leadership authorized to review and approve leave applications</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Assign Department HOD
        </button>
      </div>

      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>HOD Name</th>
              <th>Email Address</th>
              <th>Assigned Department</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hods.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No HOD accounts configured yet.
                </td>
              </tr>
            ) : (
              hods.map((h) => (
                <tr key={h.hod_id} style={{ opacity: h.is_active ? 1 : 0.75 }}>
                  <td><strong>{h.full_name}</strong></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{h.email}</td>
                  <td>
                    {h.department_name ? (
                      <span className="badge badge-default" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)' }}>
                        {h.department_name}
                      </span>
                    ) : (
                      <span className="badge badge-default" style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${h.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem' }}>
                      {h.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Edit HOD details"
                        onClick={() => handleOpenEdit(h)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className={`btn btn-sm ${h.is_active ? 'btn-outline' : 'btn-success'}`}
                        style={{ color: h.is_active ? 'var(--warning-text)' : '#ffffff' }}
                        title={h.is_active ? 'Deactivate HOD (preserves historical approvals)' : 'Reactivate HOD'}
                        onClick={() => handleToggleStatus(h)}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Delete HOD (guarded: blocked if historical approval records exist)"
                        onClick={() => handleDelete(h)}
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

      {/* Add / Edit HOD Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Department HOD' : 'Assign Department HOD'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveHOD}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">HOD Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. Dr. Rajesh Gupta"
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
                    placeholder="hod.cse@college.edu"
                  />
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
                  <label className="form-label">Assigned Department <span style={{ color: 'var(--danger)' }}>*</span></label>
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

                {selectedDeptExistingHod && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#92400e'
                  }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                    <span>
                      <strong>Conflict Warning:</strong> {selectedDeptExistingHod.full_name} is already assigned as HOD for this department. Each department can have only one active HOD.
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={Boolean(selectedDeptExistingHod)}
                >
                  {modal.isEdit ? 'Save Changes' : 'Assign HOD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODManagement;
