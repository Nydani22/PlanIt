require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./src/config/db');
const userRoutes = require('./src/routes/user.routes'); 
const authRoutes = require('./src/routes/auth.routes'); 
const eventRoutes = require('./src/routes/event.routes');
const groupRoutes = require('./src/routes/group.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const categories = require('./src/routes/category.routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const socketUtil = require('./src/utils/socket');

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/category',categories);

const PORT = process.env.PORT || 3000;

const io = socketUtil.init(server);

io.on('connection', (socket) => {
  socket.on('authenticate', (userId) => {
    socket.join(userId);
  });
});

server.listen(PORT, () => {
  console.log(`A szerver fut a ${PORT}-es porton!`);
});

module.exports = server;