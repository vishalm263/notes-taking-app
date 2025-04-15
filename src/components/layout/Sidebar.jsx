import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { useNoteStore } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';
import { getSectionsByUser, createSection } from '../../services/noteService';
import { cn } from '../../lib/utils';
import {
  PlusCircle,
  Home,
  FolderClosed,
  Archive,
  Settings,
  Folder,
  X,
  Tag,
  Trash,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  const sections = useNoteStore(state => state.sections);
  const activeSection = useNoteStore(state => state.activeSection);
  const activeFilter = useNoteStore(state => state.activeFilter);
  const setSections = useNoteStore(state => state.setSections);
  const setActiveSection = useNoteStore(state => state.setActiveSection);
  const addSection = useNoteStore(state => state.addSection);
  const clearFilters = useNoteStore(state => state.clearFilters);
  const toggleArchivedFilter = useNoteStore(state => state.toggleArchivedFilter);
  
  // Fetch sections on component mount
  useEffect(() => {
    if (currentUser) {
      getSectionsByUser(currentUser.uid)
        .then(fetchedSections => {
          setSections(fetchedSections);
        })
        .catch(error => {
          console.error('Error fetching sections:', error);
        });
    }
  }, [currentUser, setSections]);

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (newSectionName.trim() && currentUser) {
      try {
        const newSection = await createSection({
          name: newSectionName.trim(),
          color: getRandomPastelColor(),
          icon: 'folder'
        }, currentUser.uid);
        
        addSection(newSection);
        setNewSectionName('');
        setShowNewSection(false);
      } catch (error) {
        console.error('Error creating section:', error);
      }
    }
  };

  const getRandomPastelColor = () => {
    // Generate a random pastel color
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  return (
    <aside className="w-64 h-full flex flex-col border-r bg-card text-card-foreground">
      <div className="p-4 font-semibold text-xl">NoteTaker</div>
      
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          <li>
            <Button
              variant={!activeSection && !activeFilter.isArchived ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => clearFilters()}
            >
              <Home className="h-4 w-4 mr-2" />
              All Notes
            </Button>
          </li>
          
          <li>
            <Button
              variant={activeFilter.isArchived ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => toggleArchivedFilter()}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archived
            </Button>
          </li>
          
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground">SECTIONS</span>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-5 w-5" 
                onClick={() => setShowNewSection(true)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {showNewSection && (
              <form onSubmit={handleAddSection} className="p-2">
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name"
                    className="flex-1 text-sm px-2 py-1 rounded-sm border focus:outline-none"
                    autoFocus
                  />
                  <Button type="submit" size="icon" variant="ghost" className="h-7 w-7">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => setShowNewSection(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
            
            <ul className="mt-1 space-y-1">
              {sections.map(section => (
                <li key={section.id}>
                  <Button
                    variant={activeSection?.id === section.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Folder 
                      className="h-4 w-4 mr-2" 
                      style={{ color: section.color }}
                    />
                    {section.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </ul>
      </nav>
      
      <div className="p-4 border-t flex justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        
        <Link to="/settings">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", location.pathname === '/settings' && "bg-accent")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar; 