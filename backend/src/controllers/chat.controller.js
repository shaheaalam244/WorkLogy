import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';
import { createNotification } from '../services/notification.service.js';

/**
 * Get all conversations for the authenticated user
 * Includes participants, last message, related job/booking, and unread counts
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name email avatar role phone')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar role' }
      })
      .populate('relatedJob', 'title status budget category location customer assignedVendor')
      .populate('relatedBooking', 'status scheduledDate totalAmount address')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    // Attach unreadCount for the current user for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          $or: [
            { recipient: userId },
            { recipient: { $exists: false }, sender: { $ne: userId } }
          ],
          isRead: false
        });
        return {
          ...conv,
          unreadCount
        };
      })
    );

    res.status(200).json({ success: true, conversations: conversationsWithUnread });
  } catch (error) {
    next(error);
  }
};

/**
 * Get message history for a specific conversation
 * Validates participant authorization and supports pagination
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before; // Cursor timestamp for older messages

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this conversation' });
    }

    const query = { conversation: conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages sorted newest first, then reverse to chronological order
    const rawMessages = await Message.find(query)
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rawMessages.length > limit;
    const messages = (hasMore ? rawMessages.slice(0, limit) : rawMessages).reverse();

    // Automatically mark eligible unread messages for current user as read
    const unreadResult = await Message.updateMany(
      {
        conversation: conversationId,
        $or: [
          { recipient: userId },
          { recipient: { $exists: false }, sender: { $ne: userId } }
        ],
        isRead: false
      },
      { isRead: true, readAt: new Date() }
    );

    if (unreadResult.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        const readAt = new Date();
        io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
          readAt
        });

        // Notify reader's personal room so global tab badge updates immediately
        io.to(`user_${userId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
          readAt
        });

        // Also notify the other participant directly
        const otherParticipant = conversation.participants.find(
          (p) => p.toString() !== userId.toString()
        );
        if (otherParticipant) {
          io.to(`user_${otherParticipant}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            readAt
          });
        }
      }
    }

    // Map read status and reflect updated read state
    const normalizedMessages = messages.map((m) => {
      const isRecipient =
        (m.recipient && m.recipient.toString() === userId.toString()) ||
        (!m.recipient && m.sender?._id?.toString() !== userId.toString());
      const isNowRead = m.isRead || (unreadResult.modifiedCount > 0 && isRecipient);
      return {
        ...m,
        isRead: isNowRead,
        read: isNowRead,
        readAt: isNowRead ? (m.readAt || new Date()) : null
      };
    });

    res.status(200).json({
      success: true,
      messages: normalizedMessages,
      hasMore,
      oldestCursor: normalizedMessages.length > 0 ? normalizedMessages[0].createdAt : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message within a conversation
 * Persists to MongoDB, updates conversation, and broadcasts via Socket.IO
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, text, attachments, messageType, clientTempId } = req.body;
    const conversationId = req.body.conversationId || req.params.conversationId;
    const senderId = req.user.id;

    if (!text?.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required' });
    }

    let conversation = null;
    let targetRecipientId = recipientId;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === senderId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation' });
      }

      if (!targetRecipientId) {
        const other = conversation.participants.find((p) => p.toString() !== senderId.toString());
        targetRecipientId = other ? other.toString() : null;
      }
    } else if (targetRecipientId) {
      // Find or create conversation
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, targetRecipientId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, targetRecipientId]
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Conversation ID or recipient ID is required' });
    }

    if (!targetRecipientId) {
      return res.status(400).json({ success: false, message: 'Recipient could not be determined' });
    }

    // Verify recipient exists
    const recipientExists = await User.findById(targetRecipientId);
    if (!recipientExists) {
      return res.status(404).json({ success: false, message: 'Recipient user does not exist' });
    }

    // Server-side Idempotency Check: prevent duplicate persistence on repeated submissions
    if (clientTempId) {
      const existing = await Message.findOne({
        conversation: conversation._id,
        sender: senderId,
        clientTempId
      })
        .populate('sender', 'name avatar role')
        .lean();

      if (existing) {
        return res.status(200).json({
          success: true,
          message: existing,
          clientTempId,
          isDuplicate: true
        });
      }
    }

    // Create persisted message with concurrency guard
    let message;
    try {
      message = await Message.create({
        conversation: conversation._id,
        sender: senderId,
        recipient: targetRecipientId,
        text: text ? text.trim() : '',
        messageType: messageType || 'text',
        attachments: attachments || [],
        clientTempId: clientTempId || undefined,
        isRead: false
      });
    } catch (err) {
      if (err.code === 11000 && clientTempId) {
        // Concurrency race: existing message was inserted by a parallel request
        const existing = await Message.findOne({
          conversation: conversation._id,
          sender: senderId,
          clientTempId
        })
          .populate('sender', 'name avatar role')
          .lean();

        if (existing) {
          return res.status(200).json({
            success: true,
            message: existing,
            clientTempId,
            isDuplicate: true
          });
        }
      }
      throw err;
    }

    // Update conversation last message pointer and timestamp
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastMessageAt: message.createdAt
    });

    // Populate sender info for the response and socket payload
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar role')
      .lean();

    // Broadcast via Socket.IO using canonical receive_message event
    const io = getIO();
    if (io) {
      // Broadcast to all active sockets in the conversation room
      io.to(`conversation_${conversation._id}`).emit('receive_message', populatedMessage);

      // Notify the recipient's personal room for badge and notification toast
      io.to(`user_${targetRecipientId}`).emit('new_message_notification', {
        conversationId: conversation._id,
        message: populatedMessage,
        senderName: req.user.name || 'User'
      });
    }

    // Send persistent in-app notification & remote push notification to target recipient
    if (targetRecipientId && targetRecipientId.toString() !== req.user.id.toString()) {
      try {
        const senderName = req.user.name || 'User';
        const previewText = message.text
          ? (message.text.length > 80 ? message.text.slice(0, 77) + '...' : message.text)
          : (message.attachments?.length ? 'Sent an attachment' : 'New message');

        createNotification({
          recipientId: targetRecipientId,
          senderId: req.user.id,
          type: 'message',
          title: 'New message',
          message: `${senderName}: ${previewText}`,
          link: `/vendor/chat/${conversation._id}`,
          relatedResource: {
            resourceType: 'conversation',
            resourceId: conversation._id
          },
          sendEmailNotification: false,
          sendPush: true
        }).catch((notifErr) => {
          console.warn('Non-fatal: Chat message notification error:', notifErr.message);
        });
      } catch (err) {
        console.warn('Non-fatal: Chat message notification setup error:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
      clientTempId: clientTempId || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all unread messages in a conversation as read
 */
