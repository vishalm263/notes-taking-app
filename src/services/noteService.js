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
  serverTimestamp 
} from 'firebase/firestore';

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

// Notes CRUD operations
export async function createNote(noteData, userId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const notesCol = await mongoService.getCollection(notesCollection);
    
    const noteWithMetadata = {
      ...noteData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    const newNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      isArchived: false,
    };
    
    mockData.notes.push(newNote);
    
    // Create initial version
    mockData.versions.push({
      id: `version-${Date.now()}`,
      noteId: newNote.id,
      content: noteData.content,
      createdAt: new Date().toISOString(),
      changeDescription: 'Initial version'
    });
    
    return newNote;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const noteWithMetadata = {
    ...noteData,
    userId,
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
}

export async function updateNote(noteId, updateData) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const notesCol = await mongoService.getCollection(notesCollection);
    
    // Get the current note
    const query = { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) };
    const currentNote = await notesCol.findOne(query);
    
    if (!currentNote) {
      throw new Error('Note not found');
    }
    
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
      query,
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount === 0) {
      throw new Error('Failed to update note');
    }
    
    return { id: noteId, ...updateData };
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const noteIndex = mockData.notes.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      throw new Error('Note not found');
    }
    
    const currentNote = mockData.notes[noteIndex];
    
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
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    mockData.notes[noteIndex] = updatedNote;
    return updatedNote;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const noteRef = doc(db, notesCollection, noteId);
  const noteDoc = await getDoc(noteRef);
  
  if (!noteDoc.exists()) {
    throw new Error('Note not found');
  }
  
  // Only save version history if content changed
  if (updateData.content && updateData.content !== noteDoc.data().content) {
    await addDoc(collection(db, versionsCollection), {
      noteId,
      content: updateData.content,
      createdAt: serverTimestamp(),
      changeDescription: updateData.changeDescription || 'Updated note'
    });
  }
  
  const updates = {
    ...updateData,
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(noteRef, updates);
  return { id: noteId, ...updates };
}

export async function deleteNote(noteId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const notesCol = await mongoService.getCollection(notesCollection);
    const query = { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) };
    
    const result = await notesCol.deleteOne(query);
    
    if (result.deletedCount === 0) {
      throw new Error('Note not found');
    }
    
    // Delete associated versions
    const versionsCol = await mongoService.getCollection(versionsCollection);
    await versionsCol.deleteMany({ noteId });
    
    return { success: true };
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    mockData.notes = mockData.notes.filter(note => note.id !== noteId);
    mockData.versions = mockData.versions.filter(version => version.noteId !== noteId);
    return { success: true };
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  await deleteDoc(doc(db, notesCollection, noteId));
  return { success: true };
}

export async function getNoteById(noteId) {
  // Use MongoDB if configured
  if (useMongoDb) {
    const notesCol = await mongoService.getCollection(notesCollection);
    const query = { _id: isBrowser ? { toString: () => noteId } : new ObjectId(noteId) };
    
    const note = await notesCol.findOne(query);
    
    if (!note) {
      throw new Error('Note not found');
    }
    
    return { id: note._id.toString(), ...note };
  }
  
  // Use mock data if in mock mode
  if (isMockMode) {
    const note = mockData.notes.find(note => note.id === noteId);
    
    if (!note) {
      throw new Error('Note not found');
    }
    
    return note;
  }
  
  // Use Firebase if neither MongoDB nor mock mode
  const noteDoc = await getDoc(doc(db, notesCollection, noteId));
  
  if (!noteDoc.exists()) {
    throw new Error('Note not found');
  }
  
  return { id: noteDoc.id, ...noteDoc.data() };
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