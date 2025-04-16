import { MongoClient, ObjectId } from 'mongodb';

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// API base URL for browser environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Database name
const dbName = 'notes-app';

let dbConnection = null;
let connectionAttempted = false;
let connectionError = null;

// Helper function to make API requests to your backend
export async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Include cookies for session authentication
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
}

export async function connectToDatabase() {
  if (isBrowser) {
    console.log('Connecting to MongoDB via API endpoints');
    
    if (dbConnection) return dbConnection;
    
    // In browser, we'll use a proxy object that makes API calls
    dbConnection = {
      collection: (name) => ({
        // Implement collection methods that make API calls
        findOne: async (query) => {
          try {
            return await apiRequest(`${name}/findOne`, 'POST', { query });
          } catch (error) {
            console.error(`Error in findOne from ${name}:`, error);
            return null;
          }
        },
        find: (query = {}) => {
          // Return an object with chainable methods
          return {
            sort: (sortOptions = {}) => {
              return {
                toArray: async () => {
                  try {
                    return await apiRequest(`${name}/find`, 'POST', { 
                      query,
                      options: { sort: sortOptions }
                    });
                  } catch (error) {
                    console.error(`Error in find from ${name}:`, error);
                    return [];
                  }
                }
              };
            },
            limit: (limitVal) => {
              return {
                toArray: async () => {
                  try {
                    return await apiRequest(`${name}/find`, 'POST', { 
                      query,
                      options: { limit: limitVal }
                    });
                  } catch (error) {
                    console.error(`Error in find from ${name}:`, error);
                    return [];
                  }
                }
              };
            },
            toArray: async () => {
              try {
                return await apiRequest(`${name}/find`, 'POST', { query });
              } catch (error) {
                console.error(`Error in find from ${name}:`, error);
                return [];
              }
            }
          };
        },
        insertOne: async (doc) => {
          try {
            return await apiRequest(`${name}/insertOne`, 'POST', doc);
          } catch (error) {
            console.error(`Error in insertOne to ${name}:`, error);
            throw error;
          }
        },
        updateOne: async (filter, update) => {
          try {
            return await apiRequest(`${name}/updateOne`, 'POST', { filter, update });
          } catch (error) {
            console.error(`Error in updateOne to ${name}:`, error);
            throw error;
          }
        },
        deleteOne: async (filter) => {
          try {
            return await apiRequest(`${name}/deleteOne`, 'POST', { filter });
          } catch (error) {
            console.error(`Error in deleteOne from ${name}:`, error);
            throw error;
          }
        },
        deleteMany: async (filter) => {
          try {
            return await apiRequest(`${name}/deleteMany`, 'POST', { filter });
          } catch (error) {
            console.error(`Error in deleteMany from ${name}:`, error);
            throw error;
          }
        }
      })
    };
    
    connectionAttempted = true;
    return dbConnection;
  }
  
  // Server-side MongoDB connection
  if (dbConnection) return dbConnection;
  
  if (connectionError) {
    console.warn('Returning mock implementation due to previous connection error');
    return {
      collection: (name) => ({
        findOne: () => Promise.resolve({}),
        find: () => Promise.resolve([]),
        insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
        updateOne: () => Promise.resolve({ modifiedCount: 1 }),
        deleteOne: () => Promise.resolve({ deletedCount: 1 }),
        deleteMany: () => Promise.resolve({ deletedCount: 1 })
      })
    };
  }
  
  try {
    // Only import MongoClient in Node.js environment
    const url = process.env.VITE_MONGODB_URI || import.meta.env.VITE_MONGODB_URI;
    
    if (!url || url === 'your-mongodb-uri') {
      console.warn('MongoDB URI not provided, using mock implementation');
      connectionError = new Error('MongoDB URI not provided');
      return {
        collection: (name) => ({
          findOne: () => Promise.resolve({}),
          find: () => Promise.resolve([]),
          insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
          updateOne: () => Promise.resolve({ modifiedCount: 1 }),
          deleteOne: () => Promise.resolve({ deletedCount: 1 }),
          deleteMany: () => Promise.resolve({ deletedCount: 1 })
        })
      };
    }
    
    const client = new MongoClient(url);
    
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Select the database
    dbConnection = client.db(dbName);
    connectionAttempted = true;
    return dbConnection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    connectionError = error;
    
    // Fallback to mock implementation
    return {
      collection: (name) => ({
        findOne: () => Promise.resolve({}),
        find: () => Promise.resolve([]),
        insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
        updateOne: () => Promise.resolve({ modifiedCount: 1 }),
        deleteOne: () => Promise.resolve({ deletedCount: 1 }),
        deleteMany: () => Promise.resolve({ deletedCount: 1 })
      })
    };
  }
}

export async function getCollection(collectionName) {
  try {
    const db = await connectToDatabase();
    return db.collection(collectionName);
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    // Return a mock collection as fallback
    return {
      findOne: () => Promise.resolve({}),
      find: () => Promise.resolve([]),
      insertOne: () => Promise.resolve({ insertedId: new ObjectId() }),
      updateOne: () => Promise.resolve({ modifiedCount: 1 }),
      deleteOne: () => Promise.resolve({ deletedCount: 1 }),
      deleteMany: () => Promise.resolve({ deletedCount: 1 })
    };
  }
}

export async function closeConnection() {
  if (isBrowser) {
    dbConnection = null;
    console.log('Browser MongoDB connection closed');
  } else {
    // This code will never run in the browser due to tree-shaking
    // We would need to get a reference to the client
    try {
      const client = null; // In a real implementation, store the client reference
      if (client) {
        await client.close();
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
    dbConnection = null;
  }
}

// Synchronize user data with MongoDB
export async function createOrUpdateUser(userData) {
  if (!userData || !userData.uid) {
    throw new Error('Invalid user data');
  }
  
  try {
    const usersCol = await getCollection('users');
    
    // Check if user already exists
    const existingUser = await usersCol.findOne({ uid: userData.uid });
    
    if (existingUser) {
      // Update existing user
      await usersCol.updateOne(
        { uid: userData.uid },
        { 
          $set: { 
            ...userData,
            lastLogin: new Date()
          } 
        }
      );
      return { ...existingUser, ...userData, lastLogin: new Date() };
    } else {
      // Create new user
      const newUser = {
        ...userData,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await usersCol.insertOne(newUser);
      return { _id: result.insertedId, ...newUser };
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
}

// Add a window unload listener to close the connection when the page is closed
if (isBrowser) {
  window.addEventListener('beforeunload', () => {
    closeConnection().catch(console.error);
  });
}

export { ObjectId };

export default {
  connectToDatabase,
  getCollection,
  closeConnection,
  createOrUpdateUser,
  apiRequest,
  ObjectId
}; 