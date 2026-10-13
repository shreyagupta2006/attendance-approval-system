import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, Lock, Mail, GraduationCap, Shield, UserCheck, Key, AlertCircle, UserPlus, CheckCircle2, User } from 'lucide-react';
import api from '../../services/api';

const Login = () => {
  const { login, registerStudent } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration State
  const [regFullName, setRegFullName] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSectionId, setRegSectionId] = useState('');
  const [sections, setSections] = useState([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch sections for public registration dropdown
    api.get('/auth/public/sections')
      .then(res => setSections(res.data))
      .catch(err => console.error('Failed to load sections', err));
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await registerStudent({
        full_name: regFullName,
        roll_number: regRollNumber,
        email: regEmail,
        password: regPassword,
        section_id: regSectionId || null
      });

      setSuccess('Student account registered successfully! You can now log in.');
      setEmail(regEmail);
      setPassword(regPassword);
      setMode('login');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="auth-page-bg">
      <div className="auth-card">
        
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-circle">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h2 className="auth-title">College Approval Portal</h2>
          <p className="auth-subtitle">Official HOD, Faculty & Student Gateway</p>

          {/* Mode Switcher Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            >
              Student Register
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="auth-body">
          {error && (
            <div className="alert-box alert-danger">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert-box alert-success">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-control-icon-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-control-icon-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block btn-lg mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In to Portal
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Student Registration Form */
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="form-control-icon-wrapper">
                  <User className="input-icon" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Vikram Sharma"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <div className="form-control-icon-wrapper">
                  <GraduationCap className="input-icon" />
                  <input
                    type="text"
                    required
                    value={regRollNumber}
                    onChange={(e) => setRegRollNumber(e.target.value)}
                    placeholder="e.g. 21CSE099"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Section</label>
                <select
                  value={regSectionId}
                  onChange={(e) => setRegSectionId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select Section --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.department_name} (Sem {s.semester} - Sec {s.section_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-control-icon-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-control-icon-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-success btn-block btn-lg mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Register Student Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Selector */}
          <div className="demo-section-divider">
            <div className="demo-section-title">Quick Demo Logins</div>
            
            {/* System Admin Card */}
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@college.edu', 'admin123')}
              className="demo-btn-admin"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.375rem', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--danger-text)' }}>System Admin</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>admin@college.edu • admin123</div>
                </div>
              </div>
              <span className="status-badge badge-rejected" style={{ fontSize: '0.625rem' }}>ADMIN</span>
            </button>

            <div className="demo-grid">
              <button
                type="button"
                onClick={() => handleQuickLogin('rahul.kumar@student.edu', 'student123')}
                className="demo-btn"
              >
                <GraduationCap className="w-4 h-4 text-sky-600 shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)' }}>Student</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Rahul Kumar</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('hod.cse@college.edu', 'hod123')}
                className="demo-btn"
              >
                <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)' }}>HOD CSE</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Dr. Rajesh Gupta</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('prof.sharma@college.edu', 'teacher123')}
                className="demo-btn"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)' }}>Faculty</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Prof. Amit Sharma</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('prof.verma@college.edu', 'teacher123')}
                className="demo-btn"
              >
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-main)' }}>Faculty Sec B</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Prof. Verma</div>
                </div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
