// MongoDB database population script
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Connection URL from .env file
const url = process.env.VITE_MONGODB_URI;
if (!url) {
  console.error('MongoDB URI is not set. Please check your .env file.');
  process.exit(1);
}

const dbName = 'notes-app';

// Collection names
const NOTES_COLLECTION = 'notes';
const VERSIONS_COLLECTION = 'versions';
const SECTIONS_COLLECTION = 'sections';
const TAGS_COLLECTION = 'tags';
const USERS_COLLECTION = 'users';

// Sample user ID - replace with a real user ID when using in production
const SAMPLE_USER_ID = 'sample-user-123';

// Sample data
const sampleData = {
  users: [
    {
      firebaseId: SAMPLE_USER_ID,
      email: 'sample@example.com',
      displayName: 'Sample User',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  sections: [
    {
      name: 'Work',
      userId: SAMPLE_USER_ID,
      color: 'hsl(0, 70%, 80%)',
      icon: 'briefcase',
      createdAt: new Date()
    },
    {
      name: 'Personal',
      userId: SAMPLE_USER_ID,
      color: 'hsl(120, 70%, 80%)',
      icon: 'user',
      createdAt: new Date()
    },
    {
      name: 'Projects',
      userId: SAMPLE_USER_ID,
      color: 'hsl(240, 70%, 80%)',
      icon: 'folder',
      createdAt: new Date()
    }
  ],
  tags: [
    {
      name: 'important',
      userId: SAMPLE_USER_ID,
      color: 'hsl(0, 70%, 80%)',
      createdAt: new Date()
    },
    {
      name: 'todo',
      userId: SAMPLE_USER_ID,
      color: 'hsl(60, 70%, 80%)',
      createdAt: new Date()
    },
    {
      name: 'idea',
      userId: SAMPLE_USER_ID,
      color: 'hsl(180, 70%, 80%)',
      createdAt: new Date()
    }
  ]
};

// Function to create notes and versions
function createNotesAndVersions(sectionIds, tagIds) {
  const currentDate = new Date();
  
  const notes = [
    {
      title: 'Welcome to NoteTaker',
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started with NoteTaker. You can create, edit, and organize your notes.</p>',
      userId: SAMPLE_USER_ID,
      createdAt: currentDate,
      updatedAt: currentDate,
      isPinned: true,
      isArchived: false,
      sectionId: sectionIds[0],
      tags: [tagIds[0]]
    },
    {
      title: 'Project Ideas',
      content: '<h2>Future Projects</h2><ul><li>Build a personal website</li><li>Learn a new programming language</li><li>Create a mobile app</li></ul>',
      userId: SAMPLE_USER_ID,
      createdAt: new Date(currentDate - 86400000), // 1 day ago
      updatedAt: new Date(currentDate - 86400000),
      isPinned: false,
      isArchived: false,
      sectionId: sectionIds[2],
      tags: [tagIds[2]]
    },
    {
      title: 'Shopping List',
      content: '<h3>Groceries</h3><ul><li>Milk</li><li>Eggs</li><li>Bread</li><li>Fruits</li></ul>',
      userId: SAMPLE_USER_ID,
      createdAt: new Date(currentDate - 172800000), // 2 days ago
      updatedAt: new Date(currentDate - 172800000),
      isPinned: false,
      isArchived: false,
      sectionId: sectionIds[1],
      tags: [tagIds[1]]
    }
  ];
  
  // Generate versions for the first note
  const versions = [
    {
      noteId: null, // Will be set after note creation
      content: '<h1>Getting Started</h1><p>This is a sample note.</p>',
      createdAt: new Date(currentDate - 3600000), // 1 hour ago
      changeDescription: 'Initial version'
    },
    {
      noteId: null, // Will be set after note creation
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started with NoteTaker. You can create, edit, and organize your notes.</p>',
      createdAt: currentDate,
      changeDescription: 'Added more content'
    }
  ];
  
  return { notes, versions };
}

async function populateDatabase() {
  let client;
  
  try {
    client = new MongoClient(url);
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    const db = client.db(dbName);
    
    // Clear existing collections
    await db.collection(NOTES_COLLECTION).deleteMany({});
    await db.collection(VERSIONS_COLLECTION).deleteMany({});
    await db.collection(SECTIONS_COLLECTION).deleteMany({});
    await db.collection(TAGS_COLLECTION).deleteMany({});
    await db.collection(USERS_COLLECTION).deleteMany({});
    
    console.log('Cleared existing collections');
    
    // Insert users
    const userResult = await db.collection(USERS_COLLECTION).insertMany(sampleData.users);
    console.log(`${userResult.insertedCount} users inserted`);
    
    // Insert sections
    const sectionResult = await db.collection(SECTIONS_COLLECTION).insertMany(sampleData.sections);
    console.log(`${sectionResult.insertedCount} sections inserted`);
    const sectionIds = Object.values(sectionResult.insertedIds).map(id => id.toString());
    
    // Insert tags
    const tagResult = await db.collection(TAGS_COLLECTION).insertMany(sampleData.tags);
    console.log(`${tagResult.insertedCount} tags inserted`);
    const tagIds = Object.values(tagResult.insertedIds).map(id => id.toString());
    
    // Create notes data with section and tag references
    const { notes, versions } = createNotesAndVersions(sectionIds, tagIds);
    
    // Insert notes
    const noteResult = await db.collection(NOTES_COLLECTION).insertMany(notes);
    console.log(`${noteResult.insertedCount} notes inserted`);
    
    // Set note IDs for versions
    versions.forEach(version => {
      version.noteId = noteResult.insertedIds[0].toString();
    });
    
    // Insert versions
    const versionResult = await db.collection(VERSIONS_COLLECTION).insertMany(versions);
    console.log(`${versionResult.insertedCount} versions inserted`);
    
    console.log('Database populated successfully');
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
  }
}

// Run the function
populateDatabase(); 