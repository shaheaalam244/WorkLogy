import { Server } from 'socket.io';
import { registerChatSocket } from './chat.socket.js';
import { registerJobSocket } from './job.socket.js';
import { registerLeadSocket } from './lead.socket.js';

export const initSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket Client connected: ' + socket.id);

    // Register modular event handlers
    registerChatSocket(io, socket);
    registerJobSocket(io, socket);
    registerLeadSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('Socket Client disconnected: ' + socket.id);
    });
  });

  return io;
};
