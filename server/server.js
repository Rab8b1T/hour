const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/hours', require('./routes/hourRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));

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
  if (!req.path.startsWith('/api/')) {
    res.status(404).sendFile(path.join(__dirname, '../public/pages/index.html'));
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});