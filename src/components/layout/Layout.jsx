import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useNoteStore } from '../../lib/store';
import { getNotesByUser, getTagsByUser } from '../../services/noteService';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';

const Layout = () => {
  const { currentUser, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  const setNotes = useNoteStore(state => state.setNotes);
  const setTags = useNoteStore(state => state.setTags);
  const setError = useNoteStore(state => state.setError);
  
  // Close sidebar on location change (mobile only)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);
  
  // Close sidebar on window resize if screen becomes larger
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          
          // Fetch notes and tags in parallel
          const [notes, tags] = await Promise.all([
            getNotesByUser(currentUser.uid),
            getTagsByUser(currentUser.uid)
          ]);
          
          setNotes(notes);
          setTags(tags);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError(error.message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchData();
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [currentUser, loading, setNotes, setTags, setError]);
  
  // Determine if we're on the notes list page (for mobile redirect)
  const isNotesListPage = location.pathname === '/notes';
  
  // If loading, show a loading indicator
  if (loading || isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar - always visible on large screens */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar - visible when toggled */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setSidebarOpen(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground">
              <h2 className="text-lg font-semibold">NoteTaker</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-primary-foreground hover:bg-primary/90"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with menu button */}
        <div className="md:hidden flex items-center px-4 py-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">NoteTaker</h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout; 