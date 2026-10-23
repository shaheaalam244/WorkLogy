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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api, getStoredAuthToken } from '../api/client';
import { socketService } from '../services/socketService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatTime } from '../utils/formatters';

interface ConversationParticipant {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  phone?: string;
}

interface ConversationItem {
  _id: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    _id: string;
    text: string;
    sender: any;
    createdAt: string;
  };
  lastMessageAt?: string;
  relatedJob?: {
    _id: string;
    title: string;
    category?: string;
    status?: string;
  };
  relatedBooking?: {
    _id: string;
    status?: string;
    scheduledDate?: string;
  };
  unreadCount?: number;
  updatedAt?: string;
}

export default function VendorMessagesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const isMountedRef = useRef<boolean>(true);

  const loadConversations = useCallback(async (isPullRefresh: boolean = false) => {
    try {
      if (!isPullRefresh) setLoading(true);
      setError(null);

      const token = await getStoredAuthToken();
      if (!token) {
        setConversations([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await api.chat.getConversations();

      if (!isMountedRef.current) return;

      if (res?.success && Array.isArray(res.conversations)) {
        setConversations(res.conversations);

        // Check presence for other participants
        const otherIds = res.conversations
          .map((c: ConversationItem) => {
            const other = c.participants?.find((p) => String(p._id) !== String(user?._id));
            return other?._id;
          })
          .filter((id): id is string => Boolean(id));

        if (otherIds.length > 0) {
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('check_presence', otherIds, (resp?: { onlineUserIds?: string[] }) => {
              if (resp?.onlineUserIds && isMountedRef.current) {
                setOnlineUserIds(new Set(resp.onlineUserIds.map(String)));
              }
            });
          }
        }
      } else {
        setConversations([]);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Could not load conversations. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?._id]);

  useEffect(() => {
    isMountedRef.current = true;
    loadConversations();

    // Socket subscription for real-time messages
    let socket: any = null;
    const connectRealtime = async () => {
      try {
        if (user?._id) {
          socket = await socketService.connect(user._id);
          socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, () => {
            loadConversations(true);
          });
        }
      } catch (e) {
        // Fallback silently to polling
      }
    };

    connectRealtime();

    // Periodic sync every 20 seconds
    const interval = setInterval(() => {
      loadConversations(true);
    }, 20000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (socket) {
        socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE);
      }
    };
  }, [user?._id, loadConversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations(true);
  };

  const getOtherParticipant = (conv: ConversationItem): ConversationParticipant | null => {
    if (!conv.participants || conv.participants.length === 0) return null;
    const other = conv.participants.find((p) => String(p._id) !== String(user?._id));
    return other || conv.participants[0];
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'unread' && (!c.unreadCount || c.unreadCount === 0)) {
      return false;
    }
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const other = getOtherParticipant(c);
    const nameMatch = other?.name?.toLowerCase().includes(query);
    const jobMatch = c.relatedJob?.title?.toLowerCase().includes(query);
    const msgMatch = c.lastMessage?.text?.toLowerCase().includes(query);

    return nameMatch || jobMatch || msgMatch;
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const renderConversationCard = ({ item }: { item: ConversationItem }) => {
    const other = getOtherParticipant(item);
    const isOnline = other?._id ? onlineUserIds.has(String(other._id)) : false;
    const unread = item.unreadCount || 0;
    const relatedTitle = item.relatedJob?.title || (item.relatedBooking ? 'Service Booking' : null);
    const timeStr = item.lastMessage?.createdAt || item.lastMessageAt || item.updatedAt;

    const initial = other?.name ? other.name.charAt(0).toUpperCase() : 'C';

    return (
      <TouchableOpacity
        style={[styles.convCard, unread > 0 && styles.convCardUnread]}
        activeOpacity={0.78}
        onPress={() => {
          navigation.navigate('ChatDetail', {
            conversationId: item._id,
            otherUser: other,
            title: relatedTitle || other?.name || 'Customer Chat',
            bookingId: item.relatedBooking?._id || item.relatedJob?._id
          });
        }}
      >
        {/* Avatar Box */}
        <View style={styles.avatarBox}>
          {other?.avatar ? (
            <Image source={{ uri: other.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Content Box */}
        <View style={styles.convContent}>
          <View style={styles.nameRow}>
            <Text style={[styles.customerName, unread > 0 && styles.customerNameBold]} numberOfLines={1}>
              {other?.name || 'Customer'}
            </Text>
            {timeStr && (
              <Text style={[styles.timeText, unread > 0 && styles.timeTextUnread]}>
                {formatTime(timeStr)}
              </Text>
            )}
          </View>

          {/* Related Job / Service Pill */}
          {relatedTitle && (
            <View style={styles.tagPill}>
              <Ionicons name="briefcase-outline" size={11} color="#06684F" />
              <Text style={styles.tagPillText} numberOfLines={1}>
                {relatedTitle}
              </Text>
            </View>
          )}

          {/* Last Message Preview */}
          <View style={styles.previewRow}>
            <Text
              style={[styles.messagePreview, unread > 0 && styles.messagePreviewUnread]}
              numberOfLines={1}
            >
              {item.lastMessage?.text || 'Tap to open conversation'}
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

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Customer Messages</Text>
            <Text style={styles.headerSub}>
              Direct communication for bookings, quotes & support
            </Text>
          </View>
          {totalUnreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{totalUnreadCount} Unread</Text>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, job or message..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
              All Messages ({conversations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'unread' && styles.filterPillActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterPillText, filter === 'unread' && styles.filterPillTextActive]}>
              Unread Only {totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN CONTENT ── */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorTitle}>Communication Error</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadConversations(false)}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={40} color="#06684F" />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'No Unread Messages' : 'No Customer Messages Yet'}
          </Text>
          <Text style={styles.emptySub}>
            {filter === 'unread'
              ? 'You are all caught up on customer inquiries!'
              : 'Direct messages from customers regarding your listed services and job requests will appear here.'}
          </Text>
          {filter === 'unread' ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setFilter('all')}>
              <Text style={styles.secondaryBtnText}>View All Conversations</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('JobsTab')}
            >
              <View style={{ marginRight: 6 }}>
                <Ionicons name="briefcase" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.actionBtnText}>Browse Available Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#06684F']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827'
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  headerUnreadBadge: {
    backgroundColor: '#06684F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  headerUnreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F3F4F6'
  },
  filterPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#06684F'
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  filterPillTextActive: {
    color: '#06684F',
    fontWeight: '700'
  },
  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingBottom: 90
  },
  convCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  convCardUnread: {
    borderColor: '#06684F',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08
  },
  avatarBox: {
    position: 'relative',
    marginRight: 12,
    justifyContent: 'center'
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#06684F'
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  convContent: {
    flex: 1,
    justifyContent: 'center'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 6
  },
  customerNameBold: {
    fontWeight: '800',
    color: '#111827'
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  timeTextUnread: {
    color: '#06684F',
    fontWeight: '700'
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginVertical: 3,
    gap: 4
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#06684F',
    maxWidth: 220
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  messagePreview: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    marginRight: 8
  },
  messagePreviewUnread: {
    color: '#111827',
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: '#06684F',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06684F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6'
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151'
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4
  },
  errorSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#06684F'
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
