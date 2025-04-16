import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { auth } from '../lib/firebase';

// Import MongoDB services
import * as mongoService from '../lib/mongodb';
import { ObjectId } from '../lib/mongodb';

const notesCollection = 'notes';
const versionsCollection = 'versions';
const sectionsCollection = 'sections';
const tagsCollection = 'tags';

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Check if we're in mock mode - in browser we always use the mock MongoDB implementation
// In server environments, we use the real MongoDB if configured
const isMockMode = isBrowser || !db.collection;

// Check if we should use MongoDB
const useMongoDb = isBrowser || (!!import.meta.env.VITE_MONGODB_URI && import.meta.env.VITE_MONGODB_URI !== 'your-mongodb-uri');

// Mock data storage
const mockData = {
  notes: [
    {
      id: 'note-1',
      title: 'Welcome to NoteTaker',
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started with NoteTaker. You can create, edit, and organize your notes.</p>',
      userId: 'mock-user-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: true,
      isArchived: false,
      sectionId: 'section-1',
      tags: ['tag-1']
    },
    {
      id: 'note-2',
      title: 'Rich Text Formatting',
      content: '<h2>Formatting Options</h2><p>NoteTaker supports <strong>bold</strong>, <em>italic</em>, and other formatting options.</p><ul><li>Lists</li><li>Code blocks</li><li>And more!</li></ul>',
      userId: 'mock-user-id',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      isPinned: false,
      isArchived: false,
      sectionId: 'section-2',
      tags: ['tag-1', 'tag-2']
    },
    {
      id: 'note-3',
      title: 'Archived Note',
      content: '<p>This is an archived note.</p>',
      userId: 'mock-user-id',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      isPinned: false,
      isArchived: true,
      sectionId: null,
      tags: []
    }
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Getting Started',
      userId: 'mock-user-id',
      color: 'hsl(240, 70%, 80%)',
      icon: 'folder'
    },
    {
      id: 'section-2',
      name: 'Tutorials',
      userId: 'mock-user-id',
      color: 'hsl(120, 70%, 80%)',
      icon: 'folder'
    }
  ],
  tags: [
    {
      id: 'tag-1',
      name: 'important',
      userId: 'mock-user-id',
      color: 'hsl(0, 70%, 80%)'
    },
    {
      id: 'tag-2',
      name: 'tutorial',
      userId: 'mock-user-id',
      color: 'hsl(60, 70%, 80%)'
    }
  ],
  versions: [
    {
      id: 'version-1',
      noteId: 'note-1',
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started.</p>',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      changeDescription: 'Initial version'
    },
    {
      id: 'version-2',
      noteId: 'note-1',
      content: '<h1>Getting Started</h1><p>This is a sample note to help you get started with NoteTaker. You can create, edit, and organize your notes.</p>',
      createdAt: new Date().toISOString(),
      changeDescription: 'Added more content'
    }
  ]
};

// Custom error classes for better error handling
class NoteServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoteServiceError';
  }
}

