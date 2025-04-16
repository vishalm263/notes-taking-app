import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNoteStore } from '../lib/store';
import NoteEditor from '../components/NoteEditor';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
import { toast, useToast } from '../components/ui/use-toast';

const NotePage = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { toast: useToastToast } = useToast();
  
  // Parse URL query parameters to get sectionId if available
  const queryParams = new URLSearchParams(location.search);
  const sectionIdFromUrl = queryParams.get('sectionId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [tempNote, setTempNote] = useState(null);
  const [error, setError] = useState(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;
  
  const activeNote = useNoteStore(state => state.activeNote);
  const sections = useNoteStore(state => state.sections);
  const activeSection = useNoteStore(state => state.activeSection);
  const setActiveNote = useNoteStore(state => state.setActiveNote);
  const updateActiveNote = useNoteStore(state => state.updateActiveNote);
  const togglePinNote = useNoteStore(state => state.togglePinNote);
  const toggleArchiveNote = useNoteStore(state => state.toggleArchiveNote);
  const removeNote = useNoteStore(state => state.removeNote);
  const addNote = useNoteStore(state => state.addNote);
  
  // Load note data
  const loadNote = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    if (noteId === 'new') {
      // For new notes, set sectionId if available from URL or active section
      const sectionId = sectionIdFromUrl || activeSection?.id || null;
      console.log("Creating new note with section ID:", sectionId);
      console.log("URL sectionId:", sectionIdFromUrl);
      console.log("Active section:", activeSection);
      
      // Create a temp note and also set it as the active note for consistent handling
      const newTempNote = {
        id: 'temp-new-note',
        content: '<p>Start writing your note here...</p>',
        title: '',
        sectionId
      };
      
      setTempNote(newTempNote);
      setActiveNote(newTempNote); // Set the active note to be the same as the temp note
      
      // Make sure we set the active section if it's coming from the URL
      if (sectionIdFromUrl && (!activeSection || activeSection.id !== sectionIdFromUrl)) {
        const section = sections.find(s => s.id === sectionIdFromUrl);
        if (section) {
          useNoteStore.getState().setActiveSection(sectionIdFromUrl);
        }
      }
      
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Always fetch from the database, regardless of whether the note exists in store
      console.log("Fetching note from database with ID:", noteId);
      const fetchedNote = await getNoteById(noteId);
      
      if (fetchedNote.userId !== currentUser.uid) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to view this note.",
        });
        navigate('/notes');
        return;
      }
      
      setActiveNote(fetchedNote);
      setTempNote(null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading note:', error);
      setError(error.message || 'Failed to load note');
      
      // Handle "Note not found" errors
      if (error.name === 'NotFoundError' || error.message.includes('not found')) {
        toast({
          variant: "destructive",
          title: "Note Not Found",
          description: "The requested note doesn't exist or has been deleted.",
        });
        
        // Clean up this note from the store if it's in there
        removeNote(noteId);
        
        // Redirect to notes list
        navigate('/notes');
        return;
      }
      
      if (retryAttempts < MAX_RETRY_ATTEMPTS) {
        const timeout = setTimeout(() => {
          setRetryAttempts(prev => prev + 1);
          loadNote();
        }, 2000);
        
        return () => clearTimeout(timeout);
      } else {
        useToastToast({
          variant: "destructive",
          title: "Error Loading Note",
          description: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${error.message || 'Unknown error'}`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, noteId, navigate, setActiveNote, retryAttempts, useToastToast, removeNote, sectionIdFromUrl, activeSection?.id, sections]);
  
  useEffect(() => {
    setRetryAttempts(0);
    
    // Always load immediately, removing the delay for existing notes
    loadNote();
    
    // Clean up function
    return () => {
      // Clear any pending timeouts if component unmounts
    };
  }, [noteId, currentUser, loadNote]);
  
  const saveTitle = debounce(async (noteId, newTitle) => {
    if (currentUser && noteId && noteId !== 'temp-new-note') {
      setIsSaving(true);
      
      try {
        const updatedNote = await updateNote(noteId, { 
          title: newTitle,
          userId: currentUser.uid
        });
        
        updateActiveNote({ 
          title: newTitle, 
          id: updatedNote.id
        });
        
        if (updatedNote.id !== noteId) {
          navigate(`/notes/${updatedNote.id}`, { replace: true });
          
          toast({
            title: "Note Created",
            description: "A new note has been created with your changes.",
          });
        }
      } catch (error) {
        console.error('Error updating title:', error);
        toast({
          title: "Failed to update title",
          description: "Your changes may not be saved. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  }, 500);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    
    // Update the active note in the component state directly
    if (activeNote) {
      setActiveNote({ ...activeNote, title: newTitle });
    } else if (tempNote) {
      setTempNote({...tempNote, title: newTitle});
    }
    
    // Save to backend if it's an existing note
    if (activeNote?.id && activeNote.id !== 'temp-new-note') {
      saveTitle(activeNote.id, newTitle);
    }
  };

  const handleContentUpdate = async (content) => {
    // Only auto-save new notes with title and when we're not already saving
    const noteTitle = activeNote?.title || tempNote?.title || '';
    if (noteId === 'new' && noteTitle.trim() && !isSaving) {
      createNewNote(content);
    }
  };

  // Handle the actual navigation after creating a note
  const navigateToNote = (noteId) => {
    // Delay the navigation to allow the store to update
    setTimeout(() => {
      navigate(`/notes/${noteId}`, { replace: true });
    }, 300); // Longer delay to ensure state updates
  };

  const createNewNote = async (content) => {
    // Get the title from either activeNote or tempNote
    const noteTitle = activeNote?.title || tempNote?.title || '';
    
    if (!noteTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title to save your note.",
        variant: "default",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get section ID from temp note, URL param, or active section
      const sectionId = tempNote?.sectionId || sectionIdFromUrl || activeSection?.id || null;
      
      // Ensure content is always valid HTML
      let safeContent = content || '<p></p>';
      // Ensure content has at least one paragraph
      if (!safeContent.includes('<p>')) {
        safeContent = `<p>${safeContent}</p>`;
      }
      
      const noteData = {
        title: noteTitle.trim(),
        content: safeContent,
        sectionId: sectionId,
        tags: []
      };
      
      console.log("Creating note with sectionId:", sectionId);
      
      const newNote = await createNote(noteData, currentUser.uid);
      console.log("Note created successfully:", newNote);
      
      // Make sure the new note has all the necessary fields
      const fullNote = {
        ...newNote,
        id: newNote.id,
        userId: currentUser.uid,
        isPinned: false,
        isArchived: false
      };
      
      // Add to the store before navigating
      addNote(fullNote);
      
      // Immediately set as active note to avoid loading issues
      setActiveNote(fullNote);
      
      // Remove the temporary note
      setTempNote(null);
      
      // Show success message
      toast({
        title: "Note saved",
        description: "Your note has been created successfully.",
      });
      
      // Redirect to notes list instead of directly to the note
      // This avoids the note not found issue when redirecting to a newly created note
      navigate('/notes');
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error saving note",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
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
        
        // Remove from store and redirect before showing toast
        removeNote(activeNote.id);
        navigate('/notes');
        
        toast({
          title: "Note Deleted",
          description: "The note has been permanently deleted.",
        });
      } catch (error) {
        console.error('Error deleting note:', error);
        
        // If note not found, it's already deleted
        if (error.name === 'NotFoundError' || error.message === 'Note not found' || error.message.includes('not found')) {
          // Remove from store and redirect
          removeNote(activeNote.id);
          navigate('/notes');
          
          toast({
            title: "Note Removed",
            description: "This note was already deleted or doesn't exist. Your list has been updated.",
          });
          return;
        }
        
        // Handle other errors
        toast({
          title: "Failed to Delete Note",
          description: "There was a problem deleting the note. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getSectionName = (sectionId) => {
    if (!sectionId) return 'No section';
    const section = sections.find(section => section.id === sectionId);
    return section ? section.name : 'Unknown section';
  };

  const handleSaveClick = async () => {
    if (noteId === 'new') {
      // For new notes, use the editor content safely
      try {
        // Safely get editor content
        const editorElement = document.querySelector('.ProseMirror');
        let editorContent = '';
        
        if (editorElement) {
          editorContent = editorElement.innerHTML;
        } else if (tempNote?.content) {
          editorContent = tempNote.content;
        } else {
          editorContent = '<p></p>';
        }
        
        createNewNote(editorContent);
      } catch (error) {
        console.error('Error getting editor content for new note:', error);
        // Use tempNote content as fallback
        createNewNote(tempNote?.content || '<p></p>');
      }
    } else if (activeNote?.id) {
      // For existing notes, save any pending changes and redirect to notes list
      setIsSaving(true);
      try {
        // Safely get editor content
        let content = activeNote.content;
        try {
          const editorElement = document.querySelector('.ProseMirror');
          if (editorElement) {
            content = editorElement.innerHTML;
          }
        } catch (error) {
          console.error('Error getting editor content for existing note:', error);
          // Keep using activeNote.content as fallback
        }
        
        await updateNote(activeNote.id, { 
          content,
          userId: currentUser.uid
        });
        
        toast({
          title: "Note saved",
          description: "Your changes have been saved successfully.",
        });
        
        // Redirect to the notes list
        navigate('/notes');
      } catch (error) {
        console.error('Error saving note:', error);
        toast({
          title: "Error saving note",
          description: "Please try again or check your connection.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const updateExistingNote = async (noteId, content) => {
    setIsSaving(true);
    try {
      console.log(`Updating note ${noteId}`);
      
      // Ensure title exists
      if (!activeNote?.title?.trim()) {
        toast({
          title: "Title required",
          description: "Please add a title to save your note.",
          variant: "default",
        });
        return;
      }
      
      // Ensure content is always valid HTML
      let safeContent = content || activeNote?.content || '<p></p>';
      // Ensure content has at least one paragraph
      if (!safeContent.includes('<p>')) {
        safeContent = `<p>${safeContent}</p>`;
      }
      
      const updatedNote = {
        ...activeNote,
        title: activeNote.title.trim(),
        content: safeContent,
        lastUpdated: new Date().toISOString(),
      };
      
      await updateNote(updatedNote, currentUser.uid);
      
      // Update the note in the store
      updateNoteInStore(updatedNote);
      
      // Show success message
      toast({
        title: "Note saved",
        description: "Your changes have been saved.",
      });
      
      // Set unsaved changes to false
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error saving note",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && retryAttempts >= MAX_RETRY_ATTEMPTS) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Note</h2>
        <p className="mb-4">{error}</p>
        <div className="flex gap-4">
          <button 
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => {
              setRetryAttempts(0);
              loadNote();
            }}
          >
            Try Again
          </button>
          <button 
            className="px-4 py-2 bg-secondary text-white rounded"
            onClick={() => navigate('/notes')}
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  const editorNote = activeNote || tempNote;

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
          
          {/* Save button - always visible for both new and existing notes */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="ml-2 flex items-center"
            title="Save note and return to notes list"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        <div className="mb-4">
          <Input
            type="text"
            value={editorNote?.title || ""}
            onChange={handleTitleChange}
            placeholder="Enter note title..."
            className="w-full text-2xl font-bold border-none focus:outline-none focus:ring-0 pl-0 h-auto bg-transparent"
            disabled={isSaving}
          />
        </div>
        
        {noteId === 'new' ? (
          <div className="flex-1 overflow-auto">
            <NoteEditor note={{
              ...editorNote,
              content: editorNote?.content || ''
            }} onSave={handleContentUpdate} />
          </div>
        ) : (
          activeNote && (
            <div className="flex-1 overflow-auto">
              <NoteEditor note={activeNote} />
            </div>
          )
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