import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';

// Layout
import Layout from './components/layout/Layout';

// Pages
import HomePage from './pages/HomePage';
import NotePage from './pages/NotePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Create a client
const queryClient = new QueryClient();

// Custom redirect component for responsive routing
const ResponsiveRedirect = () => {
  // Check if the device is mobile (simplified check)
  const isMobile = window.innerWidth < 768;
  
  // Redirect to notes page on mobile, otherwise show the home page
  return <Navigate to={isMobile ? "/notes" : "/notes/new"} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="notetaker-theme">
        <AuthProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<ResponsiveRedirect />} />
                <Route path="notes" element={<HomePage />} />
                <Route path="notes/:noteId" element={<NotePage />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
