import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
  BackHandler,
  Linking,
  Keyboard,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { socketService } from '../services/socketService';
import { dataSyncService } from '../services/dataSyncService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatTime, formatChatDateSeparator, getStatusColor, formatStatusText } from '../utils/formatters';
import type { ChatMessage } from '../types';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (Platform.OS === 'ios' ? 44 : 0);

const QUICK_PROMPTS = [
  'What is your estimated arrival time?',
  'Please call me once you reach the gate.',
  'Do you have all necessary tools and spares?',
  'I am at home and ready for the service.'
];

export default function ChatDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = insets.bottom;

  const {
    conversationId: initialConvId,
    bookingId,
    booking: paramBooking,
    job: paramJob,
    relatedJob: paramRelatedJob,
    relatedBooking: paramRelatedBooking,
    otherUser: paramOtherUser,
    title
  } = route.params || {};

  const { user, isLoading: authLoading } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(initialConvId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef(true);
  const isNearBottomRef = useRef(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const targetScrollIndexRef = useRef<number>(-1);
  const hasAutoScrolledRef = useRef<boolean>(false);

  // Track whether user is scrolled near bottom of messages
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distanceFromBottom <= 80;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMessageIndicator(false);
    }
  }, []);

  // Listen to keyboard show/hide events to adapt layout and preserve bottom message position
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardOpen(true);
      if (isNearBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const activeBooking = paramBooking || paramRelatedBooking;
  const activeJob = paramJob || paramRelatedJob;
  const otherUser = paramOtherUser || {};
  const technicianName = otherUser.businessName || otherUser.name || 'Assigned Technician';
  const isVerified = otherUser.isVerified === true;
  const bookingStatus = activeBooking?.status || activeJob?.status || '';
  const contextTitle = activeBooking?.serviceTitle || activeJob?.title || title || 'Service Chat';

  // 1. Android Back Handler (Hardware & In-App step-by-step navigation)
  useEffect(() => {
    const onBackPress = () => {
      Keyboard.dismiss();
      navigation.goBack();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      backSub.remove();
      Keyboard.dismiss();
    };
  }, [navigation]);

  // 2. Initialize Conversation & Load Message History
  useEffect(() => {
    isMountedRef.current = true;

    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setError(null);
      setIsSessionExpired(false);
      return;
    }

    initConversation();

    return () => {
      isMountedRef.current = false;
    };
  }, [initialConvId, bookingId, user?._id, authLoading]);

  const initConversation = async () => {
    if (!user) {
      if (isMountedRef.current) setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsSessionExpired(false);

      let targetConvId = conversationId;

      // If no direct conversationId, resolve or create via API
      if (!targetConvId) {
        const resolvedRecipientId =
          otherUser._id ||
          otherUser.id ||
          otherUser.user?._id ||
          otherUser.user ||
          activeBooking?.vendor?.user?._id ||
          activeBooking?.vendor?.user ||
          (typeof activeBooking?.vendor === 'string' ? activeBooking.vendor : activeBooking?.vendor?._id) ||
          route?.params?.recipientId ||
          route?.params?.receiverId ||
          route?.params?.vendorId;

        if (resolvedRecipientId) {
          const startRes = await api.chat.startConversation({
            recipientId: String(resolvedRecipientId),
            relatedBooking: activeBooking?._id || bookingId,
            relatedJob: activeJob?._id
          });
          if (startRes.success && startRes.conversation?._id) {
            targetConvId = startRes.conversation._id;
            if (isMountedRef.current) {
              setConversationId(targetConvId);
            }
          }
        }
      }

      if (targetConvId) {
        await loadMessages(targetConvId);
      } else {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.isSessionExpired || err?.status === 401 || err?.message?.includes('token missing')) {
          setIsSessionExpired(true);
          setError('Session expired. Please sign in again.');
        } else {
          setError(err.message || 'Unable to open conversation');
        }
        setLoading(false);
      }
    }
  };

  const performInitialScroll = useCallback(() => {
    if (hasAutoScrolledRef.current || messages.length === 0) return;
    hasAutoScrolledRef.current = true;

    const targetIdx = targetScrollIndexRef.current;
    if (targetIdx >= 0 && targetIdx < messages.length) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: targetIdx,
            animated: true,
            viewPosition: 0.5
          });
        } catch {
          flatListRef.current?.scrollToEnd({ animated: false });
        }
      }, 80);
    } else {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 80);
    }
  }, [messages.length]);

  const loadMessages = async (convId: string) => {
    try {
      const res = await api.chat.getMessages(convId, { limit: 50 });
      if (res.success && isMountedRef.current) {
        const sorted = (res.messages || []).map((m) => ({
          ...m,
          status: 'sent' as const
        }));

        // Determine the latest unread incoming message index
        let latestUnreadIdx = -1;
        for (let i = sorted.length - 1; i >= 0; i--) {
          const m = sorted[i];
          const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
          const isIncoming = senderId !== user?._id && String(senderId) !== String(user?._id);
          const isUnread = !m.isRead && !m.read;
          if (isIncoming && isUnread) {
            latestUnreadIdx = i;
            break;
          }
        }

        targetScrollIndexRef.current = latestUnreadIdx;
        hasAutoScrolledRef.current = false;
        setMessages(sorted);
        setHasMore(!!res.hasMore);
        setOldestCursor(res.oldestCursor || null);

        // Mark read asynchronously and notify sync service without disrupting scroll
        api.chat.markConversationRead(convId).then(() => {
          dataSyncService.notify('MESSAGES_READ', { conversationId: convId });
        }).catch(() => {});
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.isSessionExpired || err?.status === 401 || err?.message?.includes('token missing')) {
          setIsSessionExpired(true);
          setError('Session expired. Please sign in again.');
        } else {
          setError(err.message || 'Failed to load messages');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLoadOlder = async () => {
    if (!conversationId || !hasMore || !oldestCursor || loadingOlder) return;

    try {
      setLoadingOlder(true);
      const res = await api.chat.getMessages(conversationId, { limit: 30, before: oldestCursor });
      if (res.success && isMountedRef.current && res.messages?.length) {
        const older = res.messages.map((m) => ({
          ...m,
          status: 'sent' as const
        }));

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const uniqueOlder = older.filter((m) => !existingIds.has(m._id));
          return [...uniqueOlder, ...prev];
        });

        setHasMore(!!res.hasMore);
        setOldestCursor(res.oldestCursor || null);
      } else if (isMountedRef.current) {
        setHasMore(false);
      }
    } catch (err) {
      // silently handle pagination error
    } finally {
      if (isMountedRef.current) {
        setLoadingOlder(false);
      }
    }
  };

  // 3. Real-Time Socket Connection & Room Subscription
  useEffect(() => {
    let socket: any = null;
    let isSubscribed = true;

    const setupChatSocket = async () => {
      socket = await socketService.connect(user?._id);
      if (!socket || !isSubscribed) return;

      // Join conversation room
      if (conversationId) {
        socket.emit('join_conversation', conversationId);
      }

      // Check recipient online presence
      if (otherUser?._id) {
        socket.emit('check_presence', [String(otherUser._id)], (response: { onlineUserIds?: string[] }) => {
          if (isSubscribed && response?.onlineUserIds?.includes(String(otherUser._id))) {
            setIsOnline(true);
          }
        });
      }

      // Receive incoming messages
      socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (incoming: ChatMessage) => {
        if (!isSubscribed) return;

        const msgConvId = String(incoming.conversation || incoming.conversationId || '');
        if (conversationId && msgConvId !== String(conversationId)) return;

        setMessages((prev) => {
          const matchIdx = prev.findIndex(
            (m) =>
              m._id === incoming._id ||
              (incoming.clientTempId && m.clientTempId === incoming.clientTempId)
          );

          if (matchIdx !== -1) {
            const updated = [...prev];
            updated[matchIdx] = { ...incoming, status: 'sent' };
            return updated;
          }
          return [...prev, { ...incoming, status: 'sent' }];
        });

        // Mark read if incoming from vendor
        const senderId = typeof incoming.sender === 'object' ? incoming.sender._id : incoming.sender;
        const isIncoming = senderId !== user?._id && String(senderId) !== String(user?._id);
        if (isIncoming && conversationId) {
          api.chat.markConversationRead(conversationId).then(() => {
            dataSyncService.notify('MESSAGES_READ', { conversationId });
          }).catch(() => {});
        }

        if (isNearBottomRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else if (isIncoming) {
          setShowNewMessageIndicator(true);
        }
      });

      // Messages read receipt update
      socket.on('messages_read', (data: { conversationId: string; readerId: string }) => {
        if (!isSubscribed) return;
        if (conversationId && String(data.conversationId) === String(conversationId)) {
          setMessages((prev) =>
            prev.map((m) => {
              const sId = typeof m.sender === 'object' ? m.sender._id : m.sender;
              if (sId === user?._id) {
                return { ...m, isRead: true, read: true };
              }
              return m;
            })
          );
        }
      });

      // Presence broadcast update
      socket.on('user_presence', (data: { userId: string; isOnline: boolean }) => {
        if (!isSubscribed) return;
        if (String(data.userId) === String(otherUser?._id)) {
          setIsOnline(data.isOnline);
        }
      });
    };

    setupChatSocket();

    return () => {
      isSubscribed = false;
      if (socket) {
        if (conversationId) {
          socket.emit('leave_conversation', conversationId);
        }
        socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
        socket.off('messages_read');
        socket.off('user_presence');
      }
    };
  }, [conversationId, otherUser?._id, user?._id]);

  // 4. Send Message (with Optimistic UI & Idempotency)
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || inputText).trim();
    if (!textToSend || sending) return;

    const clientTempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const optimisticMsg: ChatMessage = {
      _id: clientTempId,
      clientTempId,
      conversationId: conversationId || undefined,
      sender: {
        _id: user?._id || 'me',
        name: user?.name || 'Customer',
        avatar: user?.avatar,
        role: user?.role || 'customer'
      },
      recipient: otherUser?._id,
      text: textToSend,
      messageType: 'text',
      status: 'sending',
      isRead: false,
      read: false,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const res = await api.chat.sendMessage({
        conversationId: conversationId || undefined,
        recipientId: otherUser?._id,
        text: textToSend,
        clientTempId
      });

      if (res.success && res.message && isMountedRef.current) {
        // If this was the first message and conversation was just created
        const confirmedConvId = String(res.message.conversation || res.message.conversationId || '');
        if (!conversationId && confirmedConvId) {
          setConversationId(confirmedConvId);
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('join_conversation', confirmedConvId);
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.clientTempId === clientTempId
              ? { ...res.message, status: 'sent' }
              : m
          )
        );
      }
    } catch (err) {
      if (isMountedRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientTempId === clientTempId
              ? { ...m, status: 'failed' }
              : m
          )
        );
      }
    } finally {
      if (isMountedRef.current) {
        setSending(false);
      }
    }
  };

  const handleRetryMessage = (failedMsg: ChatMessage) => {
    // Remove the failed message and resend its text
    setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));
    handleSendMessage(failedMsg.text);
  };

  const handleCallVendor = () => {
    if (otherUser.phone) {
      Linking.openURL(`tel:${otherUser.phone}`);
    }
  };

  // 5. Render Message Item with Date Separator & Delivery Indicators
  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const senderId = typeof item.sender === 'object' ? item.sender._id : item.sender;
    const isMe = senderId === user?._id || (user?._id && String(senderId) === String(user._id));

    // Show date separator if first message or calendar date changes
    let showDateSeparator = false;
    if (index === 0) {
      showDateSeparator = true;
    } else {
      const prevMsg = messages[index - 1];
      if (prevMsg) {
        const prevDate = formatChatDateSeparator(prevMsg.createdAt);
        const currDate = formatChatDateSeparator(item.createdAt);
        if (prevDate !== currDate) {
          showDateSeparator = true;
        }
      }
    }

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparatorWrapper}>
            <View style={styles.dateSeparatorLine} />
            <View style={styles.dateSeparatorPill}>
              <Text style={styles.dateSeparatorText}>
                {formatChatDateSeparator(item.createdAt)}
              </Text>
            </View>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
              {item.text}
            </Text>

            <View style={styles.bubbleFooter}>
              <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
                {formatTime(item.createdAt)}
              </Text>

              {/* Status Indicator for Customer's sent messages */}
              {isMe && (
                <View style={styles.statusIndicatorWrapper}>
                  {item.status === 'sending' ? (
                    <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.75)" />
                  ) : item.status === 'failed' ? (
                    <TouchableOpacity
                      onPress={() => handleRetryMessage(item)}
                      style={styles.retryRow}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="alert-circle" size={13} color="#FCA5A5" />
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  ) : item.isRead || item.read ? (
                    <Ionicons name="checkmark-done" size={13} color="#A7F3D0" />
                  ) : (
                    <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.75)" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" />

      {/* Top Header Bar */}
      <View style={[styles.headerContainer, { paddingTop: topInset + (Platform.OS === 'ios' ? 8 : 10) }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack();
            }}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>

          {/* Technician Profile Avatar */}
          <View style={styles.avatarWrapper}>
            {otherUser.avatar ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {technicianName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {isVerified && (
              <View style={styles.verifiedCheckPill}>
                <Ionicons name="checkmark-sharp" size={8} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Technician Details */}
          <View style={styles.headerTitleContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.technicianName} numberOfLines={1}>
                {technicianName}
              </Text>
            </View>

            {/* Online Status */}
            <View style={styles.presenceRow}>
              <View style={[styles.presenceDot, isOnline ? styles.presenceDotOnline : styles.presenceDotOffline]} />
              <Text style={[styles.presenceText, isOnline ? styles.presenceTextOnline : styles.presenceTextOffline]}>
                {isOnline ? 'Active now' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Call Technician Action (if phone available) */}
          {otherUser.phone ? (
            <TouchableOpacity
              onPress={handleCallVendor}
              style={styles.callButton}
              activeOpacity={0.75}
            >
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Associated Booking Context Banner */}
        {(activeBooking || activeJob) && (
          <View style={styles.bookingContextBanner}>
            <View style={styles.bookingContextLeft}>
              <View style={styles.bookingContextIcon}>
                <Ionicons name="build-outline" size={14} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingServiceTitle} numberOfLines={1}>
                  {contextTitle}
                </Text>
                <View style={styles.bookingMetaRow}>
                  {bookingStatus ? (
                    <View style={[styles.bookingStatusBadge, { backgroundColor: getStatusColor(bookingStatus) + '1A' }]}>
                      <Text style={[styles.bookingStatusText, { color: getStatusColor(bookingStatus) }]}>
                        {formatStatusText(bookingStatus)}
                      </Text>
                    </View>
                  ) : null}
                  {(activeBooking?.bookingReference || activeBooking?._id) && (
                    <Text style={styles.bookingRefText}>
                      Ref #{String(activeBooking?.bookingReference || activeBooking?._id).slice(-6).toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewBookingBtn}
              onPress={() => {
                navigation.navigate('JobDetail', {
                  bookingId: activeBooking?._id || activeJob?._id
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBookingBtnText}>View</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Chat Area */}
      {authLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying session...</Text>
        </View>
      ) : !user ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.errorTitle}>Sign In Required</Text>
          <Text style={styles.errorSubtitle}>
            Please sign in to your WorkLogy customer account to chat with the assigned technician.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : isSessionExpired ? (
        <View style={styles.centerContainer}>
          <View style={[styles.errorIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#D97706" />
          </View>
          <Text style={styles.errorTitle}>Session Expired</Text>
          <Text style={styles.errorSubtitle}>
            Your login session has expired. Please sign in again to continue messaging.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Sign In Again</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Connecting to technician...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="cloud-offline-outline" size={28} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>Conversation Error</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initConversation}
            activeOpacity={0.8}
          >
            <Ionicons name="reload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : messages.length === 0 ? (
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={[styles.emptyContainer, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Chat with {technicianName}</Text>
          <Text style={styles.emptySubtitle}>
            Coordinate arrival time, share gate codes, or clarify job requirements securely inside WorkLogy.
          </Text>

          {/* Quick Starter Prompts */}
          <View style={styles.quickPromptsContainer}>
            <Text style={styles.quickPromptsHeading}>Quick Questions:</Text>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickPromptChip}
                onPress={() => handleSendMessage(prompt)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickPromptText}>"{prompt}"</Text>
                <Ionicons name="arrow-forward-circle" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.messageList}
          data={messages}
          keyExtractor={(item) => item._id || item.clientTempId || String(Math.random())}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListHeaderComponent={
            hasMore ? (
              <View style={styles.loadOlderContainer}>
                {loadingOlder ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <TouchableOpacity
                    onPress={handleLoadOlder}
                    style={styles.loadOlderBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.loadOlderBtnText}>Load older messages</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          onLayout={() => {
            if (!hasAutoScrolledRef.current) {
              performInitialScroll();
            }
          }}
          onContentSizeChange={() => {
            if (!hasAutoScrolledRef.current) {
              performInitialScroll();
            }
          }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                  viewPosition: 0.5
                });
              } catch {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }, 100);
          }}
        />
      )}

      {/* Floating New Message Indicator */}
      {showNewMessageIndicator && (
        <TouchableOpacity
          style={styles.newMessageIndicator}
          onPress={() => {
            setShowNewMessageIndicator(false);
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newMessageIndicatorText}>New message</Text>
        </TouchableOpacity>
      )}

      {/* Message Composer */}
      <View
        style={[
          styles.composerWrapper,
          {
            paddingBottom: isKeyboardOpen
              ? (Platform.OS === 'ios' ? 8 : 8)
              : Math.max(bottomInset, Platform.OS === 'ios' ? 20 : 10)
          }
        ]}
      >
        <View style={styles.composerInputRow}>
          <TextInput
            style={styles.composerInput}
            placeholder={`Message ${technicianName}...`}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!loading}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0'
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#065F46',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  verifiedCheckPill: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  headerTitleContainer: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  technicianName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  presenceDotOnline: {
    backgroundColor: '#10B981'
  },
  presenceDotOffline: {
    backgroundColor: '#94A3B8'
  },
  presenceText: {
    fontSize: 11,
    fontWeight: '600'
  },
  presenceTextOnline: {
    color: '#059669'
  },
  presenceTextOffline: {
    color: '#64748B'
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },

  // Booking Context Banner
  bookingContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  bookingContextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  bookingContextIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  bookingServiceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A'
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6
  },
  bookingStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  bookingRefText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  viewBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 2
  },
  viewBookingBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },

  // Center States
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B'
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 20
  },
  quickPromptsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  quickPromptsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8
  },
  quickPromptText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    marginRight: 8
  },

  // Message List
  messageList: {
    flex: 1
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16
  },
  loadOlderContainer: {
    alignItems: 'center',
    paddingVertical: 8
  },
  loadOlderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  loadOlderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },

  // Date Separator
  dateSeparatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dateSeparatorPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginHorizontal: 10
  },
  dateSeparatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B'
  },

  // Message Bubbles
  bubbleWrapper: {
    marginVertical: 4,
    flexDirection: 'row'
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start'
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end'
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  bubbleMe: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19
  },
  msgTextMe: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  msgTextThem: {
    color: '#0F172A',
    fontWeight: '500'
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500'
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.78)'
  },
  timeTextThem: {
    color: '#94A3B8'
  },
  statusIndicatorWrapper: {
    marginLeft: 2
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  retryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FCA5A5'
  },

  // Composer
  composerWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 10
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    paddingVertical: 6,
    paddingRight: 8
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1'
  },
  newMessageIndicator: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 99
  },
  newMessageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  }
});
