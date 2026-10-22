import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Send,
  Paperclip,
  Phone,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Briefcase,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocketContext } from '../../context/SocketContext';
import chatAPI from '../../api/chat.api';
import {
  formatChatTimestamp,
  formatChatDateSeparator,
  formatConversationTimestamp,
  getStatusBadgeColor
} from '../../utils/formatters';

export default function MessagingHub({ portalType = 'vendor' }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocketContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [text, setText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const currentUserId = user?.id || user?._id;
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const formRef = useRef(null);
  const isSendingRef = useRef(false);

  // Stable refs for socket event handlers to prevent frequent re-subscriptions
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Helper to extract the other participant from a conversation
  const getOtherParticipant = useCallback((conv) => {
    if (!conv || !conv.participants) return null;
    return conv.participants.find((p) => {
      const pId = p?._id || p?.id;
      return pId && pId.toString() !== currentUserId?.toString();
    }) || conv.participants[0];
  }, [currentUserId]);

  // Scroll to bottom smoothly
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // 1. Fetch conversations on initial load
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      setErrorMsg(null);
      const res = await chatAPI.getConversations();
      if (res?.success) {
        const list = res.conversations || [];
        setConversations(list);

        // Check online status for all participants
        if (socket && isConnected) {
          const participantIds = list
            .map((c) => getOtherParticipant(c)?._id)
            .filter(Boolean);
          socket.emit('check_presence', participantIds, (presenceRes) => {
            if (presenceRes?.onlineUserIds) {
              setOnlineUsers(new Set(presenceRes.onlineUserIds.map(String)));
            }
          });
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setErrorMsg('Failed to load conversations. Please try refreshing.');
    } finally {
      setLoadingConversations(false);
    }
  }, [socket, isConnected, getOtherParticipant]);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, loadConversations]);

  // 2. Handle URL parameters (?conv=..., ?jobId=..., ?recipientId=...)
  useEffect(() => {
    const convId = searchParams.get('conv');
    const jobId = searchParams.get('jobId');
    const recipientId = searchParams.get('recipientId');

    const initializeActiveChat = async () => {
      // If direct conversation ID is in URL
      if (convId) {
        const found = conversations.find((c) => c._id === convId);
        if (found) {
          setActiveConversation(found);
          return;
        }
      }

      // If jobId or recipientId is specified, retrieve or initiate conversation
      if (recipientId && recipientId !== currentUserId) {
        try {
          const res = await chatAPI.startConversation({
            recipientId,
            relatedJob: jobId || undefined
          });
          if (res?.success && res.conversation) {
            const newConv = res.conversation;
            setConversations((prev) => {
              const exists = prev.some((c) => c._id === newConv._id);
              if (exists) {
                return prev.map((c) => (c._id === newConv._id ? newConv : c));
              }
              return [newConv, ...prev];
            });
            setActiveConversation(newConv);
            setSearchParams({ conv: newConv._id }, { replace: true });
          }
        } catch (err) {
          console.error('Failed to start conversation from URL params:', err);
        }
      } else if (!convId && conversations.length > 0 && window.innerWidth >= 768 && !activeConversation) {
        // Desktop default: pick the first conversation if none selected
        setActiveConversation(conversations[0]);
        setSearchParams({ conv: conversations[0]._id }, { replace: true });
      }
    };

    if (!loadingConversations) {
      initializeActiveChat();
    }
  }, [searchParams, conversations, loadingConversations, currentUserId, setSearchParams]);

  // 3. Load messages when activeConversation changes
  useEffect(() => {
    if (!activeConversation?._id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await chatAPI.getMessages(activeConversation._id, { limit: 50 });
        if (isMounted && res?.success) {
          setMessages(res.messages || []);
          setHasMore(!!res.hasMore);

          // Reset unread count for this conversation in list
          setConversations((prev) =>
            prev.map((c) =>
              c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c
            )
          );

          // Scroll to bottom after loading
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Socket: Join conversation room
    if (socket) {
      socket.emit('join_conversation', activeConversation._id);
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.emit('leave_conversation', activeConversation._id);
      }
    };
  }, [activeConversation?._id, socket]);

  // 4. Load older messages (pagination)
  const handleLoadOlderMessages = async () => {
    if (!activeConversation?._id || loadingMore || !hasMore || messages.length === 0) return;
    try {
      setLoadingMore(true);
      const oldestMessage = messages[0];
      const res = await chatAPI.getMessages(activeConversation._id, {
        limit: 30,
        before: oldestMessage.createdAt
      });
      if (res?.success) {
        const older = res.messages || [];
        setMessages((prev) => [...older, ...prev]);
        setHasMore(!!res.hasMore);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 5. Real-Time Socket Event Handlers (Bound once per socket lifecycle)
  useEffect(() => {
    if (!socket) return;

    // Incoming message with canonical reconciliation and deduplication
    const handleReceiveMessage = (msg) => {
      if (!msg) return;

      const currentActive = activeConversationRef.current;
      const isCurrentChat =
        currentActive &&
        (msg.conversation?._id?.toString() === currentActive._id?.toString() ||
          msg.conversation?.toString() === currentActive._id?.toString());

      if (isCurrentChat) {
        setMessages((prev) => {
          // 1. If already exists by canonical _id, update in place without duplicate append
          const existsById = prev.some((m) => m._id === msg._id);
          if (existsById) {
            return prev.map((m) => (m._id === msg._id ? { ...m, ...msg, status: 'sent' } : m));
          }

          // 2. If an optimistic message matches clientTempId, replace it with canonical
          if (msg.clientTempId) {
            const hasOptimistic = prev.some(
              (m) => m.clientTempId === msg.clientTempId || m._id === msg.clientTempId
            );
            if (hasOptimistic) {
              return prev.map((m) =>
                m.clientTempId === msg.clientTempId || m._id === msg.clientTempId
                  ? { ...msg, status: 'sent' }
                  : m
              );
            }
          }

          // 3. Otherwise append new message
          return [...prev, { ...msg, status: 'sent' }];
        });

        // Mark as read immediately on backend
        chatAPI.markConversationRead(currentActive._id).catch(() => {});
        setTimeout(() => scrollToBottom('smooth'), 50);
      }

      // Update conversation list item
      setConversations((prev) => {
        const msgConvId = msg.conversation?._id || msg.conversation;
        const convIndex = prev.findIndex((c) => c._id === msgConvId);
        if (convIndex === -1) {
          // If conversation is brand new, reload list
          loadConversations();
          return prev;
        }

        const targetConv = prev[convIndex];
        const updatedConv = {
          ...targetConv,
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          unreadCount: isCurrentChat ? 0 : (targetConv.unreadCount || 0) + 1
        };

        const remaining = prev.filter((_, idx) => idx !== convIndex);
        return [updatedConv, ...remaining];
      });
    };

    // Read receipts update
    const handleMessagesRead = ({ conversationId, readerId, readAt }) => {
      const currentActive = activeConversationRef.current;
      const currentUid = currentUserIdRef.current;

      if (currentActive && conversationId === currentActive._id) {
        setMessages((prev) =>
          prev.map((m) => {
            const senderId = m.sender?._id || m.sender;
            if (senderId?.toString() === currentUid?.toString()) {
              return { ...m, isRead: true, readAt: readAt || new Date().toISOString() };
            }
            return m;
          })
        );
      }

      // Update unread count in conversation list
      if (readerId === currentUid) {
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    };

    // Typing indicator
    const handleUserTyping = ({ conversationId, userId, userName, isTyping }) => {
      const currentUid = currentUserIdRef.current;
      if (userId?.toString() === currentUid?.toString()) return;
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: isTyping ? userName || 'Typing...' : null
      }));
    };

    // User online status update
    const handleUserPresence = ({ userId, isOnline }) => {
      if (!userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId.toString());
        } else {
          next.delete(userId.toString());
        }
        return next;
      });
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_presence', handleUserPresence);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_presence', handleUserPresence);
    };
  }, [socket, loadConversations]);

  // 6. Typing trigger on keystrokes
  const handleInputChange = (e) => {
    setText(e.target.value);
    if (!socket || !activeConversation?._id) return;

    socket.emit('typing_start', {
      conversationId: activeConversation._id,
      userId: currentUserId,
      userName: user?.name || 'User'
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', {
        conversationId: activeConversation._id,
        userId: currentUserId
      });
    }, 2000);
  };

  // 7. Send message workflow with single-execution lock & optimistic reconciliation
  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Prevent duplicate synchronous or asynchronous execution
    if (isSendingRef.current) return;

    const content = text.trim();
    if (!content || !activeConversation?._id) return;

    isSendingRef.current = true;
    setSending(true);

    const otherUser = getOtherParticipant(activeConversation);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg = {
      _id: tempId,
      clientTempId: tempId,
      conversation: activeConversation._id,
      sender: {
        _id: currentUserId,
        name: user?.name || 'Me',
        avatar: user?.avatar,
        role: user?.role
      },
      recipient: otherUser?._id,
      text: content,
      isRead: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      status: 'sending'
    };

    // Immediately show optimistic message & clear input
    setMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    setTimeout(() => scrollToBottom('smooth'), 30);

    // Stop typing indicator immediately
    if (socket && activeConversation?._id) {
      socket.emit('typing_stop', {
        conversationId: activeConversation._id,
        userId: currentUserId
      });
    }

    try {
      const res = await chatAPI.sendMessage({
        conversationId: activeConversation._id,
        recipientId: otherUser?._id,
        text: content,
        clientTempId: tempId
      });

      if (res?.success && res.message) {
        const canonical = res.message;
        // Reconcile optimistic message with canonical persisted message
        setMessages((prev) => {
          const alreadyHasCanonical = prev.some((m) => m._id === canonical._id);
          if (alreadyHasCanonical) {
            // Socket receive_message already added canonical._id; remove leftover optimistic item and sync
            return prev
              .filter((m) => m._id !== tempId)
              .map((m) => (m._id === canonical._id ? { ...m, ...canonical, status: 'sent' } : m));
          }
          // Replace optimistic item with canonical item
          return prev.map((m) =>
            m.clientTempId === tempId || m._id === tempId ? { ...canonical, status: 'sent' } : m
          );
        });

        // Update conversation list preview
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c._id === activeConversation._id);
          if (idx === -1) return prev;
          const updated = {
            ...prev[idx],
            lastMessage: canonical,
            lastMessageAt: canonical.createdAt
          };
          const rest = prev.filter((_, i) => i !== idx);
          return [updated, ...rest];
        });
      } else {
        throw new Error(res?.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Send message error:', err);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.clientTempId === tempId ? { ...m, status: 'failed', error: err.message } : m
        )
      );
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMsg) => {
    if (!failedMsg || !activeConversation?._id || isSendingRef.current) return;
    const otherUser = getOtherParticipant(activeConversation);

    isSendingRef.current = true;
    setSending(true);

    setMessages((prev) =>
      prev.map((m) =>
        m._id === failedMsg._id ? { ...m, status: 'sending', error: null } : m
      )
    );

    try {
      const res = await chatAPI.sendMessage({
        conversationId: activeConversation._id,
        recipientId: otherUser?._id,
        text: failedMsg.text,
        clientTempId: failedMsg.clientTempId || failedMsg._id
      });

      if (res?.success && res.message) {
        const canonical = res.message;
        setMessages((prev) =>
          prev.map((m) => (m._id === failedMsg._id || m.clientTempId === failedMsg._id ? { ...canonical, status: 'sent' } : m))
        );
      } else {
        throw new Error('Retry failed');
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === failedMsg._id ? { ...m, status: 'failed', error: 'Retry failed' } : m
        )
      );
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isSendingRef.current && text.trim()) {
        handleSendMessage(e);
      }
    }
  };

  // Select a conversation
  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setSearchParams({ conv: conv._id });
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const other = getOtherParticipant(c);
    const participantName = other?.name?.toLowerCase() || '';
    const jobTitle = c.relatedJob?.title?.toLowerCase() || '';
    const lastMsgText = c.lastMessage?.text?.toLowerCase() || '';
    return (
      participantName.includes(query) ||
      jobTitle.includes(query) ||
      lastMsgText.includes(query)
    );
  });

  const totalUnreadCount = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  const activeOtherUser = getOtherParticipant(activeConversation);
  const isActiveOtherOnline = activeOtherUser && onlineUsers.has(activeOtherUser._id?.toString());
  const activeTypingUser = activeConversation ? typingUsers[activeConversation._id] : null;

  // Group messages by date for date separators
  const renderMessagesWithDateSeparators = () => {
    let lastDateGroup = null;
    return messages.map((msg, index) => {
      const msgDateSeparator = formatChatDateSeparator(msg.createdAt);
      const showSeparator = msgDateSeparator !== lastDateGroup;
      if (showSeparator) {
        lastDateGroup = msgDateSeparator;
      }

      const senderId = msg.sender?._id || msg.sender;
      const isOwn = senderId?.toString() === currentUserId?.toString();

      return (
        <React.Fragment key={msg._id || msg.clientTempId || index}>
          {showSeparator && (
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 rounded-full bg-slate-200/70 border border-slate-300/60 text-[11px] font-semibold text-slate-600 shadow-2xs">
                {msgDateSeparator}
              </span>
            </div>
          )}

          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-3`}>
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                isOwn
                  ? 'bg-emerald-800 text-white rounded-br-none shadow-sm'
                  : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
            </div>

            {/* Bubble Footer: Timestamp & Read Status */}
            <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px]">
              <span className={isOwn ? 'text-slate-500' : 'text-slate-400'}>
                {formatChatTimestamp(msg.createdAt)}
              </span>

              {isOwn && (
                <>
                  {msg.status === 'sending' && (
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <Clock className="w-3 h-3 animate-spin text-slate-400" />
                      <span>Sending...</span>
                    </span>
                  )}

                  {msg.status === 'failed' && (
                    <button
                      onClick={() => handleRetryMessage(msg)}
                      className="flex items-center gap-1 text-rose-600 font-bold hover:underline"
                    >
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Failed • Retry</span>
                    </button>
                  )}

                  {msg.status !== 'sending' && msg.status !== 'failed' && (
                    <>
                      {msg.isRead ? (
                        <span className="flex items-center gap-0.5 text-emerald-700 font-bold" title={`Read ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString() : ''}`}>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Read</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-slate-400" title="Delivered to server">
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sent</span>
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-slate-200/80 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {portalType === 'vendor' ? 'Customer Conversations' : 'Pro Direct Messages'}
            </h1>
            {totalUnreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {totalUnreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {portalType === 'vendor'
              ? 'Coordinate project milestones, arrival times, and site instructions with your clients'
              : 'Direct real-time communication with assigned trade contractors and verified professionals'}
          </p>
        </div>

        {/* Real-time connection badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-xs font-semibold text-slate-600">
            {isConnected ? 'Real-Time Sync Active' : 'Connecting Sync...'}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadConversations}
            className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-rose-700 font-bold hover:bg-rose-100 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Two-Column Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100vh-185px)] min-h-[580px]">
        {/* ======================================================== */}
        {/* LEFT PANEL: Conversation List (~340px-380px)            */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3.5 border-b border-slate-200/80 bg-white space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations, clients, jobs..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConversations ? (
              // Loading Skeleton
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 bg-slate-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-3/4 h-3.5 bg-slate-200 rounded" />
                      <div className="w-1/2 h-2.5 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              // Empty State
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  {searchQuery
                    ? 'Try searching with a different client name or service title'
                    : portalType === 'vendor'
                    ? 'When you accept customer jobs or receive inquiries, your direct chats appear here.'
                    : 'When you book a pro or post a job, your active chats will appear here.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs text-emerald-800 font-bold hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              // Active Conversation Cards
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isOnline = other && onlineUsers.has(other._id?.toString());
                const isActive = activeConversation?._id === conv._id;
                const unread = conv.unreadCount || 0;
                const lastMsg = conv.lastMessage;
                const isLastMsgOwn =
                  lastMsg?.sender?._id?.toString() === currentUserId?.toString() ||
                  lastMsg?.sender?.toString() === currentUserId?.toString();

                return (
                  <div
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative ${
                      isActive
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-700'
                        : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    {/* Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      <img
                        src={
                          other?.avatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={other?.name || 'Participant'}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100"
                      />
                      {isOnline && (
                        <span
                          className="w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-white absolute bottom-0 right-0"
                          title="Online now"
                        />
                      )}
                    </div>

                    {/* Conversation Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {other?.name || 'Customer'}
                          </h4>
                          {other?.role === 'vendor' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-800 shrink-0">
                              Pro
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatConversationTimestamp(conv.lastMessageAt || conv.updatedAt)}
                        </span>
                      </div>

                      {/* Related Job Tag (if available) */}
                      {conv.relatedJob && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-emerald-800 font-semibold truncate">
                          <Briefcase className="w-3 h-3 text-emerald-700 shrink-0" />
                          <span className="truncate">{conv.relatedJob.title}</span>
                        </div>
                      )}

                      {/* Last Message Preview */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className={`text-xs truncate ${
                            unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {isLastMsgOwn ? 'You: ' : ''}
                          {lastMsg?.text || 'Conversation started'}
                        </p>

                        {/* Unread badge */}
                        {unread > 0 && (
                          <span className="min-w-[18px] h-4.5 px-1.5 flex items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-extrabold shrink-0 shadow-2xs">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Active Chat & Composer                     */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex flex-col h-full bg-white relative ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition -ml-1"
                    title="Back to conversation list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Header Avatar with Status */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        activeOtherUser?.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={activeOtherUser?.name || 'Contact'}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-700/20"
                    />
                    {isActiveOtherOnline && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white absolute bottom-0 right-0" />
                    )}
                  </div>

                  {/* Participant Name & Online Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {activeOtherUser?.name || 'Client'}
                      </h3>
                      {activeOtherUser?.role === 'vendor' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
                          Trade Pro
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Client
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {isActiveOtherOnline ? (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>Active Now</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Offline • Replies via notification
                        </span>
                      )}

                      {/* Related Job Tag in Header */}
                      {activeConversation.relatedJob && (
                        <span className="text-slate-300 hidden sm:inline">•</span>
                      )}
                      {activeConversation.relatedJob && (
                        <Link
                          to={
                            portalType === 'vendor'
                              ? `/vendor/manage-job/${activeConversation.relatedJob._id}`
                              : `/customer/bookings`
                          }
                          className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-900 font-bold truncate hover:underline"
                        >
                          <Briefcase className="w-3 h-3 text-emerald-700" />
                          <span className="truncate">
                            {activeConversation.relatedJob.title}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeOtherUser?.phone && (
                    <a
                      href={`tel:${activeOtherUser.phone}`}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                      title="Call customer"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}

                  {activeConversation.relatedJob && (
                    <Link
                      to={
                        portalType === 'vendor'
                          ? `/vendor/manage-job/${activeConversation.relatedJob._id}`
                          : `/customer/bookings`
                      }
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                      title="View job management details"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Job Portal</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/40 relative"
              >
                {/* Pagination button at top if older messages exist */}
                {hasMore && (
                  <div className="flex justify-center mb-3">
                    <button
                      onClick={handleLoadOlderMessages}
                      disabled={loadingMore}
                      className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                    >
                      {loadingMore ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-700" />
                          <span>Loading history...</span>
                        </>
                      ) : (
                        <span>Load older messages</span>
                      )}
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
                      <span className="text-xs">Loading secure message history...</span>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Start your conversation</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                      Send a message to coordinate arrival times, tools, materials, and job details.
                    </p>
                  </div>
                ) : (
                  renderMessagesWithDateSeparators()
                )}

                {/* Real-time typing bubble */}
                {activeTypingUser && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white/80 border border-slate-200 px-3 py-1.5 rounded-xl w-fit shadow-2xs animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                    <span>{activeTypingUser} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer (Fixed to Bottom) */}
              <form
                ref={formRef}
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
              >
                <button
                  type="button"
                  title="Attach file (future extensible)"
                  onClick={() => alert('File & photo attachments are being integrated with cloud storage.')}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  rows={1}
                  value={text}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 resize-none max-h-28"
                />

                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-white font-bold transition shadow-sm flex items-center gap-1.5 ${
                    !text.trim() || sending
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-800 hover:bg-emerald-900 active:scale-95'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Send</span>
                </button>
              </form>
            </>
          ) : (
            // No Conversation Selected (Desktop Empty Placeholder)
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Your WorkLogy Inbox</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                Select a client or pro conversation from the left to coordinate service details, schedule milestone visits, and view live read receipts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
