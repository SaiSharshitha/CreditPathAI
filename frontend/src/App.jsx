import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Predict from './pages/Predict';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Chatbot from './components/Chatbot';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="page-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes */}
            <Route
              path="/predict/user"
              element={
                <ProtectedRoute>
                  <Predict type="user" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predict/bank"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'BANK AGENT', 'BANK', 'AGENT']}>
                  <Predict type="bank" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Chatbot />
      </Router>
    </AuthProvider>
  );
}

export default App;
