import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import {
  HiOutlineUsers, HiOutlineCalendar, HiOutlineClipboardList,
  HiOutlineClock, HiOutlineShieldCheck, HiOutlineUserGroup
} from 'react-icons/hi';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const role = user?.role;

  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/');
      setStats(res.data);
      if (role === 'Admin') {
        const logsRes = await api.get('/activity-logs/');
        setActivityLogs(logsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const renderDashboard = () => {
    if (role === 'Employee') {
      return (
        <>
          <div className="page-header">
            <h1>Welcome back 👋</h1>
            <p>Here is your personal overview today.</p>
          </div>
          <div className="stats-grid">
            <StatCard icon={<HiOutlineClipboardList />} label="My Tasks" value={stats?.my_tasks ?? 0} color="var(--primary)" />
            <StatCard icon={<HiOutlineCalendar />} label="My Leave Requests" value={stats?.my_leave_requests ?? 0} color="var(--warning)" />
            <StatCard icon={<HiOutlineClock />} label="My Attendance" value={stats?.my_attendance ? 'Present' : 'Absent'} color="var(--success)" />
          </div>
        </>
      );
    }

    if (role === 'Manager') {
      return (
        <>
          <div className="page-header">
            <h1>Welcome back 👋</h1>
            <p>Here is an overview of your team today.</p>
          </div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <StatCard icon={<HiOutlineUserGroup />} label="Team Members" value={stats?.team_members ?? 0} color="var(--primary)" />
            <StatCard icon={<HiOutlineClipboardList />} label="Pending Tasks" value={stats?.pending_tasks ?? 0} color="var(--info)" />
            <StatCard icon={<HiOutlineCalendar />} label="Leave Requests" value={stats?.leave_requests ?? 0} color="var(--warning)" />
          </div>
        </>
      );
    }

    // Admin
    return (
      <>
        <div className="page-header">
          <h1>Welcome back 👋</h1>
          <p>Here is an overview of your organization today.</p>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <StatCard icon={<HiOutlineUsers />} label="Total Employees" value={stats?.total_employees ?? 0} color="var(--primary)" />
          <StatCard icon={<HiOutlineClipboardList />} label="Active Tasks" value={stats?.active_tasks ?? 0} color="var(--info)" />
          <StatCard icon={<HiOutlineCalendar />} label="Pending Leave Requests" value={stats?.pending_leaves ?? 0} color="var(--warning)" />
          <StatCard icon={<HiOutlineClock />} label="Employees Present Today" value={stats?.employees_present_today ?? 0} color="var(--success)" />
        </div>

        <div className="dashboard-details" style={{ marginTop: '2rem' }}>
          <div className="detail-card activity-timeline">
            <h3>Recent Activity</h3>
            <div className="timeline-container">
              {activityLogs.map(log => (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <p className="timeline-action"><strong>{log.username}</strong> {log.action.toLowerCase()}</p>
                    <span className="timeline-date">{format(new Date(log.timestamp), 'PP p')}</span>
                  </div>
                </div>
              ))}
              {activityLogs.length === 0 && <p style={{ color: '#9ca3af' }}>No recent activity.</p>}
            </div>
          </div>
        </div>
      </>
    );
  };

  return <div className="page dashboard-page">{renderDashboard()}</div>;
}
