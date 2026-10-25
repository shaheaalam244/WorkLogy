import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS, SOCKET_EVENTS } from '../constants';

class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;

  async connect(userId?: string): Promise<Socket> {
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.socket && this.socket.connected) {
      if (userId) {
        this.socket.emit('join_user', userId);
        this.socket.emit('join_user_room', { userId });
      }
      return this.socket;
    }

    const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    this.socket = io(CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      const targetId = this.currentUserId || userId;
      if (targetId && this.socket) {
        this.socket.emit('join_user', targetId);
        this.socket.emit('join_user_room', { userId: targetId });
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
