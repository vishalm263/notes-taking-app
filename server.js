import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Configure headers for security and auth
app.use((req, res, next) => {
  // Skip security headers for auth routes
  if (req.path.includes('/__/auth') || req.path.includes('/auth') || 
      req.path.includes('/login') || req.path.includes('/signup')) {
    console.log('Auth-related route detected, skipping security headers');
  }
  
  // NOTE: We're not manually setting CORS headers here anymore
  // as the cors middleware is handling that properly
  
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.VITE_MONGODB_URI;
const DB_NAME = 'notes-app';
let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Collection routes
app.post('/api/:collection/findOne', async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    const result = await collection.findOne(req.body.query || {});
    res.json(result || null);
  } catch (error) {
    console.error(`Error in findOne for ${req.params.collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:collection/find', async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    let query = collection.find(req.body.query || {});
    
    // Apply sort if provided
    if (req.body.options?.sort) {
      query = query.sort(req.body.options.sort);
    }
    
    // Apply limit if provided
    if (req.body.options?.limit) {
      query = query.limit(req.body.options.limit);
    }
    
    const result = await query.toArray();
    res.json(result || []);
  } catch (error) {
    console.error(`Error in find for ${req.params.collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:collection/insertOne', async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    const result = await collection.insertOne(req.body);
    res.json({ 
      insertedId: result.insertedId.toString(),
      acknowledged: result.acknowledged
    });
  } catch (error) {
    console.error(`Error in insertOne for ${req.params.collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:collection/updateOne', async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    const result = await collection.updateOne(req.body.filter, req.body.update);
    res.json({
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });
  } catch (error) {
    console.error(`Error in updateOne for ${req.params.collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/:collection/deleteOne', async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    const result = await collection.deleteOne(req.body.filter);
    res.json({
      deletedCount: result.deletedCount,
      acknowledged: result.acknowledged
    });
  } catch (error) {
    console.error(`Error in deleteOne for ${req.params.collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Specific API routes for users
app.post('/api/users/syncUser', async (req, res) => {
  try {
    if (!req.body.firebaseId) {
      return res.status(400).json({ error: 'Firebase ID is required' });
    }
    
    const usersCollection = db.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ firebaseId: req.body.firebaseId });
    
    if (existingUser) {
      // Update existing user
      const updateResult = await usersCollection.updateOne(
        { firebaseId: req.body.firebaseId },
        { 
          $set: { 
            ...req.body,
            updatedAt: new Date()
          } 
        }
      );
      
      res.json({ 
        id: existingUser._id.toString(), 
        firebaseId: req.body.firebaseId,
        ...existingUser,
        ...req.body,
        updated: true
      });
    } else {
      // Create new user
      const newUser = {
        firebaseId: req.body.firebaseId,
        email: req.body.email,
        displayName: req.body.displayName || '',
        photoURL: req.body.photoURL || '',
        provider: req.body.provider || 'password',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await usersCollection.insertOne(newUser);
      
      res.json({
        id: insertResult.insertedId.toString(),
        ...newUser,
        created: true
      });
    }
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a health-check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start the server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer(); 