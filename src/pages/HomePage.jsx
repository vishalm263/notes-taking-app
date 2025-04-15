import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import NoteList from '../components/NoteList';
import { useNoteStore } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, Search, X } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const activeSection = useNoteStore(state => state.activeSection);
  const activeFilter = useNoteStore(state => state.activeFilter);
  
  const getHeaderTitle = () => {
    if (searchTerm) return `Search results for "${searchTerm}"`;
    if (activeSection) return activeSection.name;
    if (activeFilter.isArchived) return 'Archived Notes';
    return 'All Notes';
  };
  
  const handleCreateNote = () => {
    navigate('/notes/new');
  };
  
  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-medium">{getHeaderTitle()}</h1>
        
        <div className="flex items-center space-x-2">
          {isSearching ? (
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="w-64 pl-9 pr-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
              <button
                className="absolute right-2.5 top-1.5"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearching(false);
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearching(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          
          <Button onClick={handleCreateNote}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <NoteList searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default HomePage; 