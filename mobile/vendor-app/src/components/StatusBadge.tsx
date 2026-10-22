import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor, formatStatusText } from '../utils/formatters';

export function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + '15' }]}>
      <Text style={[styles.text, { color }]}>{formatStatusText(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  text: {
    fontSize: 10,
    fontWeight: '800'
  }
});
