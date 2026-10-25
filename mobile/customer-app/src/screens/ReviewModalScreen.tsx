import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { dataSyncService } from '../services/dataSyncService';

export default function ReviewModalScreen({ route, navigation }: any) {
  const { bookingId, vendorName, vendorId } = route.params || {};
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const isDirty = () => comment.trim().length > 0 || title.trim().length > 0;

    const unregister = navigation?.registerBackHandler?.(() => {
      if (isDirty()) {
        Alert.alert('Discard Review?', 'You have entered feedback. Are you sure you want to discard your review?', [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack(true) }
        ]);
        return true;
      }
      return false;
    });

    return () => {
      unregister?.();
    };
  }, [comment, title, navigation]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please share a brief comment about the technician and service quality.');
      return;
    }

    try {
      setSubmitting(true);
      await api.reviews.submit({
        booking: bookingId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim()
      });

      dataSyncService.notify('BOOKINGS_CHANGED', { bookingId, hasReview: true });

      Alert.alert(
        'Review Published! ⭐',
        `Thank you! Your verified rating and review are now published directly on ${vendorName || 'the professional'}'s profile.`,
        [
          ...(vendorId
            ? [
                {
                  text: 'View on Profile',
                  onPress: () => {
                    navigation.goBack();
                    navigation.navigate('ProfessionalProfile', { vendorId });
                  }
                }
              ]
            : []),
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit review. You can only review once per completed booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>
          How was the service provided by {vendorName || 'your technician'}?
        </Text>

        {/* 1-5 Star Selector */}
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.starIcon, rating >= star ? styles.starFilled : styles.starEmpty]}>
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Review Headline</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Prompt arrival, excellent wiring repair"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.fieldLabel}>Detailed Feedback *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share details on punctuality, diagnosis, clean-up, and professionalism..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Post Verified Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    padding: 16
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  emoji: {
    fontSize: 36,
    marginBottom: 6
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  starRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18
  },
  starIcon: {
    fontSize: 36
  },
  starFilled: {
    color: '#F59E0B'
  },
  starEmpty: {
    color: '#E2E8F0'
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 14
  },
  textArea: {
    width: '100%',
    height: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    marginBottom: 20
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
