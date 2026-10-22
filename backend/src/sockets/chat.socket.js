import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

// Global presence tracker: Map<userIdString, Set<socketId>>
const onlineUsers = new Map();
const socketToUser = new Map();

export const isUserOnline = (userId) => {
  if (!userId) return false;
  const sockets = onlineUsers.get(userId.toString());
  return sockets ? sockets.size > 0 : false;
};

export const getOnlineUsersList = () => {
  return Array.from(onlineUsers.keys());
};

export const registerChatSocket = (io, socket) => {
  // Handle user identification and online presence
  socket.on('join_user', (userId) => {
    if (!userId) return;
    const uid = userId.toString();
    socket.join(`user_${uid}`);
    socketToUser.set(socket.id, uid);

    if (!onlineUsers.has(uid)) {
      onlineUsers.set(uid, new Set());
    }
    onlineUsers.get(uid).add(socket.id);

    // Broadcast online status to all clients
    io.emit('user_presence', { userId: uid, isOnline: true });
  });

  // Query online status for a list of user IDs
  socket.on('check_presence', (userIds, callback) => {
    if (typeof callback !== 'function') return;
    if (!Array.isArray(userIds)) {
      return callback({ onlineUserIds: [] });
    }
    const online = userIds.filter((id) => id && isUserOnline(id));
    callback({ onlineUserIds: online });
  });

  // Join a specific conversation room
  socket.on('join_conversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
    }
  });

  // Leave a specific conversation room
  socket.on('leave_conversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ conversationId, userId, userName }) => {
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName: userName || 'Typing...',
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', ({ conversationId, userId }) => {
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping: false
      });
    }
  });

  // Socket-based message sending
  socket.on('send_message', async (data, callback) => {
    try {
      const { conversationId, senderId, recipientId, text, attachments, messageType, clientTempId } = data;
      if (!text?.trim() && (!attachments || attachments.length === 0)) {
        if (typeof callback === 'function') callback({ success: false, message: 'Message text required' });
        return;
      }

      let convId = conversationId;
      if (!convId && recipientId && senderId) {
        let conv = await Conversation.findOne({
          participants: { $all: [senderId, recipientId] }
        });
        if (!conv) {
          conv = await Conversation.create({
            participants: [senderId, recipientId]
          });
        }
        convId = conv._id;
      }

      // Idempotency check
      if (clientTempId) {
        const existing = await Message.findOne({
          conversation: convId,
          sender: senderId,
          clientTempId
        })
          .populate('sender', 'name avatar role')
          .lean();

        if (existing) {
          if (typeof callback === 'function') {
            callback({ success: true, message: existing, clientTempId, isDuplicate: true });
          }
          return;
        }
      }

      let newMsg;
      try {
        newMsg = await Message.create({
          conversation: convId,
          sender: senderId,
          recipient: recipientId,
          text: text ? text.trim() : '',
          messageType: messageType || 'text',
          attachments: attachments || [],
          clientTempId: clientTempId || undefined,
          isRead: false
        });
      } catch (err) {
        if (err.code === 11000 && clientTempId) {
          const existing = await Message.findOne({
            conversation: convId,
            sender: senderId,
            clientTempId
          })
            .populate('sender', 'name avatar role')
            .lean();

          if (existing) {
            if (typeof callback === 'function') {
              callback({ success: true, message: existing, clientTempId, isDuplicate: true });
            }
            return;
          }
        }
        throw err;
      }

      await Conversation.findByIdAndUpdate(convId, {
        lastMessage: newMsg._id,
        lastMessageAt: newMsg.createdAt
      });

      const populatedMsg = await Message.findById(newMsg._id)
        .populate('sender', 'name avatar role')
        .lean();

      // Broadcast to room
      io.to(`conversation_${convId}`).emit('receive_message', populatedMsg);

      // Notify recipient's personal room
      io.to(`user_${recipientId}`).emit('new_message_notification', {
        conversationId: convId,
        message: populatedMsg
      });

      if (typeof callback === 'function') {
        callback({ success: true, message: populatedMsg, clientTempId });
      }
    } catch (error) {
      if (typeof callback === 'function') {
        callback({ success: false, message: error.message });
      }
      socket.emit('error', { message: 'Failed to send message: ' + error.message });
    }
  });

  // Socket-based read receipt trigger
  socket.on('mark_read', async ({ conversationId, userId }) => {
    try {
      if (!conversationId || !userId) return;
      const readAt = new Date();
      const result = await Message.updateMany(
        { conversation: conversationId, recipient: userId, isRead: false },
        { isRead: true, readAt }
      );

      if (result.modifiedCount > 0) {
        io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
          readAt
        });
      }
    } catch (err) {
      console.error('Socket mark_read error:', err.message);
    }
  });

  // Handle disconnect and cleanup presence
  socket.on('disconnect', () => {
    const uid = socketToUser.get(socket.id);
    if (uid) {
      socketToUser.delete(socket.id);
      const userSockets = onlineUsers.get(uid);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(uid);
          io.emit('user_presence', { userId: uid, isOnline: false });
        }
      }
    }
  });
};