export const markConversationRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized for this conversation' });
    }

    const readAt = new Date();
    const result = await Message.updateMany(
      {
        conversation: conversationId,
        $or: [
          { recipient: userId },
          { recipient: { $exists: false }, sender: { $ne: userId } }
        ],
        isRead: false
      },
      { isRead: true, readAt }
    );

    if (result.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
          readAt
        });

        // Notify reader's personal room so their own global badge updates immediately
        io.to(`user_${userId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
          readAt
        });

        const otherParticipant = conversation.participants.find(
          (p) => p.toString() !== userId.toString()
        );
        if (otherParticipant) {
          io.to(`user_${otherParticipant}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            readAt
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      readAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve or create an authorized conversation between participants
 */
export const startConversation = async (req, res, next) => {
  try {
    const { recipientId, relatedJob, relatedBooking } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    if (recipientId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
    }

    // Check if conversation exists
    let conversation = null;
    if (relatedJob) {
      conversation = await Conversation.findOne({
        participants: { $all: [userId, recipientId] },
        relatedJob
      });
    }

    if (!conversation) {
      conversation = await Conversation.findOne({
        participants: { $all: [userId, recipientId] }
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        relatedJob: relatedJob || null,
        relatedBooking: relatedBooking || null,
        lastMessageAt: new Date()
      });
    } else if (relatedJob && !conversation.relatedJob) {
      // Attach job if not previously attached
      conversation.relatedJob = relatedJob;
      if (relatedBooking) conversation.relatedBooking = relatedBooking;
      await conversation.save();
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar role phone')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar role' }
      })
      .populate('relatedJob', 'title status budget category location')
      .populate('relatedBooking', 'status scheduledDate totalAmount address');

    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Get total unread message count across all conversations for current user
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const unreadCount = await Message.countDocuments({
      $or: [
        { recipient: userId },
        { recipient: { $exists: false }, sender: { $ne: userId } }
      ],
      isRead: false
    });

    res.status(200).json({ success: true, count: unreadCount, unreadCount });
  } catch (error) {
    next(error);
  }
};
