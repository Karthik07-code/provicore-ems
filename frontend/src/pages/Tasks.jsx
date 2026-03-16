import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineX, HiOutlineCalendar, HiOutlineClock, HiOutlineSearch } from 'react-icons/hi';
import { isPast, format, parseISO } from 'date-fns';

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const INITIAL_FORM = { title: '', description: '', assigned_employee: '', status: 'Pending', priority: 'Medium', deadline: '' };

export default function Tasks() {
  const [allTasks, setAllTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [search, setSearch] = useState('');

  const { user, hasRole } = useAuth();
  const isEmployee = hasRole('Employee');
  const canCreate = hasRole('Admin', 'Manager');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, empRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/employees/'),
      ]);
      setAllTasks(tasksRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const openAdd = () => { setForm(INITIAL_FORM); setEditingId(null); setError(''); setShowModal(true); };
  
  const openEdit = (task) => {
    if (isEmployee) return; // Employees can't edit full task
    setForm({
      title: task.title,
      description: task.description,
      assigned_employee: task.assigned_employee,
      status: task.status,
      priority: task.priority || 'Medium',
      deadline: task.deadline || '',
    });
    setEditingId(task.id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/tasks/${editingId}/`, form);
      } else {
        await api.post('/tasks/', form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || (err.response?.data ? JSON.stringify(err.response.data) : 'Something went wrong'));
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}/`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'Completed': return 'badge-success';
      case 'In Progress': return 'badge-info';
      default: return 'badge-warning';
    }
  };

  const priorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const pageTitle = isEmployee ? 'My Tasks' : 'Tasks';

  // Apply frontend filters
  const filteredTasks = allTasks.filter(task => {
    const matchPriority = filterPriority === 'All' || task.priority === filterPriority;
    const matchAssignee = filterAssignee === 'All' || task.assigned_employee.toString() === filterAssignee;
    const matchSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                        (task.description || '').toLowerCase().includes(search.toLowerCase());
    return matchPriority && matchAssignee && matchSearch;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{allTasks.length} {isEmployee ? 'assigned to you' : 'total tasks'}</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openAdd}>
            <HiOutlinePlus /> Create Task
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <HiOutlineSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-select">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
             <option value="All">All Priorities</option>
             {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {!isEmployee && (
          <div className="filter-select">
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
               <option value="All">All Assignees</option>
               {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="tasks-board">
        {STATUSES.map((status) => {
          const columnTasks = filteredTasks.filter(t => t.status === status);
          return (
            <div key={status} className="task-column">
              <div className="column-header">
                <span className={`badge ${statusClass(status)}`}>{status}</span>
                <span className="column-count">{columnTasks.length}</span>
              </div>
              <div className="task-list">
                {columnTasks.map((task) => {
                  const deadlineDate = task.deadline ? parseISO(task.deadline) : null;
                  const isOverdue = deadlineDate && isPast(deadlineDate) && status !== 'Completed';

                  return (
                    <div key={task.id} className="task-card" onClick={() => openEdit(task)} style={{ cursor: isEmployee ? 'default' : 'pointer' }}>
                      <div className="task-card-header">
                        <span className={`badge ${priorityClass(task.priority)}`}>{task.priority}</span>
                      </div>
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                      
                      <div className="task-meta-grid">
                        <div className="user-cell">
                          <div className="avatar-xs">
                             <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.assigned_employee_name || 'U')}&background=random`} alt={task.assigned_employee_name} style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
                          </div>
                          <span>{task.assigned_employee_name}</span>
                        </div>
                        {deadlineDate && (
                          <div className={`deadline-info ${isOverdue ? 'overdue' : ''}`}>
                             <HiOutlineClock className="icon" />
                             <span>{format(deadlineDate, 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="task-status-actions" onClick={e => e.stopPropagation()}>
                        {STATUSES.filter(s => s !== task.status).map((s) => (
                          <button
                            key={s}
                            className={`btn btn-xs ${statusClass(s)}`}
                            onClick={(e) => { e.stopPropagation(); updateStatus(task.id, s); }}
                          >
                            Move to {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {columnTasks.length === 0 && (
                  <div className="empty-column">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && canCreate && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Task' : 'Create Task'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select value={form.assigned_employee} onChange={(e) => setForm({ ...form, assigned_employee: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
