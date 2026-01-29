const express = require('express');
const router = express.Router();
const { Chat, User } = require('../models');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Get all online/available users for chat (nurses and doctors)
router.get('/contacts', async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      role: { $in: ['nurse', 'doctor'] },
      isActive: true
    })
    .select('fullName role shift isLoggedIn specialization')
    .sort({ isLoggedIn: -1, fullName: 1 });

    // Format contacts with online status
    const contacts = users.map(user => ({
      id: user._id,
      name: user.fullName,
      role: user.role === 'doctor' ? (user.specialization || 'Doctor') : 'Nurse',
      category: user.role === 'doctor' ? 'doctors' : 'nurses',
      status: user.isLoggedIn ? 'online' : 'offline',
      avatar: user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      shift: user.shift
    }));

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
});

// Get all chats for the current user
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'fullName role shift isLoggedIn')
    .sort({ 'lastMessage.timestamp': -1 });

    // Format chats with unread count
    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );

      const unreadCount = chat.messages.filter(
        msg => msg.senderId.toString() !== req.user._id.toString() && !msg.read
      ).length;

      return {
        chatId: chat._id,
        participant: otherParticipant ? {
          id: otherParticipant._id,
          name: otherParticipant.fullName,
          role: otherParticipant.role,
          status: otherParticipant.isLoggedIn ? 'online' : 'offline'
        } : null,
        lastMessage: chat.lastMessage,
        unreadCount,
        isGroupChat: chat.isGroupChat,
        groupName: chat.groupName
      };
    });

    res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
});

// Get or create a chat with another user
router.get('/with/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const chat = await Chat.findOrCreateChat(req.user._id, userId);

    res.json({
      chatId: chat._id,
      participant: {
        id: otherUser._id,
        name: otherUser.fullName,
        role: otherUser.role,
        status: otherUser.isLoggedIn ? 'online' : 'offline'
      },
      messages: chat.messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.timestamp,
        isOwn: msg.senderId.toString() === req.user._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    res.status(500).json({ message: 'Failed to get chat' });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    // Mark messages as read
    await chat.markAsRead(req.user._id);

    // Get messages (optionally paginated)
    let messages = chat.messages;
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter(m => m.timestamp < beforeDate);
    }
    messages = messages.slice(-parseInt(limit));

    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      senderId: msg.senderId,
      content: msg.content,
      timestamp: msg.timestamp,
      time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isOwn: msg.senderId.toString() === req.user._id.toString(),
      read: msg.read
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send a message in a chat
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is a participant
    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    const message = await chat.addMessage(req.user._id, content.trim());

    res.status(201).json({
      id: message._id,
      senderId: message.senderId,
      content: message.content,
      timestamp: message.timestamp,
      time: new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isOwn: true,
      read: false
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Send a message to a user (creates chat if needed)
router.post('/send/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(req.user._id, userId);

    // Add message
    const message = await chat.addMessage(req.user._id, content.trim());

    res.status(201).json({
      chatId: chat._id,
      message: {
        id: message._id,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.timestamp,
        time: new Date(message.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isOwn: true
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Mark chat messages as read
router.patch('/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chat.markAsRead(req.user._id);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

module.exports = router;
