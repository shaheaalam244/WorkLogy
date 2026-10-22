import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

export default function MessagesScreen({ navigation }: any) {
  const conversations = [
    {
      _id: 'conv-1',
      title: 'Apex Electrical Solutions',
      lastMessage: 'I am 10 minutes away, please keep the breaker panel clear.',
      time: '10:45 AM',
      unread: true
    },
    {
      _id: 'conv-2',
      title: 'Sharma Plumbing Care',
      lastMessage: 'Spare pipe replacement completed. Let me know if everything is running smoothly.',
      time: 'Yesterday',
      unread: false
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Messages & Technician Chat</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convCard}
            onPress={() =>
              navigation.navigate('ChatDetail', {
                conversationId: item._id,
                title: item.title
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.title.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.convTop}>
                <Text style={styles.convTitle}>{item.title}</Text>
                <Text style={styles.convTime}>{item.time}</Text>
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark
  },
  list: {
    padding: 16,
    gap: 10
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  convTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  convTime: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  lastMsg: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8
  }
});
