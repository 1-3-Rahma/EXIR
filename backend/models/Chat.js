const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Static method to find or create a chat between two users
chatSchema.statics.findOrCreateChat = async function(userId1, userId2) {
  let chat = await this.findOne({
    participants: { $all: [userId1, userId2] },
    isGroupChat: false
  }).populate('participants', 'fullName role shift isLoggedIn');

  if (!chat) {
    chat = await this.create({
      participants: [userId1, userId2],
      messages: [],
      isGroupChat: false
    });
    chat = await chat.populate('participants', 'fullName role shift isLoggedIn');
  }

  return chat;
};

// Method to add a message to the chat
chatSchema.methods.addMessage = async function(senderId, content) {
  const message = {
    senderId,
    content,
    timestamp: new Date(),
    read: false
  };

  this.messages.push(message);
  this.lastMessage = {
    content,
    senderId,
    timestamp: message.timestamp
  };

  await this.save();
  return message;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = async function(userId) {
  this.messages.forEach(msg => {
    if (msg.senderId.toString() !== userId.toString() && !msg.read) {
      msg.read = true;
    }
  });
  await this.save();
};

module.exports = mongoose.model('Chat', chatSchema);
