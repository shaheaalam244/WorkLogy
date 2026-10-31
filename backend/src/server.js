import http from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { setIO } from './config/socket.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  const io = initSockets(server);
  setIO(io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Worklogy API running at http://0.0.0.0:${PORT}`);
    console.log("WebSocket server ready for real-time leads, chat & jobs");
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP and WebSocket server closed.');
      try {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 10s if connections fail to close
    setTimeout(() => {
      console.error('Forcefully terminating process after 10s shutdown timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
});