class NotFoundError extends NoteServiceError {
  constructor(id) {
    super(`Note with ID ${id} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class AuthorizationError extends NoteServiceError {
  constructor() {
    super('You do not have permission to access this note');
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class NetworkError extends NoteServiceError {
  constructor(originalError) {
    super('Network error occurred while connecting to the server');
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.statusCode = 0;
  }
}

// Notes CRUD operations
export async function createNote(noteData, userId) {
  try {
    if (!userId) {
      throw new NoteServiceError('User ID is required to create a note');
    }
    
    const timestamp = new Date().toISOString();
    const newNote = {
      ...noteData,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      versions: [{
        content: noteData.content,
        timestamp,
        versionNumber: 1
      }]
    };
    
    // Use MongoDB if configured
    if (useMongoDb) {
      const notesCol = await mongoService.getCollection(notesCollection);
      
      const noteWithMetadata = {
        ...newNote,
        isPinned: false,
        isArchived: false
      };
      
      const result = await notesCol.insertOne(noteWithMetadata);
      
      // Create initial version
      const versionsCol = await mongoService.getCollection(versionsCollection);
      await versionsCol.insertOne({
        noteId: result.insertedId.toString(),
        content: noteData.content,
        createdAt: new Date(),
        changeDescription: 'Initial version'
      });
      
      return { id: result.insertedId.toString(), ...noteWithMetadata };
    }
    
    // Use mock data if in mock mode
    if (isMockMode) {
      const createdNote = {
        ...newNote,
        id: `note-${Date.now()}`,
      };
      
      mockData.notes.push(createdNote);
      
      // Create initial version
      mockData.versions.push({
        id: `version-${Date.now()}`,
        noteId: createdNote.id,
        content: noteData.content,
        createdAt: new Date().toISOString(),
        changeDescription: 'Initial version'
      });
      
      return createdNote;
    }
    
    // Use Firebase if neither MongoDB nor mock mode
    const noteWithMetadata = {
      ...newNote,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPinned: false,
      isArchived: false,
    };
    
    const docRef = await addDoc(collection(db, notesCollection), noteWithMetadata);
    
    // Create initial version
    await addDoc(collection(db, versionsCollection), {
      noteId: docRef.id,
      content: noteData.content,
      createdAt: serverTimestamp(),
      changeDescription: 'Initial version'
    });
    
    return { id: docRef.id, ...noteWithMetadata };
  } catch (error) {
    if (error instanceof NoteServiceError) {
      throw error;
    }
    
    if (error.name === 'AbortError' || error.code === 'unavailable') {
      throw new NetworkError(error);
    }
    
    console.error('Error in createNote:', error);
    throw new NoteServiceError(`Failed to create note: ${error.message}`);
  }
}

export async function updateNote(noteId, updateData) {
  try {
    // Get the current note first to make sure it exists and for version history
    const currentNote = await getNoteById(noteId);
    
    if (!currentNote) {
      throw new NotFoundError(noteId);
    }
    
    const timestamp = new Date().toISOString();
    let updatedNote = {
      ...currentNote,
      ...updateData,
      updatedAt: timestamp
    };
    
    // If content is being updated, add to version history
    if (updateData.content) {
      // Get the current versions or initialize if missing
      const versions = currentNote.versions || [];
      const versionNumber = versions.length + 1;
      
      updatedNote.versions = [
        ...versions,
        {
          content: updateData.content,
          timestamp,
          versionNumber
        }
      ];
      
      // Keep only the most recent 10 versions
      if (updatedNote.versions.length > 10) {
        updatedNote.versions = updatedNote.versions.slice(-10);
      }
    }
    
    // Use MongoDB if configured
    if (useMongoDb) {
      const notesCol = await mongoService.getCollection(notesCollection);
      
      // Save version history if content changed
      if (updateData.content && updateData.content !== currentNote.content) {
        const versionsCol = await mongoService.getCollection(versionsCollection);
        await versionsCol.insertOne({
          noteId,
          content: updateData.content,
          createdAt: new Date(),
          changeDescription: updateData.changeDescription || 'Updated note'
        });
      }
      
      // Update the note
      const result = await notesCol.updateOne(
        { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) },
        { 
          $set: { 
            ...updatedNote,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.modifiedCount === 0) {
        console.warn(`Note ${noteId} not modified. Data may be unchanged or update failed.`);
      }
      
      return { id: noteId, ...updatedNote };
    }
    
    // Use mock data if in mock mode
    if (isMockMode) {
      const noteIndex = mockData.notes.findIndex(note => note.id === noteId);
      
      // Only save version history if content changed
      if (updateData.content && updateData.content !== currentNote.content) {
        mockData.versions.push({
          id: `version-${Date.now()}`,
          noteId,
          content: updateData.content,
          createdAt: new Date().toISOString(),
          changeDescription: updateData.changeDescription || 'Updated note'
        });
      }
      
      const updatedNote = {
        ...currentNote,
        ...updatedNote,
        updatedAt: new Date().toISOString()
      };
      
      mockData.notes[noteIndex] = updatedNote;
      return updatedNote;
    }
    
    // Use Firebase if neither MongoDB nor mock mode
    const noteRef = doc(db, notesCollection, noteId);
    
    try {
      // Only save version history if content changed
      if (updateData.content && updateData.content !== currentNote.content) {
        await addDoc(collection(db, versionsCollection), {
          noteId,
          content: updateData.content,
          createdAt: serverTimestamp(),
          changeDescription: updateData.changeDescription || 'Updated note'
        });
      }
      
      const updates = {
        ...updatedNote,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(noteRef, updates);
      return { id: noteId, ...updates };
    } catch (error) {
      console.error(`Error updating note in Firebase: ${error.message}`);
      throw error;
    }
  } catch (error) {
    if (error instanceof NoteServiceError) {
      throw error;
    }
    
    if (error.code === 'permission-denied') {
      throw new AuthorizationError();
    }
    
    if (error.name === 'AbortError' || error.code === 'unavailable') {
      throw new NetworkError(error);
    }
    
    console.error(`Error in updateNote: ${error.message}`);
    throw error;
  }
}

export async function deleteNote(noteId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    try {
      if (!noteId) {
        throw new NotFoundError('invalid-id');
      }
      
      const notesCol = await mongoService.getCollection(notesCollection);
      
      // Try multiple query approaches to ensure we find the note
      let result;
      
      // Try with string ID first
      try {
        result = await notesCol.deleteOne({ _id: noteId });
      } catch (error) {
        console.log('Failed to delete note with string ID, trying with ObjectId', error);
      }
      
      // If that didn't work, try with ObjectId
      if (!result || result.deletedCount === 0) {
        try {
          const query = { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) };
          result = await notesCol.deleteOne(query);
        } catch (error) {
          console.log('Failed to delete note with ObjectId', error);
        }
      }
      
      // If still no luck, try finding by noteId field
      if (!result || result.deletedCount === 0) {
        result = await notesCol.deleteOne({ noteId: noteId });
      }
      
      // If we still couldn't delete anything, throw an error
      if (!result || result.deletedCount === 0) {
        console.error(`Failed to delete note with ID ${noteId}, note not found`);
        throw new NotFoundError(noteId);
      }
      
      console.log(`Successfully deleted note with ID ${noteId}`);
      
      // Delete associated versions
      const versionsCol = await mongoService.getCollection(versionsCollection);
      await versionsCol.deleteMany({ noteId });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteNote:', error);
      
      // Convert generic errors to NotFoundError if appropriate
      if (error.message === 'Note not found' || error.message.includes('not found')) {
        throw new NotFoundError(noteId);
      }
      
      throw error;
    }
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const originalLength = mockData.notes.length;
    mockData.notes = mockData.notes.filter(note => note.id !== noteId);
    
    if (mockData.notes.length === originalLength) {
      throw new NotFoundError(noteId);
    }
    
    mockData.versions = mockData.versions.filter(version => version.noteId !== noteId);
    return { success: true };
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  try {
    await deleteDoc(doc(db, notesCollection, noteId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting Firebase note:', error);
    
    // Convert generic errors to NotFoundError if appropriate
    if (error.code === 'not-found' || error.message.includes('not found')) {
      throw new NotFoundError(noteId);
    }
    
    throw error;
  }
}

export async function getNoteById(noteId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    try {
      if (!noteId) {
        console.error('Invalid noteId: noteId is undefined or null');
        throw new NotFoundError('invalid-id');
      }
      
      console.log("Attempting to retrieve note with ID:", noteId);
      
      const notesCol = await mongoService.getCollection(notesCollection);
      
      // First try with the string ID as-is
      let note;
      
      try {
        // Try to find by string ID first
        console.log("Trying to find by string ID:", noteId);
        note = await notesCol.findOne({ _id: noteId });
      } catch (error) {
        console.log('Failed to find note with string ID, trying with ObjectId', error);
      }
      
      // If not found, try with ObjectId
      if (!note) {
        try {
          // Create a proper ObjectId or use a toString object for browser
          console.log("Trying with ObjectId:", noteId);
          const query = { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) };
          note = await notesCol.findOne(query);
        } catch (error) {
          console.log('Failed to find note with ObjectId', error);
        }
      }
      
      // If still not found, try to find by plain ID field
      if (!note) {
        try {
          console.log("Trying to find by id field:", noteId);
          note = await notesCol.findOne({ id: noteId });
        } catch (error) {
          console.log('Failed to find note with id field', error);
        }
      }
      
      if (!note) {
        console.log(`Note not found in MongoDB: ${noteId}`);
        throw new NotFoundError(noteId);
      }
      
      console.log('Found note:', noteId);
      return { id: note._id.toString(), ...note };
    } catch (error) {
      console.error('Error in getNoteById:', error);
      
      // Convert generic errors to NotFoundError if appropriate
      if (error.message === 'Note not found' || error.message.includes('not found')) {
        throw new NotFoundError(noteId);
      }
      
      throw error;
    }
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const note = mockData.notes.find(note => note.id === noteId);
    
    if (!note) {
      console.log(`Note not found in mock data: ${noteId}`);
      throw new NotFoundError(noteId);
    }
    
    return note;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  try {
    const noteDoc = await getDoc(doc(db, notesCollection, noteId));
    
    if (!noteDoc.exists()) {
      console.log(`Note not found in Firebase: ${noteId}`);
      throw new NotFoundError(noteId);
    }
    
    return { id: noteDoc.id, ...noteDoc.data() };
  } catch (error) {
    console.error('Error in Firebase getDoc:', error);
    
    // Convert generic errors to NotFoundError if appropriate
    if (error.message === 'Note not found' || error.message.includes('not found') || !error.code) {
      throw new NotFoundError(noteId);
    }
    
    throw error;
  }
}

export async function getNotesByUser(userId, filters = {}) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const notesCol = await mongoService.getCollection(notesCollection);
    
    // Build the query
    const query = { userId };
    
    if (filters.sectionId) {
      query.sectionId = filters.sectionId;
    }
    
    if (filters.isPinned !== undefined) {
      query.isPinned = filters.isPinned;
    }
    
    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }
    
    if (filters.tag) {
      query.tags = { $in: [filters.tag] };
    }
    
    // Build the sort options
    const sortOptions = {};
    
    if (filters.orderBy) {
      sortOptions[filters.orderBy] = filters.orderDirection === 'asc' ? 1 : -1;
    } else {
      sortOptions.updatedAt = -1; // Default sort by updatedAt descending
    }
    
    // Always sort by isPinned first (pinned notes at the top)
    const notes = await notesCol.find(query).sort({ isPinned: -1, ...sortOptions }).toArray();
    
    // Map the results to include string IDs
    return notes.map(note => ({
      id: note._id.toString(),
      ...note
    }));
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    let filteredNotes = mockData.notes.filter(note => note.userId === userId);
    
    // Apply filters
    if (filters.sectionId) {
      filteredNotes = filteredNotes.filter(note => note.sectionId === filters.sectionId);
    }
    
    if (filters.isPinned !== undefined) {
      filteredNotes = filteredNotes.filter(note => note.isPinned === filters.isPinned);
    }
    
    if (filters.isArchived !== undefined) {
      filteredNotes = filteredNotes.filter(note => note.isArchived === filters.isArchived);
    }
    
    if (filters.tag) {
      filteredNotes = filteredNotes.filter(note => note.tags && note.tags.includes(filters.tag));
    }
    
    // Apply sorting
    return filteredNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB - dateA;
    });
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  let notesQuery = query(
    collection(db, notesCollection), 
    where('userId', '==', userId)
  );
  
  // Apply filters
  if (filters.sectionId) {
    notesQuery = query(notesQuery, where('sectionId', '==', filters.sectionId));
  }
  
  if (filters.isPinned !== undefined) {
    notesQuery = query(notesQuery, where('isPinned', '==', filters.isPinned));
  }
  
  if (filters.isArchived !== undefined) {
    notesQuery = query(notesQuery, where('isArchived', '==', filters.isArchived));
  }
  
  if (filters.tag) {
    notesQuery = query(notesQuery, where('tags', 'array-contains', filters.tag));
  }
  
  // Apply sorting
  if (filters.orderBy) {
    notesQuery = query(notesQuery, orderBy(filters.orderBy, filters.orderDirection || 'desc'));
  } else {
    notesQuery = query(notesQuery, orderBy('updatedAt', 'desc'));
  }
  
  const querySnapshot = await getDocs(notesQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Version history operations
export async function getNoteVersions(noteId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const versionsCol = await mongoService.getCollection(versionsCollection);
    
    const versions = await versionsCol.find({ noteId }).sort({ createdAt: -1 }).toArray();
    
    return versions.map(version => ({
      id: version._id.toString(),
      ...version
    }));
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    return mockData.versions
      .filter(version => version.noteId === noteId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const versionsQuery = query(
    collection(db, versionsCollection),
    where('noteId', '==', noteId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(versionsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Sections operations
export async function createSection(sectionData, userId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const sectionsCol = await mongoService.getCollection(sectionsCollection);
    
    const sectionWithMetadata = {
      ...sectionData,
      userId,
      createdAt: new Date()
    };
    
    const result = await sectionsCol.insertOne(sectionWithMetadata);
    
    return { id: result.insertedId.toString(), ...sectionWithMetadata };
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const newSection = {
      ...sectionData,
      id: `section-${Date.now()}`,
      userId,
      createdAt: new Date().toISOString()
    };
    
    mockData.sections.push(newSection);
    return newSection;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const sectionWithMetadata = {
    ...sectionData,
    userId,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, sectionsCollection), sectionWithMetadata);
  return { id: docRef.id, ...sectionWithMetadata };
}

export async function getSectionsByUser(userId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const sectionsCol = await mongoService.getCollection(sectionsCollection);
    
    const sections = await sectionsCol.find({ userId }).sort({ name: 1 }).toArray();
    
    return sections.map(section => ({
      id: section._id.toString(),
      ...section
    }));
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    return mockData.sections
      .filter(section => section.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const sectionsQuery = query(
    collection(db, sectionsCollection),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(sectionsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Tags operations
export async function createTag(tagData, userId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const tagsCol = await mongoService.getCollection(tagsCollection);
    
    const tagWithMetadata = {
      ...tagData,
      userId,
      createdAt: new Date()
    };
    
    const result = await tagsCol.insertOne(tagWithMetadata);
    
    return { id: result.insertedId.toString(), ...tagWithMetadata };
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const newTag = {
      ...tagData,
      id: `tag-${Date.now()}`,
      userId,
      createdAt: new Date().toISOString()
    };
    
    mockData.tags.push(newTag);
    return newTag;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const tagWithMetadata = {
    ...tagData,
    userId,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, tagsCollection), tagWithMetadata);
  return { id: docRef.id, ...tagWithMetadata };
}

export async function getTagsByUser(userId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const tagsCol = await mongoService.getCollection(tagsCollection);
    
    const tags = await tagsCol.find({ userId }).sort({ name: 1 }).toArray();
    
    return tags.map(tag => ({
      id: tag._id.toString(),
      ...tag
    }));
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    return mockData.tags
      .filter(tag => tag.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const tagsQuery = query(
    collection(db, tagsCollection),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(tagsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Search notes
export async function searchNotes(userId, searchTerm) {
  // Use MongoDB if configured
  if (useMongoDb) {
    if (!searchTerm) return [];
    
    const notesCol = await mongoService.getCollection(notesCollection);
    
    // Simple search implementation for MongoDB in browser
    // For a real app, you would use text search or a dedicated search service
    const notes = await notesCol.find({ userId }).toArray();
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results = notes.filter(note => 
      (note.title && note.title.toLowerCase().includes(lowerSearchTerm)) ||
      (note.content && note.content.toLowerCase().includes(lowerSearchTerm))
    );
    
    return results.map(note => ({
      id: note._id.toString(),
      ...note
    }));
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    if (!searchTerm) return [];
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return mockData.notes.filter(note => 
      note.userId === userId && (
        note.title.toLowerCase().includes(lowerSearchTerm) ||
        note.content.toLowerCase().includes(lowerSearchTerm)
      )
    );
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  // This is a simple implementation - in a real app you would use
  // Firestore's full-text search capabilities or a third-party service like Algolia
  const notesQuery = query(
    collection(db, notesCollection),
    where('userId', '==', userId),
    orderBy('title', 'asc')
  );
  
  const querySnapshot = await getDocs(notesQuery);
  const allNotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter notes client-side
  const lowerSearchTerm = searchTerm.toLowerCase();
  return allNotes.filter(note => 
    note.title.toLowerCase().includes(lowerSearchTerm) ||
    note.content.toLowerCase().includes(lowerSearchTerm)
  );
} 