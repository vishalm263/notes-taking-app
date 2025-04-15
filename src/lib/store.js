import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useNoteStore = create(
  persist(
    (set, get) => ({
      notes: [],
      sections: [],
      tags: [],
      activeNote: null,
      activeSection: null,
      activeFilter: { isArchived: false }, // Default filter - not archived
      isLoading: false,
      error: null,
      
      // Note actions
      setNotes: (notes) => set({ notes }),
      setActiveNote: (noteId) => {
        const notes = get().notes;
        const activeNote = notes.find(note => note.id === noteId) || null;
        set({ activeNote });
      },
      updateActiveNote: (updates) => {
        const activeNote = get().activeNote;
        if (!activeNote) return;
        
        set({ 
          activeNote: { ...activeNote, ...updates },
          notes: get().notes.map(note => 
            note.id === activeNote.id ? { ...note, ...updates } : note
          )
        });
      },
      addNote: (note) => set({ 
        notes: [note, ...get().notes],
        activeNote: note 
      }),
      removeNote: (noteId) => set({
        notes: get().notes.filter(note => note.id !== noteId),
        activeNote: get().activeNote?.id === noteId ? null : get().activeNote
      }),
      togglePinNote: (noteId) => {
        const notes = get().notes;
        const noteIndex = notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
          const updatedNotes = [...notes];
          updatedNotes[noteIndex] = { 
            ...updatedNotes[noteIndex], 
            isPinned: !updatedNotes[noteIndex].isPinned 
          };
          
          set({ 
            notes: updatedNotes,
            activeNote: get().activeNote?.id === noteId 
              ? updatedNotes[noteIndex] 
              : get().activeNote
          });
        }
      },
      toggleArchiveNote: (noteId) => {
        const notes = get().notes;
        const noteIndex = notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
          const updatedNotes = [...notes];
          updatedNotes[noteIndex] = { 
            ...updatedNotes[noteIndex], 
            isArchived: !updatedNotes[noteIndex].isArchived 
          };
          
          set({ 
            notes: updatedNotes,
            activeNote: get().activeNote?.id === noteId 
              ? updatedNotes[noteIndex] 
              : get().activeNote
          });
        }
      },
      
      // Section actions
      setSections: (sections) => set({ sections }),
      setActiveSection: (sectionId) => {
        const sections = get().sections;
        const activeSection = sectionId ? sections.find(section => section.id === sectionId) : null;
        set({ 
          activeSection,
          activeFilter: { 
            ...get().activeFilter, 
            sectionId,
            isArchived: false // Reset archive filter when changing sections
          }
        });
      },
      addSection: (section) => set({ 
        sections: [...get().sections, section],
        activeSection: section
      }),
      removeSection: (sectionId) => {
        const isActiveSection = get().activeSection?.id === sectionId;
        set({
          sections: get().sections.filter(section => section.id !== sectionId),
          activeSection: isActiveSection ? null : get().activeSection,
          activeFilter: isActiveSection 
            ? { ...get().activeFilter, sectionId: null } 
            : get().activeFilter
        });
      },
      
      // Tag actions
      setTags: (tags) => set({ tags }),
      addTag: (tag) => set({ tags: [...get().tags, tag] }),
      removeTag: (tagId) => set({
        tags: get().tags.filter(tag => tag.id !== tagId)
      }),
      
      // Filter actions
      setActiveFilter: (filter) => set({ 
        activeFilter: { ...get().activeFilter, ...filter } 
      }),
      clearFilters: () => set({ 
        activeFilter: { isArchived: false },
        activeSection: null
      }),
      toggleArchivedFilter: () => set({ 
        activeFilter: { 
          ...get().activeFilter, 
          isArchived: !get().activeFilter.isArchived 
        } 
      }),
      
      // Loading and error state
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
); 