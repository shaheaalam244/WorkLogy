import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
            <AppRoutes />
          </div>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
