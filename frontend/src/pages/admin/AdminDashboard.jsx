import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, Briefcase, Award,
  Building, Layers, BookOpen, Link as LinkIcon, Shield, RefreshCw,
  AlertCircle, CheckCircle2, X, ShieldAlert
} from 'lucide-react';

// Modular Admin Sub-Components
import DashboardOverview from './components/DashboardOverview';
import StudentManagement from './components/StudentManagement';
import TeacherManagement from './components/TeacherManagement';
import HODManagement from './components/HODManagement';
import AcademicAssignments from './components/AcademicAssignments';
import DepartmentManagement from './components/DepartmentManagement';
import SectionManagement from './components/SectionManagement';
import SubjectManagement from './components/SubjectManagement';
import UserAccountManagement from './components/UserAccountManagement';
import AuditTrailViewer from './components/AuditTrailViewer';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Core Data States
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_hods: 0,
    total_departments: 0,
    total_sections: 0,
    total_subjects: 0,
    total_teacher_assignments: 0,
    pending_hod_approvals: 0,
    applications_awaiting_teacher_ack: 0,
    total_unacknowledged_teacher_slots: 0,
    unassigned_section_warnings: 0,
    pending_attendance_corrections: 0
  });

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [hods, setHods] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Auto-dismiss alert message after 6 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const reloadData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        studentsRes,
        teachersRes,
        hodsRes,
        usersRes,
        departmentsRes,
        sectionsRes,
        subjectsRes,
        assignmentsRes
      ] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/students'),
        api.get('/admin/teachers'),
        api.get('/admin/hods'),
        api.get('/admin/users'),
        api.get('/admin/departments'),
        api.get('/academic/sections'),
        api.get('/academic/subjects'),
        api.get('/admin/assignments')
      ]);

      setStats(statsRes.data);
      setStudents(studentsRes.data);
      setTeachers(teachersRes.data);
      setHods(hodsRes.data);
      setUsers(usersRes.data);
      setDepartments(departmentsRes.data);
      setSections(sectionsRes.data);
      setSubjects(subjectsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (err) {
      console.error('Failed to load admin administration data', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to sync latest administrative data from server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard, count: null },
    { id: 'students', label: 'Students', icon: GraduationCap, count: stats.total_students },
    { id: 'teachers', label: 'Faculty', icon: Briefcase, count: stats.total_teachers },
    { id: 'hods', label: 'Department HODs', icon: Award, count: stats.total_hods },
    { id: 'assignments', label: 'Faculty Assignments', icon: LinkIcon, count: stats.total_teacher_assignments },
    { id: 'departments', label: 'Departments', icon: Building, count: stats.total_departments },
    { id: 'sections', label: 'Sections', icon: Layers, count: stats.total_sections },
    { id: 'subjects', label: 'Curriculum Subjects', icon: BookOpen, count: stats.total_subjects },
    { id: 'users', label: 'User Accounts', icon: Users, count: users.length },
    { id: 'audit', label: 'Audit Trail', icon: Shield, count: null }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Toast Alert Message */}
        {message.text && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border backdrop-blur-md transition-all shadow-lg ${
              message.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-indigo-400" />
              College Administration Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centralized administrative portal for faculty assignments, enrollment, curriculum, and compliance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={reloadData}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm px-4 py-2 rounded-xl font-medium border border-slate-700/60 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="border-b border-slate-800 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1.5 pb-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-indigo-800/80 text-indigo-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Pane */}
        {loading && !students.length ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400">Loading administrative records...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                stats={stats}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onReload={reloadData}
              />
            )}

            {activeTab === 'students' && (
              <StudentManagement
                students={students}
                departments={departments}
                sections={sections}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'teachers' && (
              <TeacherManagement
                teachers={teachers}
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'hods' && (
              <HODManagement
                hods={hods}
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'assignments' && (
              <AcademicAssignments
                assignments={assignments}
                teachers={teachers}
                subjects={subjects}
                sections={sections}
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'departments' && (
              <DepartmentManagement
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'sections' && (
              <SectionManagement
                sections={sections}
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'subjects' && (
              <SubjectManagement
                subjects={subjects}
                departments={departments}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'users' && (
              <UserAccountManagement
                users={users}
                currentAdminId={user?.id}
                onReload={reloadData}
                setMessage={setMessage}
              />
            )}

            {activeTab === 'audit' && (
              <AuditTrailViewer
                setMessage={setMessage}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
