import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, Users, Layers, X, BookOpen } from 'lucide-react';

const SectionManagement = ({ sections, departments, onReload, setMessage }) => {
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  // Modal States
  const [modal, setModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [form, setForm] = useState({ department_id: '', semester: 1, section_name: 'A' });

  // Enrolled Students Modal State
  const [studentModal, setStudentModal] = useState({ isOpen: false, sectionName: '', students: [], loading: false });

  const filteredSections = useMemo(() => {
    return sections.filter((sec) => {
      if (deptFilter && sec.department_id !== deptFilter) return false;
      if (semFilter && sec.semester !== parseInt(semFilter)) return false;
      return true;
    });
  }, [sections, deptFilter, semFilter]);

  const handleOpenAdd = () => {
    setForm({
      department_id: departments[0]?.id || '',
      semester: 5,
      section_name: 'A'
    });
    setModal({ isOpen: true, isEdit: false, data: null });
  };

  const handleOpenEdit = (sec) => {
    setForm({
      department_id: sec.department_id,
      semester: sec.semester,
      section_name: sec.section_name
    });
    setModal({ isOpen: true, isEdit: true, data: sec });
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      if (modal.isEdit) {
        await api.put(`/admin/sections/${modal.data.id}`, form);
        setMessage({ type: 'success', text: `Section updated successfully!` });
      } else {
        await api.post('/admin/sections', form);
        setMessage({ type: 'success', text: `Section ${form.section_name} (Sem ${form.semester}) created successfully!` });
      }
      setModal({ isOpen: false, isEdit: false, data: null });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save section.' });
    }
  };

  const handleDelete = async (sec) => {
    if (!window.confirm(`Are you sure you want to delete Section ${sec.section_name} (Sem ${sec.semester} - ${sec.department_name})? Blocked if enrolled students or assignments exist.`)) return;

    try {
      await api.delete(`/admin/sections/${sec.id}`);
      setMessage({ type: 'success', text: `Section deleted successfully.` });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to delete section.' });
    }
  };

  const handleViewStudents = async (sec) => {
    setStudentModal({ isOpen: true, sectionName: `${sec.department_name} (Sem ${sec.semester} - Sec ${sec.section_name})`, students: [], loading: true });
    try {
      const res = await api.get(`/admin/sections/${sec.id}/students`);
      setStudentModal((prev) => ({ ...prev, students: res.data, loading: false }));
    } catch (err) {
      console.error(err);
      setStudentModal((prev) => ({ ...prev, loading: false }));
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to load section students.' });
    }
  };

  return (
    <div className="app-card">
      <div className="card-header-flex">
        <div>
          <h3 className="card-title">Academic Cohort Sections</h3>
          <p className="card-subtitle">Manage departmental semester sections that serve as the foundation for cohort curricula</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        padding: '1rem',
        backgroundColor: 'var(--surface-alt)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap'
      }}>
        <div style={{ minWidth: '200px' }}>
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

        <div style={{ minWidth: '160px' }}>
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
      </div>

      <div className="table-responsive">
        <table className="app-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Semester</th>
              <th>Section Name</th>
              <th>Enrolled Cohort</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No sections found matching selected filters.
                </td>
              </tr>
            ) : (
              filteredSections.map((sec) => (
                <tr key={sec.id}>
                  <td><strong>{sec.department_name}</strong></td>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--surface-alt)' }}>
                      Semester {sec.semester}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-default" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                      Section {sec.section_name}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleViewStudents(sec)}
                    >
                      <Users className="w-3.5 h-3.5" /> View Students
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        title="Edit section"
                        onClick={() => handleOpenEdit(sec)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        title="Delete section (guarded: blocked if students or assignments exist)"
                        onClick={() => handleDelete(sec)}
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

      {/* Add / Edit Section Modal */}
      {modal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">{modal.isEdit ? 'Edit Section' : 'Create Academic Section'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSection}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Department <span style={{ color: 'var(--danger)' }}>*</span></label>
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

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Semester Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) || 1 })}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section Name (e.g. A, B, C) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A"
                      value={form.section_name}
                      onChange={(e) => setForm({ ...form, section_name: e.target.value.toUpperCase() })}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal({ isOpen: false, isEdit: false, data: null })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modal.isEdit ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrolled Students Modal */}
      {studentModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Enrolled Students</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{studentModal.sectionName}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setStudentModal({ isOpen: false, sectionName: '', students: [], loading: false })}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {studentModal.loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading students...</div>
              ) : studentModal.students.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No students currently enrolled in this section.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="app-table" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Email Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentModal.students.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.roll_number}</strong></td>
                          <td>{s.full_name}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                          <td>
                            <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem' }}>
                              {s.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setStudentModal({ isOpen: false, sectionName: '', students: [], loading: false })}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionManagement;
