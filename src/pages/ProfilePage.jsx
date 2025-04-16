import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  User, 
  Mail, 
  Calendar, 
  LogOut, 
  AlertTriangle, 
  Trash,
  ArrowLeft
} from 'lucide-react';

const ProfilePage = () => {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleDeleteAccount = async () => {
    // This would be implemented with Firebase auth and database deletion
    alert('Account deletion would be implemented here.');
    // After deletion, log out and redirect
    await logout();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) return;
    
    setIsSaving(true);
    try {
      await updateUserProfile(currentUser, { displayName: displayName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const creationDate = currentUser?.metadata?.creationTime 
    ? formatDate(currentUser.metadata.creationTime)
    : 'Unknown';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notes')}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Profile</h1>
      </div>

      <div className="bg-card rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-4 text-2xl">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="h-16 w-16 rounded-full" />
            ) : (
              currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase()
            )}
          </div>
          
          <div>
            {isEditingName ? (
              <div className="flex items-center">
                <Input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="mr-2 w-auto"
                  disabled={isSaving}
                />
                <Button 
                  size="sm" 
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setDisplayName(currentUser?.displayName || '');
                    setIsEditingName(false);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <h2 className="text-xl font-semibold mr-2">
                  {currentUser?.displayName || 'Not set'}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingName(true)}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div>{currentUser?.email}</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Member since</div>
              <div>{creationDate}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash className="h-5 w-5 mr-2" />
            Delete Account
          </Button>
        </div>
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

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm w-full">
            <div className="flex items-center text-destructive mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="font-semibold text-lg">Delete Account?</h3>
            </div>
            <p className="mb-2">This action cannot be undone. All your notes and data will be permanently deleted.</p>
            <p className="mb-6 font-medium">Are you absolutely sure you want to delete your account?</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 