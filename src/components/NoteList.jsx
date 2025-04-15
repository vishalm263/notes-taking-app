import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useNoteStore } from '../lib/store';
import { formatDate } from '../lib/utils';
import {
  Pin,
  Clock,
  Trash,
  Archive,
  MoreVertical,
  Folder
} from 'lucide-react';

const NoteList = () => {
  const navigate = useNavigate();
  
  const notes = useNoteStore(state => state.notes);
  const activeNote = useNoteStore(state => state.activeNote);
  const activeFilter = useNoteStore(state => state.activeFilter);
  const sections = useNoteStore(state => state.sections);
  const setActiveNote = useNoteStore(state => state.setActiveNote);
  const togglePinNote = useNoteStore(state => state.togglePinNote);
  const toggleArchiveNote = useNoteStore(state => state.toggleArchiveNote);
  
  // Filter notes based on active filters
  const filteredNotes = useMemo(() => {
    let filtered = [...notes];
    
    // Filter by section
    if (activeFilter.sectionId) {
      filtered = filtered.filter(note => note.sectionId === activeFilter.sectionId);
    }
    
    // Filter by archive status
    filtered = filtered.filter(note => note.isArchived === activeFilter.isArchived);
    
    // Filter by tag
    if (activeFilter.tag) {
      filtered = filtered.filter(note => note.tags && note.tags.includes(activeFilter.tag));
    }
    
    // Sort by pinned first, then by updated date
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Compare dates (newer first)
      const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt);
      const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt);
      return dateB - dateA;
    });
  }, [notes, activeFilter]);

  const getSectionName = (sectionId) => {
    if (!sectionId) return null;
    const section = sections.find(section => section.id === sectionId);
    return section ? section.name : null;
  };

  const handleNoteClick = (noteId) => {
    setActiveNote(noteId);
    navigate(`/notes/${noteId}`);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      {filteredNotes.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
          <p className="text-lg">No notes found</p>
          <p className="text-sm">Create a new note to get started</p>
          <Button 
            className="mt-4"
            onClick={() => navigate('/notes/new')}
          >
            Create Note
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div 
              key={note.id} 
              className={`border rounded-md cursor-pointer overflow-hidden flex flex-col h-64
                ${activeNote?.id === note.id ? 'ring-2 ring-primary' : ''}
                ${note.isPinned ? 'border-primary/50' : 'border-border'}
              `}
              onClick={() => handleNoteClick(note.id)}
            >
              <div className="p-4 flex-1 overflow-hidden">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-lg truncate">{note.title || 'Untitled'}</h3>
                  <div className="flex space-x-1">
                    {note.isPinned && (
                      <Pin className="h-4 w-4 text-primary fill-primary" />
                    )}
                  </div>
                </div>
                
                {note.sectionId && (
                  <div className="mt-1 flex items-center text-xs text-muted-foreground">
                    <Folder className="h-3 w-3 mr-1" />
                    {getSectionName(note.sectionId)}
                  </div>
                )}
                
                <div className="mt-2 text-sm text-muted-foreground line-clamp-6">
                  {note.content ? (
                    <div dangerouslySetInnerHTML={{ __html: note.content.substring(0, 150) + '...' }} />
                  ) : (
                    <span className="italic">No content</span>
                  )}
                </div>
              </div>
              
              <div className="p-2 bg-muted/20 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.updatedAt?.toDate?.() || note.updatedAt)}
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinNote(note.id);
                    }}
                  >
                    <Pin className={`h-3 w-3 ${note.isPinned ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArchiveNote(note.id);
                    }}
                  >
                    <Archive className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList; 