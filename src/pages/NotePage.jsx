import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNoteStore } from '../lib/store';
import NoteEditor from '../components/NoteEditor';
import { Button } from '../components/ui/button';
import { getNoteById, updateNote, deleteNote, getNoteVersions, createNote } from '../services/noteService';
import { debounce } from '../lib/utils';
import {
  Pin,
  Archive,
  Trash,
  Clock,
  History,
  Save,
  ChevronLeft,
  MoreVertical,
  Folder
} from 'lucide-react';

const NotePage = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  
  const activeNote = useNoteStore(state => state.activeNote);
  const sections = useNoteStore(state => state.sections);
  const setActiveNote = useNoteStore(state => state.setActiveNote);
  const updateActiveNote = useNoteStore(state => state.updateActiveNote);
  const togglePinNote = useNoteStore(state => state.togglePinNote);
  const toggleArchiveNote = useNoteStore(state => state.toggleArchiveNote);
  const removeNote = useNoteStore(state => state.removeNote);
  const addNote = useNoteStore(state => state.addNote);
  
  // Load note data
  useEffect(() => {
    const loadNote = async () => {
      if (noteId === 'new') {
        // Creating a new note
        setActiveNote(null);
        setTitle('');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const note = await getNoteById(noteId);
        
        if (note.userId !== currentUser.uid) {
          // Note doesn't belong to current user
          navigate('/notes');
          return;
        }
        
        setActiveNote(noteId);
        setTitle(note.title || '');
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading note:', error);
        navigate('/notes');
      }
    };
    
    if (currentUser) {
      loadNote();
    }
  }, [currentUser, noteId, navigate, setActiveNote]);
  
  // Load version history
  useEffect(() => {
    if (noteId !== 'new' && currentUser) {
      getNoteVersions(noteId)
        .then(versionData => {
          setVersions(versionData);
        })
        .catch(error => {
          console.error('Error fetching versions:', error);
        });
    }
  }, [noteId, currentUser]);
  
  const saveTitle = debounce(async (noteId, newTitle) => {
    if (currentUser && noteId) {
      setIsSaving(true);
      
      try {
        await updateNote(noteId, { title: newTitle });
        updateActiveNote({ title: newTitle });
      } catch (error) {
        console.error('Error updating title:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, 500);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (activeNote?.id) {
      saveTitle(activeNote.id, newTitle);
    }
  };

  const handleCreateNote = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your note');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const noteData = {
        title: title.trim(),
        content: '<p>Start writing your note here...</p>',
        sectionId: null,
        tags: []
      };
      
      const newNote = await createNote(noteData, currentUser.uid);
      addNote(newNote);
      navigate(`/notes/${newNote.id}`);
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNote?.id || noteId === 'new') return;
    
    const confirm = window.confirm('Are you sure you want to delete this note? This action cannot be undone.');
    
    if (confirm) {
      try {
        await deleteNote(activeNote.id);
        removeNote(activeNote.id);
        navigate('/notes');
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const getSectionName = (sectionId) => {
    if (!sectionId) return 'No section';
    const section = sections.find(section => section.id === sectionId);
    return section ? section.name : 'Unknown section';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notes')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          {noteId === 'new' ? (
            <h1 className="text-xl font-medium">New Note</h1>
          ) : (
            <div className="flex items-center space-x-2">
              {activeNote?.sectionId && (
                <div className="text-sm text-muted-foreground flex items-center">
                  <Folder className="h-4 w-4 mr-1" />
                  {getSectionName(activeNote.sectionId)}
                </div>
              )}
              
              {isSaving && (
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-1 animate-pulse" />
                  Saving...
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {noteId !== 'new' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePinNote(activeNote.id)}
                title={activeNote?.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={`h-5 w-5 ${activeNote?.isPinned ? 'fill-primary text-primary' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleArchiveNote(activeNote.id)}
                title={activeNote?.isArchived ? 'Unarchive note' : 'Archive note'}
              >
                <Archive className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                title="Version history"
              >
                <History className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteNote}
                title="Delete note"
              >
                <Trash className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title"
            className="w-full text-2xl font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          />
        </div>
        
        {noteId === 'new' ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-4">
              Enter a title and click Create to start your new note
            </p>
            <Button onClick={handleCreateNote} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Note'}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <NoteEditor note={activeNote} />
          </div>
        )}
      </div>
      
      {showVersionHistory && (
        <div className="border-t p-4 bg-card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Version History</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVersionHistory(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No version history available</p>
            ) : (
              <ul className="space-y-2">
                {versions.map(version => (
                  <li key={version.id} className="text-sm border rounded-md p-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(version.createdAt?.toDate?.() || version.createdAt).toLocaleString()}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6"
                        onClick={() => {
                          // Restore this version
                          updateNote(noteId, { content: version.content });
                          updateActiveNote({ content: version.content });
                          setShowVersionHistory(false);
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {version.changeDescription}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotePage; 