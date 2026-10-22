import http from 'http';
import dotenv from 'dotenv';
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

  server.listen(PORT, () => {
    console.log(`Worklogy API running at http://localhost:${PORT}`);
    console.log("WebSocket server ready for real-time leads, chat & jobs");
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
});
