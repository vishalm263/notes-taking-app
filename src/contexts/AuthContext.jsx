import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { createOrUpdateUser } from '../lib/mongodb';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Mock auth functions if we're in mock mode
  const isMockMode = !auth.app;
  
  // Check if we should use MongoDB - in browser we always use the mock MongoDB
  const useMongoDb = true; // Always use MongoDB (either real or mock implementation)

  // Helper function to sync user with MongoDB
  const syncUserWithMongoDB = async (user) => {
    if (!user) return;
    
    try {
      console.log('Syncing user with MongoDB:', user.uid);
      const result = await createOrUpdateUser({
        firebaseId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        provider: user.providerData?.[0]?.providerId || 'password'
      });
      console.log('User synced with MongoDB successfully:', result);
      return result;
    } catch (error) {
      console.error('Error syncing user to MongoDB:', error);
    }
  };

  function signup(email, password) {
    if (isMockMode) {
      console.log('Mock signup:', email);
      const mockUser = { 
        uid: 'mock-user-id',
        email,
        displayName: '',
        updateProfile: (data) => {
          console.log('Mock update profile:', data);
          return Promise.resolve();
        }
      };
      
      // Sync with MongoDB
      syncUserWithMongoDB(mockUser);
      
      return Promise.resolve({ user: mockUser });
    }
    
    return createUserWithEmailAndPassword(auth, email, password)
      .then(result => {
        console.log('Firebase user created:', result.user.uid);
        // Sync with MongoDB
        syncUserWithMongoDB(result.user);
        return result;
      });
  }

  function login(email, password) {
    if (isMockMode) {
      console.log('Mock login:', email);
      const mockUser = { uid: 'mock-user-id', email, displayName: 'Mock User' };
      setCurrentUser(mockUser);
      
      // Sync with MongoDB
      syncUserWithMongoDB(mockUser);
      
      return Promise.resolve({ user: mockUser });
    }
    
    return signInWithEmailAndPassword(auth, email, password)
      .then(result => {
        console.log('Firebase user logged in:', result.user.uid);
        // Sync with MongoDB
        syncUserWithMongoDB(result.user);
        return result;
      });
  }

  function loginWithGoogle() {
    if (isMockMode) {
      console.log('Mock Google login');
      const mockUser = { uid: 'mock-google-id', email: 'mock-google@example.com', displayName: 'Mock Google User' };
      setCurrentUser(mockUser);
      
      // Sync with MongoDB
      syncUserWithMongoDB(mockUser);
      
      return Promise.resolve({ user: mockUser });
    }
    
    return signInWithPopup(auth, googleProvider)
      .then(result => {
        console.log('Google auth user logged in:', result.user.uid);
        // Sync with MongoDB
        syncUserWithMongoDB(result.user);
        return result;
      });
  }

  function logout() {
    if (isMockMode) {
      console.log('Mock logout');
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth);
  }

  function resetPassword(email) {
    if (isMockMode) {
      console.log('Mock reset password for:', email);
      return Promise.resolve();
    }
    return sendPasswordResetEmail(auth, email);
  }

  function updateUserProfile(user, profile) {
    if (isMockMode) {
      console.log('Mock update profile:', profile);
      
      // Sync with MongoDB if configured
      if (useMongoDb) {
        createOrUpdateUser({
          firebaseId: user.uid,
          ...profile
        }).catch(error => {
          console.error('Error syncing profile update to MongoDB:', error);
        });
      }
      
      return Promise.resolve();
    }
    
    return updateProfile(user, profile)
      .then(() => {
        // Sync with MongoDB if configured
        if (useMongoDb) {
          createOrUpdateUser({
            firebaseId: user.uid,
            ...profile
          }).catch(error => {
            console.error('Error syncing profile update to MongoDB:', error);
          });
        }
      });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // Sync with MongoDB if configured and user is logged in
      if (useMongoDb && user) {
        createOrUpdateUser({
          firebaseId: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          provider: user.providerData[0]?.providerId || 'password'
        }).catch(error => {
          console.error('Error syncing user to MongoDB on auth state change:', error);
        });
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [useMongoDb]);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 