import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineViewGrid,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineChartSquareBar,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineSun,
  HiOutlineMoon
} from 'react-icons/hi';
import { useState, useEffect } from 'react';

const allNavItems = [
  { path: '/', icon: HiOutlineViewGrid, label: 'Dashboard', roles: ['Admin', 'Manager', 'Employee'] },
  { path: '/employees', icon: HiOutlineUsers, label: 'Employees', roles: ['Admin'] },
  { path: '/team', icon: HiOutlineUsers, label: 'Team Members', roles: ['Manager'] },
  { path: '/leaves', icon: HiOutlineCalendar, label: 'Leaves', roles: ['Admin'] },
  { path: '/leave-requests', icon: HiOutlineCalendar, label: 'Leave Requests', roles: ['Manager'] },
  { path: '/my-leaves', icon: HiOutlineCalendar, label: 'My Leaves', roles: ['Employee'] },
  { path: '/tasks', icon: HiOutlineClipboardList, label: 'Tasks', roles: ['Admin', 'Manager'] },
  { path: '/my-tasks', icon: HiOutlineClipboardList, label: 'My Tasks', roles: ['Employee'] },
  { path: '/attendance', icon: HiOutlineClock, label: 'Attendance', roles: ['Admin', 'Employee'] },
  { path: '/analytics', icon: HiOutlineChartSquareBar, label: 'Analytics', roles: ['Admin'] },
];

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = allNavItems.filter((item) => item.roles.includes(user?.role));

  const roleBadge = () => {
    switch (user?.role) {
      case 'Admin': return 'Administrator';
      case 'Manager': return 'Manager';
      case 'Employee': return 'Employee';
      default: return 'User';
    }
  };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="logo">
            <div className="logo-main">
              <img src="/provicore.png" alt="ProviCore" className="logo-icon" />
              <span className="logo-text">ProviCore</span>
            </div>
            <span className="logo-tagline">Smart Workforce Management Platform</span>
          </NavLink>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <HiOutlineX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.username || 'User')}&background=random`} alt="Avatar" style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || user?.username}</span>
              <span className="user-role">{roleBadge()}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <HiOutlineLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <HiOutlineMenu />
          </button>
          <div className="topbar-right">
            <button 
              className="btn-icon" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              title="Toggle Theme"
              style={{ marginRight: '1rem' }}
            >
              {isDarkMode ? <HiOutlineSun /> : <HiOutlineMoon />}
            </button>
            <span className="greeting">
              Welcome back, <strong>{user?.name || user?.username}</strong>
            </span>
            <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
          </div>
        </header>
        <div className="page-content">{children}</div>
        <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto' }}>
          &copy; 2026 ProviCore EMS &ndash; Workforce Management Platform
        </footer>
      </main>
    </div>
  );
}
