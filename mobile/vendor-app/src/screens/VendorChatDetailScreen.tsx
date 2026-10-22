import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { socketService } from '../services/socketService';
import { COLORS, SOCKET_EVENTS } from '../constants';
import { formatTime } from '../utils/formatters';
import type { ChatMessage } from '../types';

export default function VendorChatDetailScreen({ route, navigation }: any) {
  const { bookingId, otherUser, title } = route.params || {};
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const customerName = otherUser?.name || 'Customer';

  useEffect(() => {
    setMessages([
      {
        _id: 'msg-v-1',
        conversationId: bookingId || 'booking-conv',
        sender: otherUser?._id || 'customer-1',
        receiver: user?._id || 'vendor-1',
        text: `Hello, regarding booking for "${title || 'service'}". When can you arrive?`,
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]);

    setupSocket();
  }, [bookingId]);

  const setupSocket = async () => {
    const socket = await socketService.connect(user?._id);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (newMsg: ChatMessage) => {
      setMessages((prev) => [...prev, newMsg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      _id: `msg-${Date.now()}`,
      conversationId: bookingId || 'booking-conv',
      sender: user?._id || 'vendor-1',
      receiver: otherUser?._id || 'customer-1',
      text: inputText.trim(),
      read: false,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    flatListRef.current?.scrollToEnd({ animated: true });

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, newMsg);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender === user?._id || (typeof item.sender === 'object' && item.sender._id === user?._id);

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.clientName}>{customerName}</Text>
          <Text style={styles.jobRef} numberOfLines={1}>{title || 'Direct Client Communication'}</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Client Online</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type an update or ETA message..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>Send 🚀</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backBtn: {
    paddingVertical: 4
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary
  },
  clientName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  jobRef: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981'
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46'
  },
  messageList: {
    padding: 16,
    paddingBottom: 20
  },
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
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18
  },
  msgTextMe: {
    color: '#FFFFFF'
  },
  msgTextThem: {
    color: COLORS.textDark
  },
  timeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)'
  },
  timeTextThem: {
    color: COLORS.textMuted
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: 8
  },
  textInput: {
    flex: 1,
    maxHeight: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textDark
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1'
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12
  }
});
