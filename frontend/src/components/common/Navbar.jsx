import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, GraduationCap, Shield, UserCheck, BookOpen, Check } from 'lucide-react';
import api from '../../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // refresh every 15 sec
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n) => {
    await markSingleRead(n.id);
    setShowNotifications(false);
    window.dispatchEvent(new CustomEvent('refresh-dashboard'));
    if (user?.role === 'HOD') {
      navigate('/hod');
    } else if (user?.role === 'TEACHER') {
      navigate('/teacher');
    } else if (user?.role === 'STUDENT') {
      navigate('/student');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'STUDENT':
        return <span className="status-badge badge-submitted"><GraduationCap className="w-3 h-3" /> Student</span>;
      case 'HOD':
        return <span className="status-badge badge-default" style={{ background: 'var(--purple-bg)', color: 'var(--purple-text)', borderColor: 'var(--purple-border)' }}><Shield className="w-3 h-3" /> HOD</span>;
      case 'TEACHER':
        return <span className="status-badge badge-approved"><UserCheck className="w-3 h-3" /> Faculty</span>;
      case 'ADMIN':
        return <span className="status-badge badge-rejected"><Shield className="w-3 h-3" /> Admin</span>;
      default:
        return null;
    }
  };

  return (
    <header className="navbar-header" style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="app-container" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 4px rgba(37,99,235,0.25)' }}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>Attendance Approval System</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Centralized HOD & Faculty Workflow</p>
          </div>
        </div>

        {/* Right User Bar */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-ghost"
                style={{ padding: '0.5rem', position: 'relative' }}
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '2px', right: '2px', width: '1.25rem', height: '1.25rem', background: 'var(--danger)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', right: 0, marginTop: '0.5rem', width: '22rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-alt)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', textAlign: 'center', padding: '1.5rem' }}>No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          style={{
                            padding: '0.875rem 1rem',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: !n.is_read ? 'var(--primary-light)' : 'var(--surface)',
                            transition: 'var(--transition)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>{n.title}</h4>
                            {!n.is_read && <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }} />}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{n.message}</p>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.375rem', display: 'block' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingLeft: '0.875rem', borderLeft: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>{user.full_name}</div>
                <div style={{ marginTop: '0.25rem' }}>{getRoleBadge(user.role)}</div>
              </div>
              
              <button
                onClick={logout}
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;
