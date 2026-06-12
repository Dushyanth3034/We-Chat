const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { ensureDatabaseExists, sequelize } = require('./config/database');
const { socketHandler } = require('./sockets/socketHandler');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Share io instance with express routers
app.set('io', io);

// Initialize socket handlers
socketHandler(io);

const startServer = async () => {
  try {
    // 1. Check and create database if missing
    await ensureDatabaseExists();

    // 2. Connect to MySQL
    await sequelize.authenticate();
    console.log('Database Connected Successfully');

    // 3. Auto-sync database schemas
    await sequelize.sync({ alter: true });
    console.log('Sequelize models synchronized successfully.');

    // 4. Start listening
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
