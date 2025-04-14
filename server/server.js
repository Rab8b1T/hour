const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
require('dotenv').config();

// Add detailed startup logging
console.log('Starting server with environment:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`- MongoDB URI set: ${process.env.MONGODB_URI ? 'Yes' : 'No'}`);
console.log(`- Server Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`- Current server time: ${new Date().toISOString()}`);
console.log(`- Current local time: ${new Date().toString()}`);

const app = express();

// Setup middleware first
app.use(cors());
app.use(express.json());

// Add request logging middleware for all routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message 
  });
});

// Connect to MongoDB - in serverless environment, connect for each request
let isConnected = false;
const dbConnect = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    await connectDB();
    isConnected = true;
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Middleware to ensure DB connection before processing API requests
app.use('/api', async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return res.status(500).json({
      error: 'Database connection failed',
      message: 'Could not connect to the database. Please try again later.'
    });
  }
});

// API Routes
app.use('/api/hours', require('./routes/hourRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));

// Add a test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is working', 
    serverTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dbConnected: isConnected
  });
});

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../public')));

// Handle requests for HTML pages in the pages directory
app.get('/*.html', (req, res) => {
  // Extract the HTML filename from the request path
  const filename = req.path.substring(1); // Remove the leading slash
  res.sendFile(path.join(__dirname, '../public/pages', filename));
});

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

// Handle 404 errors for any other routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  } else {
    res.status(404).sendFile(path.join(__dirname, '../public/pages/index.html'));
  }
});

const PORT = process.env.PORT || 5000;

// Only listen on port if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for serverless environments
module.exports = app;