const Notification = require('../models/Notification');

// @desc    Get notifications for logged-in user
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('relatedPatientId', 'fullName nationalID')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.user._id;

    if (!notificationId) {
      return res.status(400).json({ message: 'Please provide notificationId' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      userId,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
};
