import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './auth/Login';

import Dashboard from './pages/Home';
import ProjectEditor from './pages/ProjectEditor';
import SQLPlayground from './pages/SQLPlayground';
import JoinProject from './pages/JoinProject';


// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userLoggedIn, loading } = useAuth()!;

  if (loading) return <div>Loading...</div>;

  if (!userLoggedIn) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:projectId"
            element={
              <ProtectedRoute>
                <ProjectEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sql-playground"
            element={
              <ProtectedRoute>
                <SQLPlayground />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join/:projectId"
            element={
              <ProtectedRoute>
                <JoinProject />
              </ProtectedRoute>
            }
          />
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;