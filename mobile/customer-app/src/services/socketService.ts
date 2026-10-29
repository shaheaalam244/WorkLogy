import { io, Socket } from 'socket.io-client';
import { getStoredAuthToken, getActiveSocketUrl } from '../api/client';
import { SOCKET_EVENTS } from '../constants';
import { dataSyncService } from './dataSyncService';

class SocketService {
  private socket: Socket | null = null;
  private currentUrl: string = '';
  private syncListenersAttached: boolean = false;
  private connectingPromise: Promise<Socket> | null = null;

  private attachSyncListeners(socket: Socket) {
    if (this.syncListenersAttached) return;
    this.syncListenersAttached = true;

    const handleBookingSync = (data: any) => {
      dataSyncService.notify('BOOKINGS_CHANGED', data);
      dataSyncService.notify('DASHBOARD_CHANGED', data);
    };

    const handleNotificationSync = (data: any) => {
      dataSyncService.notify('NOTIFICATIONS_CHANGED', data);
    };

    const handleChatSync = (data: any) => {
      dataSyncService.notify('MESSAGES_CHANGED', data);
    };

    const handleMessagesRead = (data: any) => {
      dataSyncService.notify('MESSAGES_READ', data);
    };

    socket.on('booking_cancelled', handleBookingSync);
    socket.on('booking_status_updated', handleBookingSync);
    socket.on('booking_updated', handleBookingSync);
    socket.on('technician_arrived', handleBookingSync);
    socket.on('job_cancelled', handleBookingSync);
    socket.on('job_assigned', handleBookingSync);
    socket.on('job_status_updated', handleBookingSync);
    socket.on('job_status_update', handleBookingSync);
    socket.on('service_started', handleBookingSync);
    socket.on('job_created', handleBookingSync);
    socket.on('new_quotation', () => {
      dataSyncService.notify('QUOTES_CHANGED');
      handleBookingSync({});
    });
    socket.on('job_quotation_received', (data: any) => {
      dataSyncService.notify('QUOTES_CHANGED', data);
      handleBookingSync(data);
    });

    socket.on('new_notification', handleNotificationSync);
    socket.on('notification', handleNotificationSync);

    // Chat real-time sync listeners
    socket.on('new_message_notification', handleChatSync);
    socket.on('receive_message', handleChatSync);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleChatSync);
    socket.on('messages_read', handleMessagesRead);
  }

  async connect(userId?: string): Promise<Socket> {
    const socketUrl = getActiveSocketUrl();

    if (this.socket && this.socket.connected && this.currentUrl === socketUrl) {
      if (userId && this.socket) {
        this.socket.emit('join_user', userId);
        this.socket.emit('join_user_room', { userId });
      }
      return this.socket;
    }

    if (this.connectingPromise && this.currentUrl === socketUrl) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      try {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
          this.syncListenersAttached = false;
        }

        this.currentUrl = socketUrl;
        const token = await getStoredAuthToken();

        this.socket = io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });

        this.attachSyncListeners(this.socket);

        this.socket.on(SOCKET_EVENTS.CONNECT, () => {
          if (userId && this.socket) {
            this.socket.emit('join_user', userId);
            this.socket.emit('join_user_room', { userId });
          }
        });

        // If connection error occurs and we were attempting local host, switch to fallback socket
        this.socket.on('connect_error', () => {
          const fallbackSocket = 'http://76.13.246.224:5001';
          if (this.currentUrl !== fallbackSocket && !this.currentUrl.includes('76.13.246.224')) {
            this.currentUrl = fallbackSocket;
            this.socket?.disconnect();
            this.syncListenersAttached = false;
            this.socket = io(fallbackSocket, {
              auth: { token },
              transports: ['websocket', 'polling'],
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 1000
            });
            this.attachSyncListeners(this.socket);
            if (userId) {
              this.socket.on(SOCKET_EVENTS.CONNECT, () => {
                this.socket?.emit('join_user', userId);
                this.socket?.emit('join_user_room', { userId });
              });
            }
          }
        });

        return this.socket;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentUrl = '';
      this.syncListenersAttached = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
