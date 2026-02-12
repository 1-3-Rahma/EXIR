const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const nurseRoutes = require('./routes/nurseRoutes');
const patientRoutes = require('./routes/patientRoutes');
const receptionistRoutes = require('./routes/receptionistRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const visitRoutes = require('./routes/visitRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const fileRoutes = require('./routes/fileRoutes');
const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'EXIR Healthcare API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/nurse', nurseRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/receptionist', receptionistRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/medical-records', medicalRecordRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/chat', chatRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: { origin: frontendOrigin, credentials: true },
  path: '/socket.io'
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.role = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

const User = require('./models/User');

io.on('connection', async (socket) => {
  // All users join their own room
  socket.join(`user:${socket.userId}`);
  if (socket.role === 'nurse') {
    socket.join(`nurse:${socket.userId}`);
  }

  // Mark user online and broadcast
  try {
    await User.findByIdAndUpdate(socket.userId, { isLoggedIn: true });
    io.emit('userStatusChanged', { userId: socket.userId, status: 'online' });
  } catch (_) {}

  socket.on('disconnect', async () => {
    // Check if user has any other active sockets before marking offline
    const rooms = io.sockets.adapter.rooms.get(`user:${socket.userId}`);
    if (!rooms || rooms.size === 0) {
      try {
        await User.findByIdAndUpdate(socket.userId, { isLoggedIn: false });
        io.emit('userStatusChanged', { userId: socket.userId, status: 'offline' });
      } catch (_) {}
    }
  });
});

app.set('io', io);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   EXIR Healthcare API Server                              ║
║   Running on port ${PORT}                                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                           ║
║   API Base URL: http://localhost:${PORT}/api/v1              ║
║   WebSocket: /socket.io                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
