import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SimulationProvider } from './context/SimulationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isValidating, connectionError } = useAuth();

  if (isValidating || connectionError) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-8 h-8 rounded flex items-center justify-center ${connectionError ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse'}`} />
          <span className={`text-sm font-semibold tracking-widest uppercase ${connectionError ? 'text-red-500' : 'text-gray-500 animate-pulse'}`}>
            {connectionError ? 'Failed to connect' : 'Connecting...'}
          </span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const SessionExpiredBanner = () => {
  const { sessionExpired, clearSessionExpired } = useAuth();
  if (!sessionExpired) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-400 text-sm font-semibold shadow-xl backdrop-blur-sm">
      <span>⚠</span>
      <span>Your session has expired. Please sign in again.</span>
      <button onClick={clearSessionExpired} className="ml-2 text-amber-600 hover:text-amber-400 font-bold">✕</button>
    </div>
  );
};

export default function App() {
  return (
    <SimulationProvider>
      <AuthProvider>
        <BrowserRouter>
          <SessionExpiredBanner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SimulationProvider>
  );
}
