import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';

const INITIAL_FORM = { name: '', email: '', department: 'Engineering', role: 'Employee', phone: '', status: 'Active', designation: '', joining_date: '' };
const DEPARTMENTS = ['All', 'Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
const ROLES = ['Admin', 'Manager', 'Employee'];
const STATUSES = ['Active', 'Inactive'];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search, Filter, Pagination
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const itemsPerPage = 10;

  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('Admin');
  const isManager = hasRole('Manager');

  useEffect(() => {
    fetchEmployees();
  }, [search, departmentFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = '/employees/';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter !== 'All') params.append('department', departmentFilter);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      setEmployees(res.data);
      setCurrentPage(1); // reset on new search
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError('');
    setShowAddEditModal(true);
  };

  const openEdit = (e, emp) => {
    e.stopPropagation();
    setForm({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      role: emp.role,
      phone: emp.phone || '',
      status: emp.status || 'Active',
      designation: emp.designation,
      joining_date: emp.joining_date,
    });
    setEditingId(emp.id);
    setError('');
    setShowAddEditModal(true);
  };

  const openProfile = (emp) => {
    setSelectedEmp(emp);
    setShowProfileModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}/`, form);
      } else {
        await api.post('/employees/', form);
      }
      setShowAddEditModal(false);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || (err.response?.data ? JSON.stringify(err.response.data) : 'Something went wrong'));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}/`);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (e, emp) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.patch(`/employees/${emp.id}/`, { status: newStatus });
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  // Sorting Logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  const pageTitle = isManager ? 'Team Members' : 'Employees';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{employees.length} {isManager ? 'in your department' : 'total employees'}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAdd}>
            <HiOutlinePlus /> Add Employee
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isManager && (
          <div className="filter-select">
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('department')} style={{cursor: 'pointer'}}>Department {sortConfig.key === 'department' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('role')} style={{cursor: 'pointer'}}>Role {sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('joining_date')} style={{cursor: 'pointer'}}>Joined {sortConfig.key === 'joining_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="empty-state">Loading...</td></tr>
            ) : currentEmployees.length > 0 ? (
              currentEmployees.map((emp) => (
                <tr key={emp.id} onClick={() => openProfile(emp)} className="clickable-row">
                  <td>
                    <div className="user-cell">
                      <div className="avatar-sm">
                         <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} alt={emp.name} style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
                      </div>
                      <div className="user-details-cell">
                        <span className="user-name">{emp.name}</span>
                        <span className="user-email">{emp.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-dept">{emp.department}</span></td>
                  <td><span className={`badge role-badge-${emp.role?.toLowerCase()}`}>{emp.role}</span></td>
                  <td>
                    <span 
                      className={`badge status-badge ${emp.status === 'Active' ? 'success' : 'error'}`}
                      onClick={(e) => toggleStatus(e, emp)}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                      title={isAdmin ? "Click to toggle status" : ""}
                    >
                      {emp.status || 'Active'}
                    </span>
                  </td>
                  <td>{new Date(emp.joining_date).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon view" onClick={(e) => { e.stopPropagation(); openProfile(emp); }} title="View Profile">
                        <HiOutlineEye />
                      </button>
                      {isAdmin && (
                        <>
                          <button className="btn-icon edit" onClick={(e) => openEdit(e, emp)} title="Edit">
                            <HiOutlinePencil />
                          </button>
                          <button className="btn-icon delete" onClick={(e) => handleDelete(e, emp.id)} title="Delete">
                            <HiOutlineTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="empty-state">No employees found</td></tr>
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

      {/* Profile Validation Modal */}
      {showProfileModal && selectedEmp && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Employee Profile</h2>
              <button className="btn-icon" onClick={() => setShowProfileModal(false)}><HiOutlineX /></button>
            </div>
            <div className="profile-content">
               <div className="profile-header">
                 <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmp.name)}&background=random&size=100`} alt="Avatar" className="profile-avatar-lg" style={{ borderRadius: '50%' }} />
                 <div>
                   <h2>{selectedEmp.name}</h2>
                   <p className="profile-desig">{selectedEmp.designation}</p>
                   <span className={`badge status-badge ${selectedEmp.status === 'Active' ? 'success' : 'error'}`}>{selectedEmp.status || 'Active'}</span>
                 </div>
               </div>
               <div className="profile-details-grid">
                  <div className="detail-item">
                    <label>Email</label>
                    <p>{selectedEmp.email}</p>
                  </div>
                  <div className="detail-item">
                    <label>Phone</label>
                    <p>{selectedEmp.phone || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Department</label>
                    <p>{selectedEmp.department}</p>
                  </div>
                  <div className="detail-item">
                    <label>Role</label>
                    <p>{selectedEmp.role}</p>
                  </div>
                  <div className="detail-item">
                    <label>Joining Date</label>
                    <p>{new Date(selectedEmp.joining_date).toLocaleDateString()}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddEditModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowAddEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button className="btn-icon" onClick={() => setShowAddEditModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    {DEPARTMENTS.filter(d => d !== 'All').map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Designation</label>
                  <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Joining Date</label>
                <input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
