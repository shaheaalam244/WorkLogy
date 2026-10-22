import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { useAuthContext } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: false,
      reconnectionAttempts: 2,
      timeout: 3000
    });

    try {
      newSocket.connect();
    } catch {}

    newSocket.on('connect', () => {
      setIsConnected(true);
      const uid = user?.id || user?._id;
      if (uid) {
        newSocket.emit('join_user', uid);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('new_lead_alert', (lead) => {
      setNotifications(prev => [
        { id: Date.now(), title: '⚡ New Job Lead in your trade!', message: lead.title, time: 'Just now', link: lead.id ? `/vendor/jobs/${lead.id}` : '/vendor/browse-jobs' },
        ...prev
      ]);
    });

    newSocket.on('new_instant_job_lead', (lead) => {
      setNotifications(prev => [
        { id: Date.now(), title: '⚡ Instant Lead: First to Accept Wins!', message: lead.title, time: 'Just now', link: `/vendor/jobs/${lead.jobId}` },
        ...prev
      ]);
    });

    newSocket.on('job_assigned', (data) => {
      setNotifications(prev => [
        { id: Date.now(), title: '🎉 Professional Assigned!', message: `${data.vendorName || 'A professional'} accepted your request for ₹${data.finalPrice || ''}. Your Service Start OTP is ready!`, time: 'Just now', link: '/customer/bookings' },
        ...prev
      ]);
    });

    newSocket.on('service_started', () => {
      setNotifications(prev => [
        { id: Date.now(), title: '🚀 Service Started', message: 'Service Start OTP verified. Work has officially started.', time: 'Just now', link: '/customer/bookings' },
        ...prev
      ]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const uid = user?.id || user?._id;
    if (socket && isConnected && uid) {
      socket.emit('join_user', uid);
    }
  }, [user, socket, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
