import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineLogin, HiOutlineLogout, HiOutlineDownload, HiOutlineSearch } from 'react-icons/hi';
import { format, parseISO } from 'date-fns';

export default function Attendance() {
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const itemsPerPage = 6;

  const { user, hasRole } = useAuth();

  const isEmployee = hasRole('Employee');
  const isAdmin = hasRole('Admin');
  const isManager = hasRole('Manager');

  useEffect(() => {
    // Auto-select self for employees
    if (isEmployee && user?.employee_id) {
      setSelectedEmployee(String(user.employee_id));
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        api.get('/attendance/'),
        api.get('/employees/'),
      ]);
      setAttendances(attRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    if (!isEmployee && !selectedEmployee) { setMsg({ text: 'Please select an employee', type: 'error' }); return; }
    setMsg({ text: '', type: '' });
    try {
      await api.post('/attendance/check-in/', { employee: isEmployee ? user?.employee_id : selectedEmployee });
      setMsg({ text: 'Checked in successfully!', type: 'success' });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Check-in failed', type: 'error' });
    }
  };

  const handleCheckOut = async () => {
    if (!isEmployee && !selectedEmployee) { setMsg({ text: 'Please select an employee', type: 'error' }); return; }
    setMsg({ text: '', type: '' });
    try {
      await api.post('/attendance/check-out/', { employee: isEmployee ? user?.employee_id : selectedEmployee });
      setMsg({ text: 'Checked out successfully!', type: 'success' });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Check-out failed', type: 'error' });
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const pageTitle = isEmployee ? 'My Attendance' : 'Attendance Reports';
  
  // Basic filtering for reports
  const filteredAttendances = attendances.filter(a => {
    const matchesEmployee = (!isEmployee && selectedEmployee) ? String(a.employee) === selectedEmployee : true;
    const matchesSearch = (a.employee_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesEmployee && matchesSearch;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedAttendances = [...filteredAttendances].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAttendances = sortedAttendances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedAttendances.length / itemsPerPage);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{isEmployee ? 'Log your daily work hours' : 'Track and review employee work hours'}</p>
        </div>
        {!isEmployee && (
           <button className="btn btn-secondary" onClick={() => alert('Download feature coming soon!')}>
             <HiOutlineDownload /> Export Report
           </button>
        )}
      </div>

      <div className="attendance-grid">
        <div className="attendance-card log-card">
          <h3>{isEmployee ? 'Time Logger' : 'Log Time for Employee'}</h3>
          <p className="card-hint">Current Time: {format(new Date(), 'hh:mm a')}</p>
          {!isEmployee && (
            <div className="form-group">
              <label>Select Employee</label>
              <select value={selectedEmployee} onChange={(e) => { setSelectedEmployee(e.target.value); setMsg({ text: '', type: '' }); }}>
                <option value="">All Employees (Reports view)</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
          )}
          {msg.text && <div className={`alert alert-${msg.type} fade-in`}>{msg.text}</div>}
          
          <div className="attendance-btns">
            <button className="btn btn-success btn-lg flex-1" onClick={handleCheckIn}>
              <HiOutlineLogin /> Check In
            </button>
            <button className="btn btn-warning btn-lg flex-1" onClick={handleCheckOut}>
              <HiOutlineLogout /> Check Out
            </button>
          </div>
        </div>

        <div className="attendance-card stats-wrap">
          <h3>Quick Stats</h3>
          <div className="att-stats">
              <div className="stat-brick">
                 <span className="val">{filteredAttendances.length}</span>
                 <span className="lbl">Total Logs</span>
              </div>
              <div className="stat-brick">
                 <span className="val">{filteredAttendances.filter(a => a.total_hours).length}</span>
                 <span className="lbl">Completed Days</span>
              </div>
          </div>
        </div>
      </div>

      <div className="filters-bar" style={{ marginTop: '2rem' }}>
        <div className="search-box">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search employee name..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <h3 style={{ marginBottom: '1rem', padding: '0 1.5rem', marginTop: '1rem' }}>
          {isEmployee ? 'My History' : 'Attendance Records'}
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              {!isEmployee && <th onClick={() => handleSort('employee_name')} style={{cursor: 'pointer'}}>Employee {sortConfig.key === 'employee_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
              <th onClick={() => handleSort('date')} style={{cursor: 'pointer'}}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('check_in_time')} style={{cursor: 'pointer'}}>Check In {sortConfig.key === 'check_in_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('check_out_time')} style={{cursor: 'pointer'}}>Check Out {sortConfig.key === 'check_out_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('total_hours')} style={{cursor: 'pointer'}}>Hours Tracked {sortConfig.key === 'total_hours' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('check_in_time')} style={{cursor: 'pointer'}}>Status {sortConfig.key === 'check_in_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {currentAttendances.map((att) => {
              const formattedDate = format(parseISO(att.date), 'MMM d, yyyy');
              
              // Helper to safely format time
              const formatT = (tStr) => {
                if (!tStr) return '—';
                // tStr is 'HH:MM:SS'
                const [h, m] = tStr.split(':');
                const dt = new Date();
                dt.setHours(parseInt(h, 10));
                dt.setMinutes(parseInt(m, 10));
                return format(dt, 'hh:mm a');
              };

              return (
                <tr key={att.id}>
                  {!isEmployee && (
                    <td>
                      <div className="user-cell">
                        <div className="avatar-sm">
                           <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(att.employee_name || 'U')}&background=random`} alt={att.employee_name} style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
                        </div>
                        <span>{att.employee_name}</span>
                      </div>
                    </td>
                  )}
                  <td><strong>{formattedDate}</strong></td>
                  <td>{formatT(att.check_in_time)}</td>
                  <td>{formatT(att.check_out_time)}</td>
                  <td>
                    {att.total_hours ? <span className="hours-val">{att.total_hours} hrs</span> : '—'}
                  </td>
                  <td>
                    <span className={`badge ${att.check_in_time ? 'badge-success' : 'badge-danger'}`}>
                      {att.check_in_time ? 'Present' : 'Absent'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {currentAttendances.length === 0 && (
              <tr><td colSpan={isEmployee ? 5 : 6} className="empty-state">No attendance records found</td></tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
