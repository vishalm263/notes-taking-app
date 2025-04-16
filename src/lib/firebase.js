import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if we have all required Firebase config
const hasValidConfig = Object.values(firebaseConfig).every(value => 
  value && !value.includes('dummy') && !value.includes('your-')
);

let app, auth, db, googleProvider;

try {
  if (hasValidConfig) {
    // Initialize Firebase with valid config
    console.log('Initializing Firebase with valid configuration');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Set session persistence to local (survives browser restarts)
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log('Firebase persistence set to local'))
      .catch(error => console.error('Firebase persistence error:', error));
    
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google auth provider to improve popup handling
    googleProvider.setCustomParameters({
      // Allow selecting account on every login
      prompt: 'select_account',
      // Popup display mode
      display: 'popup',
      // Try to avoid CORS issues
      redirect_uri: window.location.origin
    });
  } else {
    console.warn('Using mock Firebase - please set valid Firebase config in .env file');
    // Setup mock objects for development without Firebase
    auth = {
      app: null, // This will trigger mock mode
      onAuthStateChanged: (callback) => {
        // Simulate a logged in user
        callback({ uid: 'mock-user-id', email: 'mock@example.com', displayName: 'Mock User' });
        return () => {}; // Return unsubscribe function
      },
      signOut: () => Promise.resolve(),
      currentUser: { uid: 'mock-user-id', email: 'mock@example.com', displayName: 'Mock User' }
    };
    
    // Mock Firestore
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ exists: () => true, data: () => ({}) }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
        }),
        add: () => Promise.resolve({ id: 'mock-doc-id' }),
        where: () => ({ orderBy: () => ({ get: () => Promise.resolve({ docs: [] }) }) }),
        orderBy: () => ({ get: () => Promise.resolve({ docs: [] }) }),
      }),
    };
    
    googleProvider = {};
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Setup fallback mock objects
  auth = {
    app: null, // This will trigger mock mode
    onAuthStateChanged: (callback) => {
      callback(null);
      return () => {};
    },
    signOut: () => Promise.resolve(),
    currentUser: null
  };
  db = {};
  googleProvider = {};
}

export { auth, db, googleProvider }; 