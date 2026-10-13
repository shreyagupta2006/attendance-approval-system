import React, { useState, useMemo } from 'react';
import api from '../../../services/api';
import { 
  Users, Search, Power, Shield, ShieldAlert, CheckCircle2, 
  XCircle, Filter, GraduationCap, Briefcase, Award, UserCheck, RefreshCw 
} from 'lucide-react';

const UserAccountManagement = ({ users = [], currentAdminId, onReload, setMessage }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingId, setLoadingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null });

  // Summary counts
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = total - active;
    const students = users.filter((u) => u.role === 'STUDENT').length;
    const teachers = users.filter((u) => u.role === 'TEACHER').length;
    const hods = users.filter((u) => u.role === 'HOD').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { total, active, inactive, students, teachers, hods, admins };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.is_active) return false;
      if (statusFilter === 'INACTIVE' && u.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = u.full_name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchRoll = u.roll_number?.toLowerCase().includes(q);
        const matchEmp = u.employee_id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRoll && !matchEmp) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const handleToggleStatusClick = (u) => {
    if (u.id === currentAdminId && u.is_active) {
      setMessage({ type: 'error', text: 'You cannot deactivate your own administrative account.' });
      return;
    }
    setConfirmModal({ isOpen: true, user: u });
  };

  const handleConfirmToggle = async () => {
    const u = confirmModal.user;
    if (!u) return;

    setLoadingId(u.id);
    const newStatus = !u.is_active;

    try {
      await api.patch(`/admin/users/${u.id}/status`, { is_active: newStatus });
      setMessage({
        type: 'success',
        text: `User ${u.full_name} (${u.email}) successfully ${newStatus ? 'activated' : 'deactivated'}.`
      });
      setConfirmModal({ isOpen: false, user: null });
      if (onReload) onReload();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update user account status'
      });
    } finally {
      setLoadingId(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Shield className="w-3 h-3" /> System Admin
          </span>
        );
      case 'HOD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Award className="w-3 h-3" /> Dept HOD
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Briefcase className="w-3 h-3" /> Faculty
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GraduationCap className="w-3 h-3" /> Student
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-slate-400 font-medium">Total Accounts</p>
          <p className="text-xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-emerald-400 font-medium">Active Accounts</p>
          <p className="text-xl font-bold text-emerald-300 mt-1">{stats.active}</p>
        </div>
        <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-rose-400 font-medium">Deactivated</p>
          <p className="text-xl font-bold text-rose-300 mt-1">{stats.inactive}</p>
        </div>
        <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-purple-400 font-medium">Students</p>
          <p className="text-xl font-bold text-purple-300 mt-1">{stats.students}</p>
        </div>
        <div className="bg-teal-950/20 border border-teal-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-teal-400 font-medium">Faculty</p>
          <p className="text-xl font-bold text-teal-300 mt-1">{stats.teachers}</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-amber-400 font-medium">HODs</p>
          <p className="text-xl font-bold text-amber-300 mt-1">{stats.hods}</p>
        </div>
        <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-3.5 backdrop-blur-sm">
          <p className="text-xs text-rose-400 font-medium">Admins</p>
          <p className="text-xl font-bold text-rose-300 mt-1">{stats.admins}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, roll #, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Faculty</option>
              <option value="HOD">HODs</option>
              <option value="ADMIN">System Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400">
            <UserCheck className="w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>

          <button
            onClick={onReload}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg font-medium transition-colors"
            title="Reload user list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">User Details</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Identifiers</th>
                <th className="px-5 py-3.5">Department / Section</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No user accounts match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === currentAdminId;
                  const isLoading = loadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white flex items-center gap-2">
                          {u.full_name}
                          {isCurrentAdmin && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded px-1.5 py-0.5">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.roll_number && (
                          <div className="text-xs">
                            <span className="text-slate-500">Roll: </span>
                            <span className="font-mono text-slate-200">{u.roll_number}</span>
                          </div>
                        )}
                        {u.employee_id && (
                          <div className="text-xs">
                            <span className="text-slate-500">Emp ID: </span>
                            <span className="font-mono text-slate-200">{u.employee_id}</span>
                          </div>
                        )}
                        {!u.roll_number && !u.employee_id && (
                          <span className="text-xs text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-200">
                          {u.department_name || '—'}
                        </div>
                        {u.section_label && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {u.section_label}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isCurrentAdmin ? (
                          <span className="text-xs text-slate-500 italic" title="Self account cannot be deactivated">
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatusClick(u)}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              u.is_active
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                            title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {isLoading ? 'Updating...' : u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${confirmModal.user.is_active ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {confirmModal.user.is_active ? <ShieldAlert className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {confirmModal.user.is_active ? 'Deactivate Account' : 'Activate Account'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm account status update for {confirmModal.user.full_name}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {confirmModal.user.is_active ? (
                <>
                  Are you sure you want to <strong>deactivate</strong> this account?
                  The user will be immediately logged out and blocked from logging into the portal.
                  <span className="block mt-2 text-xs text-amber-400">
                    All historical applications, approvals, attendance corrections, and audit logs remain fully intact.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to <strong>activate</strong> this account?
                  The user will regain login access immediately using their existing credentials.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, user: null })}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${
                  confirmModal.user.is_active
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {confirmModal.user.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountManagement;
