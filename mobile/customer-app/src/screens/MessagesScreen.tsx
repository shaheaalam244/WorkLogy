import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { socketService } from '../services/socketService';
import { dataSyncService } from '../services/dataSyncService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatConversationTime, getStatusColor, formatStatusText } from '../utils/formatters';
import type { ConversationItem, ConversationParticipant } from '../types';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (Platform.OS === 'ios' ? 44 : 0);

type FilterType = 'all' | 'unread';

let cachedConversations: ConversationItem[] = [];

export default function MessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );
  const { user, isLoading: authLoading } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>(cachedConversations);
  const [loading, setLoading] = useState<boolean>(cachedConversations.length === 0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const isMountedRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false);

  // 1. Fetch Conversations from Backend
  const loadConversations = useCallback(async (isSilentOrPull: boolean = false) => {
    if (!user) {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (!isSilentOrPull && conversations.length === 0 && cachedConversations.length === 0) {
        setLoading(true);
      }
      setError(null);
      setIsSessionExpired(false);

      const res = await api.chat.getConversations();

      if (!isMountedRef.current) return;

      if (res?.success && Array.isArray(res.conversations)) {
        cachedConversations = res.conversations;
        setConversations(res.conversations);

        // Extract other participants (vendors) to query online status
        const vendorIds = res.conversations
          .map((c) => {
            const other = c.participants?.find((p) => String(p._id) !== String(user?._id));
            return other?._id;
          })
          .filter((id): id is string => Boolean(id));

        checkOnlinePresence(vendorIds);
      } else {
        if (conversations.length === 0) {
          setConversations([]);
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      // Handle 401 Session Expiration vs Network Error
      if (
        err?.isSessionExpired ||
        err?.isTokenMissing ||
        err?.status === 401 ||
        err?.message?.includes('token missing') ||
        err?.message?.includes('Invalid or expired')
      ) {
        setIsSessionExpired(true);
        setError('Your login session has expired. Please sign in again.');
      } else if (conversations.length === 0 && cachedConversations.length === 0) {
        setError(err?.message || 'Could not load messages. Please check your network connection.');
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?._id, conversations.length]);

  // 2. Presence Checker
  const checkOnlinePresence = useCallback((userIds: string[]) => {
    const socket = socketService.getSocket();
    if (!socket || userIds.length === 0) return;

    socket.emit('check_presence', userIds, (response?: { onlineUserIds?: string[] }) => {
      if (response?.onlineUserIds && isMountedRef.current) {
        setOnlineUserIds(new Set(response.onlineUserIds.map(String)));
      }
    });
  }, []);

  // 3. Socket Setup & Real-Time Sync
  useEffect(() => {
    isMountedRef.current = true;

    // A. If auth is still restoring, wait
    if (authLoading) {
      return;
    }

    // B. If user is unauthenticated, do not call backend
    if (!user) {
      setConversations([]);
      setLoading(false);
      setError(null);
      setIsSessionExpired(false);
      return;
    }

    // C. User is authenticated, load conversations & subscribe to socket
    setIsSessionExpired(false);
    loadConversations(cachedConversations.length > 0);

    const unsubSyncMsg = dataSyncService.subscribe('MESSAGES_CHANGED', () => {
      loadConversations(true);
    });

    const unsubSyncRead = dataSyncService.subscribe('MESSAGES_READ', (payload) => {
      if (payload?.conversationId) {
        setConversations((prev) =>
          prev.map((c) => (String(c._id) === String(payload.conversationId) ? { ...c, unreadCount: 0 } : c))
        );
      }
      loadConversations(true);
    });

    let socketInstance: any = null;

    const initSocket = async () => {
      if (user?._id) {
        socketInstance = await socketService.connect(user._id);

        // Real-time message notification (inbox update)
        socketInstance.on('new_message_notification', (data: any) => {
          if (!isMountedRef.current) return;
          setConversations((prev) => {
            const index = prev.findIndex((c) => String(c._id) === String(data.conversationId));
            if (index !== -1) {
              const updated = [...prev];
              const target = { ...updated[index] };
              target.lastMessage = data.message;
              target.lastMessageAt = data.message?.createdAt || new Date().toISOString();
              target.unreadCount = (target.unreadCount || 0) + 1;
              updated.splice(index, 1);
              return [target, ...updated];
            }
            // If brand-new conversation, reload to fetch populated participants
            loadConversations(true);
            return prev;
          });
        });

        // Incoming message directly
        socketInstance.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (newMsg: any) => {
          if (!isMountedRef.current) return;
          const convId = newMsg.conversation || newMsg.conversationId;
          if (convId) {
            setConversations((prev) => {
              const index = prev.findIndex((c) => String(c._id) === String(convId));
              if (index !== -1) {
                const updated = [...prev];
                const target = { ...updated[index] };
                target.lastMessage = newMsg;
                target.lastMessageAt = newMsg.createdAt || new Date().toISOString();
                if (String(newMsg.sender?._id || newMsg.sender) !== String(user?._id)) {
                  target.unreadCount = (target.unreadCount || 0) + 1;
                }
                updated.splice(index, 1);
                return [target, ...updated];
              }
              return prev;
            });
          }
        });

        // Online presence broadcast
        socketInstance.on('user_presence', (data: { userId: string; isOnline: boolean }) => {
          if (!isMountedRef.current) return;
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            if (data.isOnline) {
              next.add(String(data.userId));
            } else {
              next.delete(String(data.userId));
            }
            return next;
          });
        });

        // Messages read notification
        socketInstance.on('messages_read', (data: { conversationId: string; readerId: string }) => {
          if (!isMountedRef.current) return;
          if (String(data.readerId) === String(user._id)) {
            setConversations((prev) =>
              prev.map((c) => (String(c._id) === String(data.conversationId) ? { ...c, unreadCount: 0 } : c))
            );
          }
        });
      }
    };

    initSocket();

    return () => {
      isMountedRef.current = false;
      unsubSyncMsg();
      unsubSyncRead();
      if (socketInstance) {
        socketInstance.off('new_message_notification');
        socketInstance.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
        socketInstance.off('user_presence');
        socketInstance.off('messages_read');
      }
    };
  }, [user?._id, authLoading, loadConversations]);

  // 4. Refresh & Helpers
  const handleRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    loadConversations(true);
  };

  const getOtherParticipant = (conv: ConversationItem): ConversationParticipant => {
    const defaultParticipant: ConversationParticipant = {
      _id: 'unknown',
      name: 'Service Technician',
      role: 'vendor'
    };

    if (!Array.isArray(conv.participants) || conv.participants.length === 0) {
      return defaultParticipant;
    }

    const other = conv.participants.find((p) => String(p._id) !== String(user?._id));
    return other || conv.participants[0] || defaultParticipant;
  };

  // Filter conversations based on search text and active tab
  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherParticipant(conv);
    const vendorName = (other.businessName || other.name || '').toLowerCase();
    const serviceName = (conv.relatedBooking?.serviceTitle || conv.relatedJob?.title || '').toLowerCase();
    const lastMsgText = (conv.lastMessage?.text || '').toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch = !q || vendorName.includes(q) || serviceName.includes(q) || lastMsgText.includes(q);
    if (!matchesSearch) return false;

    if (activeFilter === 'unread') {
      return (conv.unreadCount || 0) > 0;
    }

    return true;
  });

  const totalUnreadCount = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

  // 5. Render Conversation Card
  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const other = getOtherParticipant(item);
    const displayName = other.businessName || other.name || 'Assigned Technician';
    const isVerified = other.isVerified === true;
    const isOnline = onlineUserIds.has(String(other._id));
    const lastMsg = item.lastMessage?.text || 'Conversation initiated';
    const timeStr = formatConversationTime(item.lastMessageAt || item.updatedAt || item.createdAt);
    const unread = item.unreadCount || 0;

    // Booking context
    const booking = item.relatedBooking;
    const job = item.relatedJob;
    const contextTitle = booking?.serviceTitle || job?.title || '';
    const bookingStatus = booking?.status || job?.status || '';

    return (
      <TouchableOpacity
        style={[styles.convCard, unread > 0 && styles.convCardUnread]}
        activeOpacity={0.78}
        onPress={() => {
          navigation.navigate('ChatDetail', {
            conversationId: item._id,
            otherUser: other,
            title: contextTitle || `${displayName} Chat`,
            booking: booking,
            job: job
          });
        }}
      >
        {/* Avatar with Verified checkmark and Online Dot */}
        <View style={styles.avatarContainer}>
          {other.avatar ? (
            <Image source={{ uri: other.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          {/* Verification Badge */}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-sharp" size={9} color="#FFFFFF" />
            </View>
          )}

          {/* Real-Time Online Presence Dot */}
          <View style={[styles.presenceDot, isOnline ? styles.presenceOnline : styles.presenceOffline]} />
        </View>

        {/* Conversation Details */}
        <View style={styles.convDetails}>
          {/* Top Row: Business Name & Time */}
          <View style={styles.topRow}>
            <View style={styles.nameContainer}>
              <Text style={[styles.vendorName, unread > 0 && styles.vendorNameUnread]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <Text style={[styles.timeText, unread > 0 && styles.timeTextUnread]}>{timeStr}</Text>
          </View>

          {/* Middle Row: Service Context / Reference */}
          {contextTitle ? (
            <View style={styles.contextRow}>
              <View style={styles.serviceTag}>
                <Ionicons name="construct-outline" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
                <Text style={styles.serviceTagText} numberOfLines={1}>
                  {contextTitle}
                </Text>
              </View>

              {bookingStatus ? (
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(bookingStatus) + '18' }]}>
                  <Text style={[styles.statusTagText, { color: getStatusColor(bookingStatus) }]}>
                    {formatStatusText(bookingStatus)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Bottom Row: Last Message Snippet & Unread Badge */}
          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessageText, unread > 0 && styles.lastMessageTextUnread]}
              numberOfLines={1}
            >
              {lastMsg}
            </Text>

            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================================
  // VIEW RENDER: Handle Session States Correctly
  // =========================================================================

  // STATE 1: Loading Session
  if (authLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.screenTitle}>Messages</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying session...</Text>
        </View>
      </View>
    );
  }

  // STATE 2: Unauthenticated Customer (Clear Sign-In Prompt)
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.screenTitle}>Messages</Text>
          </View>
        </View>

        <View style={styles.authPromptContainer}>
          <View style={styles.authPromptIconBox}>
            <Ionicons name="chatbubbles" size={38} color={COLORS.primary} />
          </View>
          <Text style={styles.authPromptTitle}>Sign in to view messages</Text>
          <Text style={styles.authPromptSubtitle}>
            Sign in with your WorkLogy customer account to chat directly with assigned service technicians, receive arrival updates, and discuss job details.
          </Text>

          <TouchableOpacity
            style={styles.primaryAuthBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryAuthBtnText}>Sign In to WorkLogy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAuthBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryAuthBtnText}>New to WorkLogy? Create Customer Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STATE 3: Expired Session
  if (isSessionExpired) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.screenTitle}>Messages</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.sessionExpiredIconBox}>
            <Ionicons name="alert-circle-outline" size={38} color="#D97706" />
          </View>
          <Text style={styles.errorTitle}>Session Expired</Text>
          <Text style={styles.errorSubtitle}>
            Your login session has expired. Please sign in again to access your messages and active technicians.
          </Text>
          <TouchableOpacity
            style={styles.primaryAuthBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryAuthBtnText}>Sign In Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STATE 4, 5, 6, 7: Authenticated Customer with Messages / Loading / Network Error / Empty
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topInset + (Platform.OS === 'ios' ? 10 : 8) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>Messages</Text>
            {totalUnreadCount > 0 && (
              <View style={styles.headerUnreadBadge}>
                <Text style={styles.headerUnreadBadgeText}>
                  {totalUnreadCount} {totalUnreadCount === 1 ? 'new' : 'new'}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search technicians, jobs, messages..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips: All Chats / Unread */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              All Chats ({conversations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'unread' && styles.filterChipActive]}
            onPress={() => setActiveFilter('unread')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, activeFilter === 'unread' && styles.filterChipTextActive]}>
              Unread ({totalUnreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body States */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="cloud-offline-outline" size={32} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>Unable to Load Messages</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadConversations(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="reload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
          </View>

          {searchQuery.trim().length > 0 ? (
            <>
              <Text style={styles.emptyTitle}>No matching conversations</Text>
              <Text style={styles.emptySubtitle}>
                No messages found matching "{searchQuery}". Try searching with another keyword or clear the search.
              </Text>
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSearchBtnText}>Clear Search</Text>
              </TouchableOpacity>
            </>
          ) : activeFilter === 'unread' ? (
            <>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                You have no unread messages from your technicians.
              </Text>
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSearchBtnText}>View All Chats</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                When you book a service or contact a technician, your conversation history will appear here.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('ExploreTab')}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.exploreBtnText}>Browse Available Services</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },

  // 1. Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4
  },
  headerUnreadBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  headerUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46'
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Search Input Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  filterChipActive: {
    backgroundColor: '#065F46',
    borderColor: '#065F46'
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },

  // 2. Conversation Card Styles
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10
  },
  convCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  convCardUnread: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FCFDFD'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    alignSelf: 'flex-start'
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0'
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#065F46',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  verifiedBadge: {
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
  presenceDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  presenceOnline: {
    backgroundColor: '#10B981'
  },
  presenceOffline: {
    backgroundColor: '#94A3B8'
  },

  // Details
  convDetails: {
    flex: 1,
    justifyContent: 'center'
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  nameContainer: {
    flex: 1,
    marginRight: 8
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  vendorNameUnread: {
    fontWeight: '800',
    color: '#042F2E'
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8'
  },
  timeTextUnread: {
    color: COLORS.primary,
    fontWeight: '700'
  },

  // Context row
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    flexWrap: 'wrap'
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 160
  },
  serviceTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155'
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '700'
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lastMessageText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8
  },
  lastMessageTextUnread: {
    color: '#0F172A',
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },

  // 3. Center States
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  sessionExpiredIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center'
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 290
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065F46',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },

  // 4. Empty & Unauthenticated Prompt States
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28
  },
  authPromptIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  authPromptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  authPromptSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 24
  },
  primaryAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    width: '100%',
    maxWidth: 280,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  secondaryAuthBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  secondaryAuthBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13
  },

  // Empty Inbox State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 20
  },
  clearSearchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155'
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  }
});
