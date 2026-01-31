import { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { tasksAPI } from '../../services/api';
import { FiPlus, FiClock, FiCheckCircle, FiUser, FiX, FiEdit2, FiLoader } from 'react-icons/fi';

const DoctorTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    patientName: '',
    room: '',
    priority: 'medium',
    category: 'Other',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tasksAPI.getTasks();
      const data = response.data;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      alert('Task title is required');
      return;
    }
    try {
      setSubmitting(true);
      await tasksAPI.createTask({
        title: newTask.title,
        patientName: newTask.patientName || undefined,
        room: newTask.room || undefined,
        priority: newTask.priority,
        category: newTask.category,
        dueDate: newTask.dueDate || undefined,
        notes: newTask.notes || undefined
      });
      await fetchTasks();
      setShowNewTaskModal(false);
      setNewTask({ title: '', patientName: '', room: '', priority: 'medium', category: 'Other', dueDate: '', notes: '' });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create task';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      await tasksAPI.completeTask(id);
      setTasks((prev) =>
        prev.map((task) =>
          task._id === id ? { ...task, status: 'completed', completedAt: new Date().toISOString() } : task
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to complete task');
    }
  };

  const stats = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    // inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const categories = ['Medication', 'Treatment', 'Documentation', 'Communication', 'Vitals', 'Assessment', 'Other'];

  return (
    <Layout appName="EXIR" role="doctor">
      <div className="page-header-flex">
        <div>
          <h1>Tasks</h1>
          <p>Manage your tasks and follow-ups</p>
        </div>
        <button className="new-task-btn" onClick={() => setShowNewTaskModal(true)}>
          <FiPlus /> New Task
        </button>
      </div>

      <div className="task-stats">
        <div className="task-stat">
          <div className="stat-icon yellow"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        {/* <div className="task-stat">
          <div className="stat-icon blue"><FiEdit2 /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div> */}
        <div className="task-stat">
          <div className="stat-icon green"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </button>
        <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Pending ({stats.pending})
        </button>
        {/* <button className={`tab ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>
          In Progress ({stats.inProgress})
        </button> */}
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          Completed ({stats.completed})
        </button>
      </div>

      <div className="tasks-section">
        {loading ? (
          <div className="loading-state">
            <FiLoader className="spin" style={{ fontSize: 32, color: '#0ea5e9' }} />
            <p>Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchTasks}>Retry</button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <FiCheckCircle style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
            <h3>No tasks</h3>
            <p>Create a new task to get started.</p>
          </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <div
                key={task._id}
                className={`task-card ${task.status}`}
                style={{ borderLeftColor: getPriorityColor(task.priority) }}
              >
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleCompleteTask(task._id)}
                    disabled={task.status === 'completed'}
                  />
                </div>
                <div className="task-content">
                  <div className="task-header">
                    <h3 className={task.status === 'completed' ? 'completed' : ''}>{task.title}</h3>
                    <div className="task-badges">
                      <span className="priority-badge" style={{ background: getPriorityColor(task.priority) }}>
                        {task.priority}
                      </span>
                      <span className="category-badge">{task.category}</span>
                    </div>
                  </div>
                  <div className="task-details">
                    {(task.patientName || task.room) && (
                      <span><FiUser /> {task.patientName || 'N/A'}{task.room ? ` · Room ${task.room}` : ''}</span>
                    )}
                    {task.dueDate && (
                      <span><FiClock /> Due: {new Date(task.dueDate).toLocaleString()}</span>
                    )}
                  </div>
                  {task.notes && <p className="task-notes">{task.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewTaskModal && (
        <div className="modal-overlay" onClick={() => setShowNewTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Task</h2>
              <button className="close-btn" onClick={() => setShowNewTaskModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input type="text" name="title" value={newTask.title} onChange={handleInputChange} placeholder="Task title" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Patient Name (Optional)</label>
                  <input type="text" name="patientName" value={newTask.patientName} onChange={handleInputChange} placeholder="Patient name" />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <input type="text" name="room" value={newTask.room} onChange={handleInputChange} placeholder="Room" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select name="priority" value={newTask.priority} onChange={handleInputChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" value={newTask.category} onChange={handleInputChange}>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due date</label>
                <input type="datetime-local" name="dueDate" value={newTask.dueDate} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={newTask.notes} onChange={handleInputChange} placeholder="Notes" rows={3} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .page-header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .page-header-flex h1 { font-size: 1.75rem; font-weight: 600; color: #1e293b; margin: 0 0 0.25rem 0; }
        .page-header-flex p { color: #64748b; font-size: 0.9rem; margin: 0; }
        .new-task-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; background: #0ea5e9; color: white; border: none; border-radius: 10px; font-weight: 500; cursor: pointer; }
        .new-task-btn:hover { background: #0284c7; }
        .task-stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .task-stat { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 140px; }
        .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .stat-icon.yellow { background: #fef3c7; color: #f59e0b; }
        .stat-icon.blue { background: #e0f2fe; color: #0ea5e9; }
        .stat-icon.green { background: #d1fae5; color: #22c55e; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; display: block; }
        .stat-label { font-size: 0.85rem; color: #64748b; }
        .filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .filter-tabs .tab { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; color: #64748b; }
        .filter-tabs .tab.active { background: #0ea5e9; color: white; border-color: #0ea5e9; }
        .tasks-section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.25rem; }
        .tasks-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .task-card { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; }
        .task-checkbox { padding-top: 0.2rem; }
        .task-checkbox input { width: 18px; height: 18px; cursor: pointer; }
        .task-content { flex: 1; min-width: 0; }
        .task-header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
        .task-header h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }
        .task-header h3.completed { text-decoration: line-through; color: #94a3b8; }
        .task-badges { display: flex; gap: 0.35rem; }
        .priority-badge, .category-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px; color: white; }
        .category-badge { background: #64748b; color: white; }
        .task-details { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.85rem; color: #64748b; }
        .task-details span { display: inline-flex; align-items: center; gap: 0.25rem; }
        .task-notes { font-size: 0.85rem; color: #64748b; margin: 0.5rem 0 0 0; }
        .loading-state, .error-state, .empty-state { text-align: center; padding: 2rem; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: white; border-radius: 16px; width: 90%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .modal .modal-header h2 { margin: 0; font-size: 1.25rem; }
        .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #64748b; padding: 0.25rem; }
        .modal-body { padding: 1.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; font-weight: 500; color: #374151; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; }
        .form-row { display: flex; gap: 1rem; }
        .form-row .form-group { flex: 1; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
        .btn-cancel { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; }
        .btn-submit { padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </Layout>
  );
};

export default DoctorTasks;
