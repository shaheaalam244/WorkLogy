import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Job } from '../types';

export default function AvailableJobsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'emergency' | 'normal'>('all');

  // Proposal modal
  const [bidModal, setBidModal] = useState<{
    open: boolean;
    job: Job | null;
    amount: string;
    coverLetter: string;
    submitting: boolean;
  }>({
    open: false,
    job: null,
    amount: '',
    coverLetter: '',
    submitting: false
  });

  useEffect(() => {
    loadOpenJobs();
  }, [urgencyFilter]);

  const loadOpenJobs = async () => {
    try {
      setLoading(true);
      const res = await api.jobs.getOpenJobs({
        urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined
      });
      if (res?.jobs) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.warn('Failed to load open jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOpenJobs();
  };

  const handleClaimEmergency = async (job: Job) => {
    try {
      await api.jobs.claimEmergencyLead(job._id);
      Alert.alert('Emergency Job Assigned! ⚡', 'You won the emergency tender. Proceed to Confirmed Jobs to navigate to the customer location and enter the Arrival OTP.');
      loadOpenJobs();
      navigation.navigate('ConfirmedTab');
    } catch (err: any) {
      Alert.alert('Claim Failed', err.message || 'Job was already claimed by another nearby contractor.');
      loadOpenJobs();
    }
  };

  const handleSubmitProposal = async () => {
    if (!bidModal.job) return;
    if (!bidModal.amount || Number(bidModal.amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please specify your bid amount in INR ₹.');
      return;
    }

    try {
      setBidModal((prev) => ({ ...prev, submitting: true }));
      await api.jobs.submitProposal(bidModal.job._id, {
        amount: Number(bidModal.amount),
        coverLetter: bidModal.coverLetter || 'Professional quote submitted by certified tradesperson.'
      });
      Alert.alert('Quotation Sent! 📋', 'Your quote has been sent to the homeowner. You will receive a booking alert if selected.');
      setBidModal({ open: false, job: null, amount: '', coverLetter: '', submitting: false });
      loadOpenJobs();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit proposal.');
      setBidModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const isEmergency = item.urgency === 'emergency';
    const isQuoteMode = item.pricing?.type === 'quote';
    const priceDisplay = isEmergency
      ? '₹499 Emergency Diagnostic'
      : item.pricing?.amount
      ? formatCurrency(item.pricing.amount)
      : 'Competitive Quotation';

    // Privacy Masked Locality: only show approximate distance / city
    const maskedLocation = `Near ${item.address?.city || 'Service Territory'} (~2.4 km away)`;

    return (
      <View style={[styles.card, isEmergency && styles.emergencyCardBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isEmergency ? (
              <View style={styles.emergencyTag}>
                <Text style={styles.emergencyTagText}>EMERGENCY CALLOUT ⚡</Text>
              </View>
            ) : (
              <View style={styles.standardTag}>
                <Text style={styles.standardTagText}>STANDARD TENDER</Text>
              </View>
            )}
            <Text style={styles.jobCategory}>
              {(item.category as any)?.name || 'Technical Service'}
            </Text>
          </View>
          <Text style={styles.timeAgo}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.jobDesc} numberOfLines={3}>{item.description}</Text>

        {/* Masked Locality */}
        <View style={styles.locationRow}>
          <Text style={styles.locIcon}>📍</Text>
          <Text style={styles.locText}>{maskedLocation}</Text>
          <Text style={styles.privacyHint}>(Full address disclosed upon assignment)</Text>
        </View>

        {/* Pricing & CTA */}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>Estimated Value</Text>
            <Text style={[styles.priceValue, isEmergency && { color: '#DC2626' }]}>
              {priceDisplay}
            </Text>
          </View>

          {isEmergency ? (
            <TouchableOpacity
              style={styles.emergencyClaimBtn}
              onPress={() => handleClaimEmergency(item)}
            >
              <Text style={styles.emergencyClaimBtnText}>Accept Call Now ⚡</Text>
            </TouchableOpacity>
          ) : isQuoteMode ? (
            <TouchableOpacity
              style={styles.quoteBtn}
              onPress={() =>
                setBidModal({
                  open: true,
                  job: item,
                  amount: String(item.pricing?.amount || 650),
                  coverLetter: '',
                  submitting: false
                })
              }
            >
              <Text style={styles.quoteBtnText}>Send Quote 📝</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => handleClaimEmergency(item)}
            >
              <Text style={styles.claimBtnText}>Accept Job ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header & Filter Chips */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Nearby Available Tenders</Text>
        <Text style={styles.screenSubtitle}>Direct leads matching your registered trade licenses</Text>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All Open Tenders' },
            { id: 'emergency', label: '⚡ Emergency Only' },
            { id: 'normal', label: '📅 Standard Jobs' }
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.filterChip, urgencyFilter === chip.id && styles.filterChipActive]}
              onPress={() => setUrgencyFilter(chip.id as any)}
            >
              <Text
                style={[styles.filterChipText, urgencyFilter === chip.id && styles.filterChipTextActive]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Jobs Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Scanning live dispatch radar...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyTitle}>Radar clear in your territory</Text>
          <Text style={styles.emptySubtitle}>
            No unassigned customer tenders right now. Keep your availability turned online to receive instant push alerts.
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Proposal / Quotation Modal */}
      <Modal visible={bidModal.open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Submit Contractor Proposal</Text>
            <Text style={styles.modalSubtitle}>
              Send your price estimate and professional qualifications to the client.
            </Text>

            <Text style={styles.fieldLabel}>Estimated Price (INR ₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your quote amount in ₹, e.g. 750"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={bidModal.amount}
              onChangeText={(val) => setBidModal((prev) => ({ ...prev, amount: val }))}
            />

            <Text style={styles.fieldLabel}>Cover Note to Customer</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Explain what your quote includes, your trade experience, and estimated arrival time..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={bidModal.coverLetter}
              onChangeText={(val) => setBidModal((prev) => ({ ...prev, coverLetter: val }))}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBidModal({ open: false, job: null, amount: '', coverLetter: '', submitting: false })}
                disabled={bidModal.submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitProposal}
                disabled={bidModal.submitting}
              >
                {bidModal.submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Quote 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark
  },
  screenSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9'
  },
  filterChipActive: {
    backgroundColor: COLORS.primary
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  filterChipTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16,
    gap: 14
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  emergencyCardBorder: {
    borderColor: '#F87171',
    backgroundColor: '#FFFDFD'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  emergencyTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  emergencyTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626'
  },
  standardTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  standardTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB'
  },
  jobCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  timeAgo: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4
  },
  jobDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginVertical: 6
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginVertical: 4,
    gap: 4
  },
  locIcon: {
    fontSize: 12
  },
  locText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700'
  },
  privacyHint: {
    fontSize: 9,
    color: COLORS.textMuted
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2
  },
  emergencyClaimBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  emergencyClaimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  quoteBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  quoteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  claimBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textDark
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
    marginTop: 8
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textDark
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textDark,
    height: 70,
    textAlignVertical: 'top'
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
