// In browser environments, we'll use a mock implementation of MongoDB
// For actual database operations, use Firebase or the populate-db script

// Check if we're running in a browser
const isBrowser = typeof window !== 'undefined';

// Database Name
const dbName = 'notes-app';

// Mock ObjectId class for browser environment
export class ObjectId {
  constructor(id) {
    this.id = id || Math.random().toString(36).substring(2, 15);
  }

  toString() {
    return this.id;
  }

  equals(otherId) {
    return otherId && this.toString() === otherId.toString();
  }

  static isValid(id) {
    return typeof id === 'string' && id.length > 0;
  }
}

// In-memory mock data storage for browser environment
const mockData = {
  notes: [
    {
      _id: { toString: () => 'note-1' },
      title: 'Welcome to NoteTaker',
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started with NoteTaker. You can create, edit, and organize your notes.</p>',
      userId: 'sample-user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: true,
      isArchived: false,
      sectionId: 'section-1',
      tags: ['tag-1']
    },
    {
      _id: { toString: () => 'note-2' },
      title: 'Project Ideas',
      content: '<h2>Future Projects</h2><ul><li>Build a personal website</li><li>Learn a new programming language</li><li>Create a mobile app</li></ul>',
      userId: 'sample-user-123',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000),
      isPinned: false,
      isArchived: false,
      sectionId: 'section-2',
      tags: ['tag-2']
    }
  ],
  sections: [
    {
      _id: { toString: () => 'section-1' },
      name: 'Work',
      userId: 'sample-user-123',
      color: 'hsl(0, 70%, 80%)',
      icon: 'briefcase',
      createdAt: new Date()
    },
    {
      _id: { toString: () => 'section-2' },
      name: 'Personal',
      userId: 'sample-user-123',
      color: 'hsl(120, 70%, 80%)',
      icon: 'user',
      createdAt: new Date()
    }
  ],
  tags: [
    {
      _id: { toString: () => 'tag-1' },
      name: 'important',
      userId: 'sample-user-123',
      color: 'hsl(0, 70%, 80%)',
      createdAt: new Date()
    },
    {
      _id: { toString: () => 'tag-2' },
      name: 'idea',
      userId: 'sample-user-123',
      color: 'hsl(180, 70%, 80%)',
      createdAt: new Date()
    }
  ],
  versions: [
    {
      _id: { toString: () => 'version-1' },
      noteId: 'note-1',
      content: '<h1>Getting Started</h1><p>This is a sample note.</p>',
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      changeDescription: 'Initial version'
    }
  ],
  users: [
    {
      _id: { toString: () => 'sample-user-123' },
      firebaseId: 'sample-user-123',
      email: 'sample@example.com',
      displayName: 'Sample User',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

// Get a mock collection for browser use
const getMockCollection = (name) => {
  // Ensure the collection exists in mock data
  if (!mockData[name]) {
    mockData[name] = [];
  }
  
  return {
    find: (query = {}) => {
      // Simple implementation of find
      const filteredDocs = mockData[name].filter(doc => {
        // Basic query matching
        return Object.entries(query).every(([key, value]) => {
          // Handle $in operator
          if (key === 'tags' && value.$in) {
            return doc.tags && doc.tags.some(tag => value.$in.includes(tag));
          }
          return doc[key] === value;
        });
      });
      
      return {
        sort: (sortOptions = {}) => ({
          toArray: async () => {
            // Very basic sorting
            if (Object.keys(sortOptions).length === 0) {
              return filteredDocs;
            }
            
            return [...filteredDocs].sort((a, b) => {
              for (const [field, direction] of Object.entries(sortOptions)) {
                if (a[field] < b[field]) return direction === 1 ? -1 : 1;
                if (a[field] > b[field]) return direction === 1 ? 1 : -1;
              }
              return 0;
            });
          }
        })
      };
    },
    findOne: async (query = {}) => {
      return mockData[name].find(doc => {
        return Object.entries(query).every(([key, value]) => {
          if (key === '_id') {
            return doc._id.toString() === value.toString();
          }
          return doc[key] === value;
        });
      });
    },
    insertOne: async (doc) => {
      const id = Math.random().toString(36).substring(2, 15);
      const newDoc = { ...doc, _id: { toString: () => id } };
      mockData[name].push(newDoc);
      return { insertedId: newDoc._id };
    },
    insertMany: async (docs) => {
      const insertedIds = {};
      docs.forEach((doc, index) => {
        const id = Math.random().toString(36).substring(2, 15);
        const newDoc = { ...doc, _id: { toString: () => id } };
        mockData[name].push(newDoc);
        insertedIds[index] = newDoc._id;
      });
      return { insertedCount: docs.length, insertedIds };
    },
    updateOne: async (query, update) => {
      const index = mockData[name].findIndex(doc => {
        return Object.entries(query).every(([key, value]) => {
          if (key === '_id') {
            return doc._id.toString() === value.toString();
          }
          return doc[key] === value;
        });
      });
      
      if (index !== -1) {
        const updateSet = update.$set || {};
        mockData[name][index] = {
          ...mockData[name][index],
          ...updateSet
        };
        return { modifiedCount: 1 };
      }
      
      return { modifiedCount: 0 };
    },
    deleteOne: async (query) => {
      const initialLength = mockData[name].length;
      mockData[name] = mockData[name].filter(doc => {
        return !Object.entries(query).every(([key, value]) => {
          if (key === '_id') {
            return doc._id.toString() === value.toString();
          }
          return doc[key] === value;
        });
      });
      return { deletedCount: initialLength - mockData[name].length };
    },
    deleteMany: async (query = {}) => {
      if (Object.keys(query).length === 0) {
        // Delete all
        const count = mockData[name].length;
        mockData[name] = [];
        return { deletedCount: count };
      } else {
        // Delete matching
        const initialLength = mockData[name].length;
        mockData[name] = mockData[name].filter(doc => {
          return !Object.entries(query).every(([key, value]) => {
            if (key === '_id') {
              return doc._id.toString() === value.toString();
            }
            return doc[key] === value;
          });
        });
        return { deletedCount: initialLength - mockData[name].length };
      }
    }
  };
};

// Use browser-compatible mock implementation by default
let dbConnection = null;

export async function connectToDatabase() {
  if (isBrowser) {
    console.log('Using mock MongoDB implementation for browser');
    
    if (dbConnection) return dbConnection;
    
    // Create a mock DB connection
    dbConnection = {
      collection: (name) => getMockCollection(name)
    };
    return dbConnection;
  } else {
    if (dbConnection) return dbConnection;
    
    try {
      // Only import MongoClient in Node.js environment
      const { MongoClient } = await import('mongodb');
      const url = process.env.VITE_MONGODB_URI;
      const client = new MongoClient(url);
      
      // Connect to the MongoDB server
      await client.connect();
      console.log('Connected successfully to MongoDB server');
      
      // Select the database
      dbConnection = client.db(dbName);
      return dbConnection;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
}

export async function getCollection(collectionName) {
  const db = await connectToDatabase();
  return db.collection(collectionName);
}

export async function closeConnection() {
  if (isBrowser) {
    dbConnection = null;
    console.log('Mock MongoDB connection closed');
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

// Add a window unload listener to close the connection when the page is closed
if (isBrowser) {
  window.addEventListener('beforeunload', () => {
    closeConnection().catch(console.error);
  });
}

// User operations 
export async function createOrUpdateUser(userData) {
  const usersCol = await getCollection('users');
  
  // Check if user already exists
  const existingUser = await usersCol.findOne({ firebaseId: userData.firebaseId });
  
  if (existingUser) {
    // Update existing user
    await usersCol.updateOne(
      { firebaseId: userData.firebaseId },
      { 
        $set: { 
          ...userData,
          updatedAt: new Date()
        } 
      }
    );
    return { id: existingUser._id.toString(), ...existingUser, ...userData };
  } else {
    // Create new user
    const result = await usersCol.insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return { id: result.insertedId.toString(), ...userData };
  }
}

export default {
  connectToDatabase,
  getCollection,
  closeConnection
}; 