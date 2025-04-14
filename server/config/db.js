const mongoose = require('mongoose');
require('dotenv').config();

// Track connection status
let isConnected = false;

const connectDB = async () => {
  // If already connected, return the existing connection
  if (isConnected) {
    console.log('=> Using existing database connection');
    return mongoose.connection;
  }

  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // Added validation and debugging info
    console.log('Connecting to MongoDB...');
    console.log(`MongoDB URI length: ${process.env.MONGODB_URI.length} characters`);
    console.log(`MongoDB URI prefix: ${process.env.MONGODB_URI.substring(0, 10)}...`);
    
    // Add more robust connection options for serverless environment
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false, // Disable command buffering
      connectTimeoutMS: 10000 // Connection timeout
    });
    
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database Name: ${conn.connection.name}`);
    
    // Setup connection error handling for better detection of issues
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });
    
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (error.name === 'MongoParseError') {
      console.error('Invalid MongoDB connection string. Please check your MONGODB_URI environment variable.');
    }
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to any MongoDB servers. Please check your network or MongoDB Atlas status.');
    }
    
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;