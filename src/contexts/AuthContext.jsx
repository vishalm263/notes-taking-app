import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

// Create the context with default values to prevent destructuring errors
const AuthContext = createContext({
  currentUser: null,
  signup: () => Promise.resolve(),
  login: () => Promise.resolve(),
  loginWithGoogle: () => Promise.resolve(),
  loginWithGoogleRedirect: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(),
  updateUserProfile: () => Promise.resolve(),
  isDbInitialized: false
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Mock auth functions if we're in mock mode
  const isMockMode = !auth.app;
  
  // Helper function to sync user with MongoDB
  const syncUserWithMongoDB = async (user) => {
    if (!user || !user.uid) {
      console.error('Cannot sync user: Invalid user object or missing UID');
      return;
    }
    
    console.log('Syncing user with MongoDB. Firebase UID:', user.uid);
    
    try {
      // Prepare a complete user data object with all Firebase user properties
      const userData = {
        firebaseId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        provider: user.providerData?.[0]?.providerId || 'password',
        emailVerified: user.emailVerified || false,
        lastLoginAt: user.metadata?.lastLoginAt || new Date().toISOString()
      };
      
      // Only include these fields if they exist
      if (user.phoneNumber) userData.phoneNumber = user.phoneNumber;
      
      try {
        // Dynamically import apiRequest to prevent errors if not available
        const { apiRequest } = await import('../lib/mongodb');
        const result = await apiRequest('users/syncUser', 'POST', userData);
        console.log('User synced successfully with MongoDB. Firebase UID:', user.uid, 'MongoDB ID:', result?.id || 'unknown');
        setDbInitialized(true);
        return result;
      } catch (error) {
        console.error('Failed to sync user with MongoDB API:', error);
        // Fall back to local storage for persistence
        localStorage.setItem('user_data', JSON.stringify(userData));
        setDbInitialized(true); // Consider user data as initialized even with local storage
      }
    } catch (error) {
      console.error('Failed to sync user with MongoDB:', error);
      // We'll still allow the user to proceed even if MongoDB sync fails
      setDbInitialized(true);
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
        // Sync with MongoDB
        syncUserWithMongoDB(result.user);
        return result;
      })
      .catch(error => {
        // Handle popup closed error gracefully
        if (error.code === 'auth/popup-closed-by-user') {
          console.log('Google sign-in popup was closed by user');
          throw new Error('Sign-in canceled. Please try again if you want to sign in with Google.');
        }
        
        // Handle other potential CORS or popup errors
        if (error.code === 'auth/popup-blocked' || 
            (error.message && error.message.includes('Cross-Origin-Opener-Policy'))) {
          console.error('Popup authentication failed, suggesting redirect auth instead:', error);
          // Return a specific error suggesting to use redirect instead
          throw new Error('Browser prevented popup. Try using Google Redirect login instead.');
        }
        
        // Rethrow other errors
        console.error('Google sign-in error:', error);
        throw error;
      });
  }
  
  // Add a redirect-based authentication method as an alternative
  function loginWithGoogleRedirect() {
    if (isMockMode) {
      console.log('Mock Google Redirect login');
      const mockUser = { uid: 'mock-google-id', email: 'mock-google@example.com', displayName: 'Mock Google User' };
      setCurrentUser(mockUser);
      
      // Sync with MongoDB
      syncUserWithMongoDB(mockUser);
      
      return Promise.resolve({ user: mockUser });
    }
    
    console.log('Attempting Google sign-in with redirect flow');
    // This will redirect the page, so we return a promise that won't resolve
    return signInWithRedirect(auth, googleProvider);
  }
  
  // Check for redirect results on component mount
  useEffect(() => {
    if (!isMockMode) {
      getRedirectResult(auth)
        .then(result => {
          if (result && result.user) {
            console.log('Redirect authentication successful');
            syncUserWithMongoDB(result.user);
          }
        })
        .catch(error => {
          console.error('Redirect authentication error:', error);
        });
    }
  }, []);

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
      
      // Sync with MongoDB
      syncUserWithMongoDB({...user, ...profile});
      
      return Promise.resolve();
    }
    
    return updateProfile(user, profile)
      .then(() => {
        // Sync with MongoDB
        return syncUserWithMongoDB({...user, ...profile});
      });
  }

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user?.uid);
        setCurrentUser(user);
        
        // Sync with MongoDB if user is logged in
        if (user) {
          syncUserWithMongoDB(user);
        } else {
          setLoading(false);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error in auth state change listener:", error);
      setLoading(false);
      return () => {};
    }
  }, []);

  useEffect(() => {
    // Set loading to false once we have confirmed DB is initialized or after a timeout
    if (dbInitialized) {
      setLoading(false);
    }

    // Fallback timeout in case DB never initializes
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Setting loading to false due to timeout');
        setLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [dbInitialized, loading]);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    loginWithGoogleRedirect,
    logout,
    resetPassword,
    updateUserProfile,
    isDbInitialized: dbInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 