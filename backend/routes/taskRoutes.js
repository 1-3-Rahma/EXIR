const express = require('express');
const router = express.Router();
const { Task, Patient } = require('../models');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all tasks for the logged-in user
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ]
    })
    .populate('patient', 'fullName room')
    .populate('createdBy', 'fullName')
    .populate('assignedTo', 'fullName')
    .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get tasks by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const tasks = await Task.find({
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ],
      status
    })
    .populate('patient', 'fullName room')
    .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get today's tasks
router.get('/today', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      $or: [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
      ],
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { dueDate: null, createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    })
    .populate('patient', 'fullName room')
    .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching today tasks:', error);
    res.status(500).json({ message: 'Failed to fetch today tasks' });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, patientName, room, notes, priority, category, dueDate, patientId } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const taskData = {
      title,
      patientName: patientName || null,
      room: room || null,
      notes: notes || '',
      priority: priority || 'medium',
      category: category || 'Other',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user._id,
      status: 'pending'
    };

    // If patientId is provided, link to patient
    if (patientId) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        taskData.patient = patientId;
        taskData.patientName = patient.fullName;
        taskData.room = patient.room || room;
      }
    }

    const task = await Task.create(taskData);
    const populatedTask = await Task.findById(task._id)
      .populate('patient', 'fullName room')
      .populate('createdBy', 'fullName');

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Update a task
router.put('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user owns the task or is assigned to it
    if (task.createdBy.toString() !== req.user._id.toString() &&
        task.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    // If marking as completed, set completedAt
    if (updates.status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true }
    )
    .populate('patient', 'fullName room')
    .populate('createdBy', 'fullName');

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Mark task as completed
router.patch('/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('patient', 'fullName room')
      .populate('createdBy', 'fullName');

    res.json(populatedTask);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Failed to complete task' });
  }
});

// Delete a task
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only the creator can delete
    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

module.exports = router;
