const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // Added validation and debugging info
    console.log('Connecting to MongoDB...');
    console.log(`MongoDB URI length: ${process.env.MONGODB_URI.length} characters`);
    console.log(`MongoDB URI starts with: ${process.env.MONGODB_URI.substring(0, 10)}...`);
    
    // Add more robust connection options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database Name: ${conn.connection.name}`);
    
    // Test the connection with a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Available collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (error.name === 'MongoParseError') {
      console.error('Invalid MongoDB connection string. Please check your MONGODB_URI environment variable.');
    }
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to any MongoDB servers. Please check your network or MongoDB Atlas status.');
    }
    
    // Don't exit process in production (like Vercel) as it will just restart
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;