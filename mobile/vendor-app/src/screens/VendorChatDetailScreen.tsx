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
  Alert,
  Keyboard,
  BackHandler,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api, getStoredAuthToken } from '../api/client';
import { socketService } from '../services/socketService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatTime } from '../utils/formatters';
import type { ChatMessage } from '../types';

interface MessageState extends ChatMessage {
  status?: 'sending' | 'sent' | 'failed';
  clientTempId?: string;
}

export default function VendorChatDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const bottomInset = insets.bottom;

  const { conversationId: initialConvId, bookingId, otherUser, title } = route.params || {};
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(initialConvId || null);
  const [messages, setMessages] = useState<MessageState[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClientOnline, setIsClientOnline] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const isMountedRef = useRef<boolean>(true);
  const isNearBottomRef = useRef<boolean>(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Track whether vendor is scrolled near bottom of messages
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom <= 80;
  }, []);

  // Android hardware back handler
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

  // Keyboard show/hide listeners
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

  const customerName = otherUser?.name || 'Customer';
  const customerAvatar = otherUser?.avatar;
  const recipientId = otherUser?._id || otherUser?.id;

  // Helper to merge and deduplicate messages preserving clientTempId
  const mergeMessages = (prev: MessageState[], incoming: any[]): MessageState[] => {
    const map = new Map<string, MessageState>();
    prev.forEach((m) => {
      const key = m.clientTempId || m._id;
      if (key) map.set(key, m);
    });

    incoming.forEach((m) => {
      const key = m.clientTempId || m._id;
      const isRead = Boolean(m.isRead || m.read);
      if (key && map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, {
          ...existing,
          ...m,
          isRead,
          read: isRead,
          status: 'sent' as const
        });
      } else {
        map.set(m._id || key, {
          ...m,
          isRead,
          read: isRead,
          status: 'sent' as const
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // 1. Fetch Real Messages from Backend
  const loadMessages = useCallback(async (isPolling: boolean = false) => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      if (!isPolling) setLoading(true);
      setError(null);

      const res = await api.chat.getMessages(conversationId, { limit: 50 });
      if (!isMountedRef.current) return;

      if (res?.success && Array.isArray(res.messages)) {
        setMessages((prev) => mergeMessages(prev, res.messages));

        if (!isPolling) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 80);
        }

        // Mark read on backend
        api.chat.markConversationRead(conversationId).catch(() => {});
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (!isPolling) {
        setError(err?.message || 'Could not load messages.');
      }
    } finally {
      if (isMountedRef.current && !isPolling) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadMessages();

    // Setup socket connection and room subscription
    let socket: any = null;
    const initSocket = async () => {
      try {
        if (user?._id) {
          socket = await socketService.connect(user._id);

          // Join conversation socket room
          if (conversationId) {
            socket.emit('join_conversation', conversationId);
            socket.emit('mark_read', { conversationId, userId: user._id });
          }

          // Check recipient presence
          if (recipientId) {
            socket.emit('check_presence', [recipientId], (resp?: { onlineUserIds?: string[] }) => {
              if (resp?.onlineUserIds && isMountedRef.current) {
                setIsClientOnline(resp.onlineUserIds.includes(String(recipientId)));
              }
            });
          }

          // Listen for new incoming messages
          socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (incoming: any) => {
            if (!isMountedRef.current) return;
            const incConvId = incoming.conversationId || incoming.conversation?._id || incoming.conversation;
            if (incConvId && String(incConvId) === String(conversationId)) {
              setMessages((prev) => mergeMessages(prev, [incoming]));

              // Mark read since vendor is currently on screen
              api.chat.markConversationRead(conversationId).catch(() => {});
              socket.emit('mark_read', { conversationId, userId: user._id });

              if (isNearBottomRef.current) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }
          });

          // Listen for read receipts in this conversation
          socket.on(SOCKET_EVENTS.MESSAGES_READ, (data: any) => {
            if (!isMountedRef.current) return;
            const incConvId = data?.conversationId;
            if (incConvId && String(incConvId) === String(conversationId)) {
              // Other participant read our messages
              if (String(data?.readerId) !== String(user?._id)) {
                setMessages((prev) =>
                  prev.map((m) => ({ ...m, isRead: true, read: true }))
                );
              }
            }
          });
        }
      } catch (e) {
        // Fallback silently
      }
    };

    initSocket();

    // Auto-poll messages every 6 seconds as resilient fallback
    const interval = setInterval(() => {
      loadMessages(true);
    }, 6000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (socket) {
        if (conversationId) {
          socket.emit('leave_conversation', conversationId);
        }
        socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
        socket.off(SOCKET_EVENTS.MESSAGES_READ);
      }
    };
  }, [conversationId, loadMessages, user?._id, recipientId]);

  // 2. Send Message
  const handleSendMessage = async (textToSend?: string, retryTempId?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    const tempId = retryTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (!retryTempId) {
      const optimisticMsg: MessageState = {
        _id: tempId,
        clientTempId: tempId,
        conversationId: conversationId || '',
        sender: user?._id || '',
        receiver: recipientId || '',
        text,
        read: false,
        status: 'sending',
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === retryTempId ? { ...m, status: 'sending' } : m))
      );
    }

    try {
      setSending(true);

      const res = await api.chat.sendMessage({
        conversationId: conversationId || undefined,
        recipientId: recipientId || undefined,
        text,
        clientTempId: tempId
      });

      if (res?.success && res.message) {
        if (!conversationId && (res.message as any).conversation) {
          const newConvId = (res.message as any).conversation;
          setConversationId(typeof newConvId === 'object' ? newConvId._id : newConvId);
        }

        setMessages((prev) =>
          prev.map((m) => {
            if (m.clientTempId === tempId || m._id === tempId) {
              return { ...res.message, status: 'sent' };
            }
            return m;
          })
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientTempId === tempId || m._id === tempId) {
            return { ...m, status: 'failed' };
          }
          return m;
        })
      );
      Alert.alert('Send Failed', 'Could not deliver your message. Tap to retry.');
    } finally {
      setSending(false);
    }
  };

  const handleRetry = (item: MessageState) => {
    handleSendMessage(item.text, item.clientTempId || item._id);
  };

  const renderMessageItem = ({ item }: { item: MessageState }) => {
    const senderId = typeof item.sender === 'object' ? (item.sender as any)?._id : item.sender;
    const isMe = String(senderId) === String(user?._id);

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
            {item.text}
          </Text>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMe && (
              <View style={styles.statusIndicator}>
                {item.status === 'sending' ? (
                  <ActivityIndicator size={10} color="rgba(255,255,255,0.7)" />
                ) : item.status === 'failed' ? (
                  <TouchableOpacity onPress={() => handleRetry(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="alert-circle" size={13} color="#EF4444" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons
                    name={item.isRead || item.read ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color={item.isRead || item.read ? '#93C5FD' : 'rgba(255,255,255,0.7)'}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* ── TOP HEADER ── */}
      <View style={[styles.topBar, { paddingTop: topInset, minHeight: 56 + topInset }]}>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        {customerAvatar ? (
          <Image source={{ uri: customerAvatar }} style={styles.topAvatar} />
        ) : (
          <View style={styles.topAvatarFallback}>
            <Text style={styles.topAvatarInitial}>{customerName.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.topInfo}>
          <Text style={styles.clientName} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={styles.jobRef} numberOfLines={1}>
            {title || 'Service Booking'}
          </Text>
        </View>

        <View style={[styles.presencePill, isClientOnline ? styles.presenceOnline : styles.presenceOffline]}>
          <View style={[styles.presenceDot, { backgroundColor: isClientOnline ? '#10B981' : '#9CA3AF' }]} />
          <Text style={[styles.presenceText, { color: isClientOnline ? '#065F46' : '#6B7280' }]}>
            {isClientOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* ── MESSAGE LIST ── */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerLoading}>
          <Ionicons name="alert-circle-outline" size={38} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadMessages(false)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : messages.length === 0 ? (
        <ScrollView
          style={styles.messageListFlex}
          contentContainerStyle={[styles.centerEmpty, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Start Conversation</Text>
          <Text style={styles.emptySub}>
            Send an arrival ETA, booking confirmation or answer customer questions.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.messageListFlex}
          data={messages}
          keyExtractor={(item) => item._id || item.clientTempId || String(Math.random())}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onLayout={() => {
            if (isNearBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── INPUT BAR ── */}
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: isKeyboardOpen
              ? 8
              : Math.max(bottomInset, 10)
          }
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Write a message or ETA update to the customer..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 10
  },
  topAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  topAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  topAvatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#06684F'
  },
  topInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  clientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827'
  },
  jobRef: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  presenceOnline: {
    backgroundColor: '#ECFDF5'
  },
  presenceOffline: {
    backgroundColor: '#F3F4F6'
  },
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  presenceText: {
    fontSize: 10,
    fontWeight: '700'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280'
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center'
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#06684F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },
  messageListFlex: {
    flex: 1
  },
  messageList: {
    padding: 14,
    paddingBottom: 20
  },
  bubbleWrapper: {
    marginVertical: 3,
    flexDirection: 'row'
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start'
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end'
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bubbleMe: {
    backgroundColor: '#06684F',
    borderBottomRightRadius: 4
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18
  },
  msgTextMe: {
    color: '#FFFFFF'
  },
  msgTextThem: {
    color: '#1F2937'
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3
  },
  timeText: {
    fontSize: 9
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.75)'
  },
  timeTextThem: {
    color: '#9CA3AF'
  },
  statusIndicator: {
    marginLeft: 2
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    gap: 8
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: '#111827'
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06684F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 2
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0
  }
});
