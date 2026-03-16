import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineBan, HiOutlineSearch, HiOutlinePencil } from 'react-icons/hi';
import { format, parseISO } from 'date-fns';

const LEAVE_TYPES = ['Sick', 'Casual', 'Annual', 'Maternity', 'Paternity'];
const STATUSES = ['All', 'Pending', 'Approved', 'Rejected'];

export default function Leaves() {
  const [allLeaves, setAllLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ employee: '', leave_type: 'Sick', start_date: '', end_date: '', reason: '', status: 'Pending' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter, Search, Pagination, Sort
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const itemsPerPage = 10;

  const { user, hasRole } = useAuth();
  const isEmployee = hasRole('Employee');
  const canApprove = hasRole('Admin', 'Manager');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, empRes] = await Promise.all([
        api.get('/leaves/'),
        api.get('/employees/'),
      ]);
      setAllLeaves(leavesRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const openNewRequest = () => {
    // Employee auto-fills their own ID
    const emp = isEmployee ? (user?.employee_id || '') : '';
    setForm({ employee: emp, leave_type: 'Sick', start_date: '', end_date: '', reason: '', status: 'Pending' });
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEditRequest = (leave) => {
    setForm({
      employee: leave.employee || '',
      leave_type: leave.leave_type || 'Sick',
      start_date: leave.start_date || '',
      end_date: leave.end_date || '',
      reason: leave.reason || '',
      status: leave.status || 'Pending'
    });
    setEditingId(leave.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      // For employees, force their own employee_id
      if (isEmployee) {
        payload.employee = user?.employee_id;
      }
      if (editingId) {
        await api.put(`/leaves/${editingId}/`, payload);
      } else {
        await api.post('/leaves/', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Something went wrong');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/leaves/${id}/update_status/`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Rejected': return 'badge-danger';
      case 'Pending': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const pageTitle = isEmployee ? 'My Leaves' : 'Leave Requests';
  
  const filteredLeaves = allLeaves.filter(l => {
    const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
    const matchesSearch = (l.employee_name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (l.reason || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedLeaves = [...filteredLeaves].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaves = sortedLeaves.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedLeaves.length / itemsPerPage);

  const pageSubtitle = isEmployee
    ? `${filteredLeaves.length} leave requests`
    : `${filteredLeaves.length} total requests`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={openNewRequest}>
          <HiOutlinePlus /> {isEmployee ? 'Request Leave' : 'New Request'}
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search name or reason..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-select">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
             {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {!isEmployee && <th onClick={() => handleSort('employee_name')} style={{cursor: 'pointer'}}>Employee {sortConfig.key === 'employee_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
              <th onClick={() => handleSort('leave_type')} style={{cursor: 'pointer'}}>Type {sortConfig.key === 'leave_type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('start_date')} style={{cursor: 'pointer'}}>Date Range {sortConfig.key === 'start_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('reason')} style={{cursor: 'pointer'}}>Reason {sortConfig.key === 'reason' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentLeaves.map((leave) => {
              const start = parseISO(leave.start_date);
              const end = parseISO(leave.end_date);
              return (
                <tr key={leave.id}>
                  {!isEmployee && (
                    <td>
                      <div className="user-cell">
                        <div className="avatar-sm">
                           <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(leave.employee_name || 'U')}&background=random`} alt={leave.employee_name} style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
                        </div>
                        <span>{leave.employee_name}</span>
                      </div>
                    </td>
                  )}
                  <td><strong>{leave.leave_type}</strong></td>
                  <td>
                    {format(start, 'MMM d, yy')} - {format(end, 'MMM d, yy')}
                  </td>
                  <td className="truncate" style={{ maxWidth: '250px' }} title={leave.reason}>{leave.reason}</td>
                  <td><span className={`badge ${statusClass(leave.status)}`}>{leave.status}</span></td>
                  <td>
                    <div className="action-btns">
                      {canApprove && leave.status === 'Pending' && (
                        <>
                          <button className="btn-icon approve" onClick={() => updateStatus(leave.id, 'Approved')} title="Approve">
                            <HiOutlineCheck />
                          </button>
                          <button className="btn-icon reject" onClick={() => updateStatus(leave.id, 'Rejected')} title="Reject">
                            <HiOutlineBan />
                          </button>
                        </>
                      )}
                      {canApprove && leave.status !== 'Pending' && (
                         <span style={{ color: '#9ca3af', fontSize: '0.875rem', marginRight: '0.5rem' }}>Reviewed</span>
                      )}
                      <button className="btn-icon edit" onClick={() => openEditRequest(leave)} title="Edit">
                        <HiOutlinePencil />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {currentLeaves.length === 0 && (
              <tr><td colSpan={isEmployee ? 5 : 6} className="empty-state">No leave requests found</td></tr>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Leave Request' : (isEmployee ? 'Request Leave' : 'Submit Leave Request')}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              {!isEmployee && (
                <div className="form-group">
                  <label>Employee</label>
                  <select value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Leave Type</label>
                <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows="3" required />
              </div>
              {canApprove && editingId && (
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
