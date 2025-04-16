import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  Moon,
  LogOut,
  User,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.displayName) return 'U';
    
    const nameParts = currentUser.displayName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  };

  return (
    <aside className="w-64 h-full flex flex-col border-r bg-card text-card-foreground">
      <div className="p-4 font-semibold text-xl">NoteTaker</div>
      
      {/* User profile section */}
      <div className="p-2 border-b mb-2">
        <div 
          className="flex items-center p-2 rounded-md hover:bg-accent cursor-pointer"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="h-8 w-8 rounded-full" />
            ) : (
              <span>{getUserInitials()}</span>
            )}
          </div>
          <div className="flex-1 truncate">
            <div className="font-medium truncate">
              {currentUser?.displayName || currentUser?.email || 'User'}
            </div>
          </div>
        </div>
        
        {showUserMenu && (
          <div className="mt-1 border rounded-md p-1 shadow-sm bg-background">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                navigate('/settings');
                setShowUserMenu(false);
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
      
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
                  <Input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name"
                    className="h-7 text-sm flex-1"
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
                  <div className="flex items-center">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-1"
                      title={`New note in ${section.name}`}
                      onClick={() => navigate(`/notes/new?sectionId=${section.id}`)}
                    >
                      <PlusCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ul>
      </nav>
      
      <div className="p-4 border-t flex justify-between relative">
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
        
        {/* Settings Button with Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", showSettingsMenu && "bg-accent")}
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {showSettingsMenu && (
            <div className="absolute bottom-full right-0 mb-1 w-48 border rounded-md p-1 shadow-sm bg-background z-10">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigate('/profile');
                  setShowSettingsMenu(false);
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive"
                onClick={() => {
                  setShowLogoutConfirm(true);
                  setShowSettingsMenu(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
        
        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm w-full">
              <div className="flex items-center text-amber-500 mb-4">
                <AlertTriangle className="h-6 w-6 mr-2" />
                <h3 className="font-semibold text-lg">Confirm Logout</h3>
              </div>
              <p className="mb-6">Are you sure you want to log out? You will need to log in again to access your notes.</p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 