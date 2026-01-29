import { useState } from 'react';
import Layout from '../../components/common/Layout';
import {
  FiPlus, FiClock, FiCheckCircle, FiUser, FiCalendar,
  FiX, FiEdit2
} from 'react-icons/fi';

const NurseTasks = () => {
  const [tasks, setTasks] = useState([
    { _id: '1', title: 'Administer insulin', patient: 'Patient 4', room: '308D', time: '10:00 AM', priority: 'high', category: 'Medication', status: 'pending', assignedBy: 'Doctor 2', notes: '' },
    { _id: '2', title: 'Wound dressing change', patient: 'Patient 5', room: '410A', time: '10:30 AM', priority: 'high', category: 'Treatment', status: 'pending', assignedBy: null, notes: 'Use sterile technique. Document wound appearance.' },
    { _id: '3', title: 'Check vitals', patient: 'Patient 6', room: '215B', time: '11:00 AM', priority: 'medium', category: 'Vitals', status: 'pending', assignedBy: null, notes: '' },
    { _id: '4', title: 'Update care plan', patient: 'Patient 1', room: '302A', time: '2:00 PM', priority: 'low', category: 'Documentation', status: 'pending', assignedBy: 'Charge Nurse', notes: '' },
    { _id: '5', title: 'Family consultation', patient: 'Patient 2', room: '405B', time: '11:30 AM', priority: 'medium', category: 'Communication', status: 'in_progress', assignedBy: null, notes: '' },
    { _id: '6', title: 'Post-op assessment', patient: 'Patient 3', room: '201C', time: '9:00 AM', priority: 'high', category: 'Assessment', status: 'completed', assignedBy: 'Doctor 1', notes: '' }
  ]);

  const [filter, setFilter] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', patient: '', room: '', priority: 'medium', category: 'Medication', dueDate: '', notes: ''
  });

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const handleCompleteTask = (id) => {
    setTasks(tasks.map(task =>
      task._id === id ? { ...task, status: 'completed' } : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const shiftInfo = {
    current: { time: '7:00 AM - 3:00 PM', nurse: 'Nurse: Jane Doe, RN', ward: 'ICU Ward', patients: 6 },
    next: { time: '3:00 PM - 11:00 PM', nurse: 'Nurse: Nurse 2', ward: 'ICU Ward', status: 'Taking over' },
    notes: [
      'Room 302A requires frequent BP monitoring',
      'Room 405B family meeting at 2:00 PM',
      'New admission expected at 12:00 PM'
    ],
    handoff: 'All vitals stable. Room 302A continues to have elevated BP - monitoring ongoing. Room 405B family consulted, awaiting physician rounds.'
  };

  return (
    <Layout appName="NurseHub" role="nurse">
      <div className="page-header-flex">
        <div>
          <h1>Task Management</h1>
          <p>Organize and track your daily nursing tasks</p>
        </div>
        <button className="new-task-btn" onClick={() => setShowNewTaskModal(true)}>
          <FiPlus /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="task-stats">
        <div className="task-stat">
          <div className="stat-icon yellow"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Tasks</span>
          </div>
        </div>
        <div className="task-stat">
          <div className="stat-icon blue"><FiEdit2 /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="task-stat">
          <div className="stat-icon green"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All Tasks ({tasks.length})
        </button>
        <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Pending ({stats.pending})
        </button>
        <button className={`tab ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>
          In Progress ({stats.inProgress})
        </button>
        <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          Completed ({stats.completed})
        </button>
      </div>

      {/* Tasks List */}
      <div className="tasks-section">
        <div className="tasks-list">
          {filteredTasks.map((task) => (
            <div key={task._id} className={`task-card ${task.status}`} style={{ borderLeftColor: getPriorityColor(task.priority) }}>
              <div className="task-checkbox">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleCompleteTask(task._id)}
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
                  <span><FiUser /> {task.patient} - Room {task.room}</span>
                  <span><FiClock /> {task.time}</span>
                  {task.assignedBy && <span><FiUser /> Assigned by {task.assignedBy}</span>}
                </div>
                {task.notes && (
                  <p className="task-notes">{task.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Shift Overview */}
        <div className="shift-overview">
          <h3>Shift Overview</h3>
          <div className="shifts-row">
            <div className="shift-card current">
              <span className="shift-badge current">Current Shift</span>
              <span className="shift-time">{shiftInfo.current.time}</span>
              <div className="shift-details">
                <strong>{shiftInfo.current.nurse}</strong>
                <span>{shiftInfo.current.ward} · {shiftInfo.current.patients} patients assigned</span>
              </div>
            </div>
            <div className="shift-card next">
              <span className="shift-badge next">Next Shift</span>
              <span className="shift-time">{shiftInfo.next.time}</span>
              <div className="shift-details">
                <strong>{shiftInfo.next.nurse}</strong>
                <span>{shiftInfo.next.ward} · {shiftInfo.next.status}</span>
              </div>
            </div>
          </div>

          <div className="shift-notes">
            <h4>Key Notes:</h4>
            <ul>
              {shiftInfo.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="handoff-section">
            <h4>Handoff Notes:</h4>
            <textarea
              defaultValue={shiftInfo.handoff}
              placeholder="Enter handoff notes for the next shift..."
            />
            <button className="save-handoff-btn">Save Handoff Notes</button>
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="close-btn" onClick={() => setShowNewTaskModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Task Title *</label>
                <input type="text" placeholder="Enter task title" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Patient (Optional)</label>
                  <input type="text" placeholder="Patient name" />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <input type="text" placeholder="Room number" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select>
                    <option value="Medication">Medication</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Communication">Communication</option>
                    <option value="Vitals">Vitals</option>
                    <option value="Assessment">Assessment</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date & Time</label>
                <input type="datetime-local" />
              </div>
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea placeholder="Add any additional notes..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowNewTaskModal(false)}>Cancel</button>
              <button className="submit-btn">Create Task</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-header-flex h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .page-header-flex p {
          color: #64748b;
          font-size: 0.9rem;
        }

        .new-task-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .new-task-btn:hover { background: #2563eb; }

        .task-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .task-stat {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .stat-icon.yellow { background: #fef3c7; color: #f59e0b; }
        .stat-icon.blue { background: #dbeafe; color: #3b82f6; }
        .stat-icon.green { background: #dcfce7; color: #22c55e; }

        .stat-info { display: flex; flex-direction: column; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-label { font-size: 0.85rem; color: #64748b; }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }

        .tab {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          color: #64748b;
          font-size: 0.9rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover { color: #1e293b; }
        .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 500; }

        .tasks-section {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .task-card {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          border-left: 4px solid;
          transition: all 0.2s;
        }

        .task-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .task-card.completed { opacity: 0.7; }

        .task-checkbox input {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .task-content { flex: 1; }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .task-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .task-header h3.completed {
          text-decoration: line-through;
          color: #94a3b8;
        }

        .task-badges {
          display: flex;
          gap: 0.5rem;
        }

        .priority-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          color: white;
          font-weight: 500;
        }

        .category-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: #f1f5f9;
          color: #64748b;
        }

        .task-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .task-details span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .task-notes {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
          background: #f8fafc;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
        }

        .shift-overview {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          height: fit-content;
        }

        .shift-overview h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1e293b;
        }

        .shifts-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .shift-card {
          flex: 1;
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .shift-card.current { background: #f0f9ff; }
        .shift-card.next { background: #f8fafc; }

        .shift-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .shift-badge.current { background: #3b82f6; color: white; }
        .shift-badge.next { background: #e2e8f0; color: #64748b; }

        .shift-time {
          display: block;
          font-size: 0.85rem;
          color: #64748b;
          margin: 0.5rem 0;
        }

        .shift-details strong {
          display: block;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .shift-details span {
          font-size: 0.8rem;
          color: #64748b;
        }

        .shift-notes h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .shift-notes ul {
          margin: 0;
          padding-left: 1.25rem;
        }

        .shift-notes li {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }

        .handoff-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .handoff-section h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .handoff-section textarea {
          width: 100%;
          min-height: 80px;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          resize: vertical;
          margin-bottom: 0.75rem;
        }

        .save-handoff-btn {
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-handoff-btn:hover { background: #2563eb; }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 { font-size: 1.1rem; font-weight: 600; }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #64748b;
          cursor: pointer;
        }

        .modal-body { padding: 1.25rem; }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 0.375rem;
          color: #1e293b;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .form-group textarea { min-height: 80px; resize: vertical; }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.25rem;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn, .submit-btn {
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }

        .cancel-btn {
          background: white;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .submit-btn {
          background: #3b82f6;
          border: none;
          color: white;
        }

        @media (max-width: 1024px) {
          .tasks-section { grid-template-columns: 1fr; }
          .task-stats { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 768px) {
          .task-stats { grid-template-columns: 1fr; }
          .filter-tabs { overflow-x: auto; }
          .shifts-row { flex-direction: column; }
        }
      `}</style>
    </Layout>
  );
};

export default NurseTasks;
