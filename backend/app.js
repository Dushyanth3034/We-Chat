const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const storyRoutes = require('./routes/storyRoutes');
const songRoutes = require('./routes/songRoutes');
const callRoutes = require('./routes/callRoutes');
const reactionRoutes = require('./routes/reactionRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const e2eRoutes = require('./routes/e2eRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // For testing purposes, allow all origins.
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback for missing uploaded images: if an image in /uploads doesn't exist, redirect to a placeholder instead of "Cannot GET"
app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
    return res.redirect('https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');
  }
  next();
});

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/e2e', e2eRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Express Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected server error occurred.',
  });
});

module.exports = app;
