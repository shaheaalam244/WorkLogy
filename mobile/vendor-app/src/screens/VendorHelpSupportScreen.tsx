import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Linking,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../context/NavigationContext';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  responses?: Array<{
    sender: { name: string; role: string };
    message: string;
    createdAt: string;
  }>;
}

const FAQ_ITEMS = [
  {
    q: 'When do I receive customer payment settlements?',
    a: 'WorkLogy releases booking payments directly to your registered bank account within 24 hours of successful job completion and customer OTP signoff.'
  },
  {
    q: 'How do matching job leads get dispatched?',
    a: 'Leads are matched based on your active service categories, service area radius (e.g., 15 km), and your real-time "Online for Jobs" availability switch.'
  },
  {
    q: 'What documents are accepted for KYC verification?',
    a: 'We accept Aadhaar Card, PAN Card, and municipal Trade Licenses. Documents are reviewed by compliance within 2–4 hours during business days.'
  },
  {
    q: 'How can I pause or change the price of my services?',
    a: 'Navigate to "My Services" from your Profile menu, select "Edit" to modify your rates or click "Pause" to temporarily disable customer bookings for that listing.'
  },
  {
    q: 'What happens if a customer cancels an accepted booking?',
    a: 'If a customer cancels after dispatch or while you are en route, platform cancellation compensation policies apply according to booking terms.'
  }
];

export default function VendorHelpSupportScreen({ navigation: navProp }: any) {
  const contextNav = useNavigation();
  const navigation = navProp || contextNav;
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // New ticket modal
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Payment & Payout');
  const [priority, setPriority] = useState('medium');

  const CATEGORIES = [
    'Payment & Payout',
    'Verification & KYC',
    'Job & Customer Dispute',
    'App Technical Issue',
    'General Inquiry'
  ];

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.support.getMyTickets();
      if (res?.success && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
      }
    } catch {
      // Silently fail on background reload
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const handleDialHelpline = () => {
    Linking.openURL('tel:+918000123456').catch(() => {
      Alert.alert('Helpline', 'Call us at +91 8000 123 456 (8 AM - 10 PM IST)');
    });
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@worklogy.in?subject=Vendor%20Partner%20Inquiry').catch(() => {
      Alert.alert('Email Support', 'Contact us at support@worklogy.in');
    });
  };

  const handleOpenWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=+918000123456&text=Hello%20WorkLogy%20Support').catch(() => {
      Alert.alert('WhatsApp Support', 'WhatsApp us at +91 8000 123 456');
    });
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing Subject', 'Please enter a summary subject for your ticket.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide detailed context about your issue.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.support.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority
      });

      if (res?.success) {
        Alert.alert(
          'Ticket Created',
          res.message || 'Support ticket opened successfully. Our compliance team will respond within 4 hours.'
        );
        setModalVisible(false);
        setSubject('');
        setDescription('');
        fetchTickets();
      } else {
        Alert.alert('Creation Failed', res?.message || 'Could not create ticket. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Ticket Error', err.message || 'Failed to submit ticket. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          onPress={() => (navigation.goBack ? navigation.goBack() : navigation.navigate('ProfileTab'))}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity
          style={styles.newTicketHeaderBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color="#06684F" />
          <Text style={styles.newTicketHeaderText}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06684F']} />}
      >
        {/* ── CONTACT CHANNELS CARD ── */}
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.sectionSubtitle}>
            Our dedicated partner desk is available Monday to Sunday, 8:00 AM – 10:00 PM IST.
          </Text>

          <View style={styles.channelsGrid}>
            <TouchableOpacity style={styles.channelItem} onPress={handleDialHelpline} activeOpacity={0.78}>
              <View style={[styles.channelIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="call" size={20} color="#059669" />
              </View>
              <Text style={styles.channelTitle}>Partner Helpline</Text>
              <Text style={styles.channelValue}>+91 8000 123 456</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.channelItem} onPress={handleOpenWhatsApp} activeOpacity={0.78}>
              <View style={[styles.channelIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
              </View>
              <Text style={styles.channelTitle}>WhatsApp Chat</Text>
              <Text style={styles.channelValue}>Instant Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.channelItem} onPress={handleOpenEmail} activeOpacity={0.78}>
              <View style={[styles.channelIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="mail" size={20} color="#2563EB" />
              </View>
              <Text style={styles.channelTitle}>Email Desk</Text>
              <Text style={styles.channelValue}>support@worklogy.in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FAQS ACCORDION ── */}
        <View style={styles.faqCard}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>Quick solutions to common vendor partner inquiries</Text>

          {FAQ_ITEMS.map((item, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <View key={idx} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, isExpanded && { color: '#06684F' }]}>{item.q}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isExpanded ? '#06684F' : '#94A3B8'}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── MY SUPPORT TICKETS ── */}
        <View style={styles.ticketsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>My Support Tickets</Text>
              <Text style={styles.sectionSubtitle}>
                {tickets.length > 0
                  ? `${tickets.length} total dispute and inquiry ticket${tickets.length > 1 ? 's' : ''}`
                  : 'Track your inquiries and disputes'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addTicketAction}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.78}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addTicketActionText}>Raise Ticket</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#06684F" />
              <Text style={styles.loadingText}>Loading support history...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyTicketsCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done-circle-outline" size={36} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>No Active Support Tickets</Text>
              <Text style={styles.emptySubtitle}>
                Your account is in good standing with zero unresolved disputes or technical requests.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Raise a Ticket</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tickets.map((t) => (
              <View key={t._id} style={styles.ticketCard}>
                <View style={styles.ticketTopRow}>
                  <View style={styles.ticketTagBox}>
                    <Text style={styles.ticketNumber}>{t.ticketNumber || `TKT-${t._id.slice(-5).toUpperCase()}`}</Text>
                    <Text style={styles.ticketCategoryDot}>•</Text>
                    <Text style={styles.ticketCategory}>{t.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      t.status === 'open'
                        ? styles.statusOpen
                        : t.status === 'resolved'
                        ? styles.statusResolved
                        : styles.statusInProgress
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        t.status === 'open'
                          ? styles.statusTextOpen
                          : t.status === 'resolved'
                          ? styles.statusTextResolved
                          : styles.statusTextInProgress
                      ]}
                    >
                      {t.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketSubject}>{t.subject}</Text>
                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {t.description}
                </Text>

                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketDate}>
                    {new Date(t.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                  {t.responses && t.responses.length > 0 && (
                    <View style={styles.repliesCountRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color="#059669" />
                      <Text style={styles.repliesCountText}>
                        {t.responses.length} response{t.responses.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── RAISE TICKET MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise Support Ticket</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryChipsRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter ticket subject, e.g. Payout inquiry for Booking #BK-9421"
                placeholderTextColor="#94A3B8"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Detailed Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your issue in detail, including booking ID, customer name, and error message..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Urgency Level</Text>
              <View style={styles.priorityRow}>
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        priority === p && styles.priorityChipTextActive
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitTicketBtn, submitting && { opacity: 0.65 }]}
                onPress={handleCreateTicket}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitTicketBtnText}>Submit Support Ticket</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A'
  },
  newTicketHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4
  },
  newTicketHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06684F'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
    marginBottom: 14
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: 8
  },
  channelItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  channelIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  channelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center'
  },
  channelValue: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center'
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B'
  },
  faqBody: {
    marginTop: 8,
    paddingTop: 4
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  ticketsSection: {
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  addTicketAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06684F',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4
  },
  addTicketActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B'
  },
  emptyTicketsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A'
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280
  },
  emptyBtn: {
    marginTop: 14,
    backgroundColor: '#06684F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  ticketTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#06684F'
  },
  ticketCategoryDot: {
    color: '#CBD5E1',
    fontSize: 12
  },
  ticketCategory: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusOpen: {
    backgroundColor: '#EFF6FF'
  },
  statusResolved: {
    backgroundColor: '#ECFDF5'
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7'
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800'
  },
  statusTextOpen: {
    color: '#2563EB'
  },
  statusTextResolved: {
    color: '#059669'
  },
  statusTextInProgress: {
    color: '#D97706'
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  ticketDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8
  },
  ticketDate: {
    fontSize: 11,
    color: '#94A3B8'
  },
  repliesCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  repliesCountText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  categoryChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#06684F'
  },
  categoryChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  categoryChipTextActive: {
    color: '#06684F',
    fontWeight: '800'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A'
  },
  textArea: {
    height: 88
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  priorityChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#06684F'
  },
  priorityChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700'
  },
  priorityChipTextActive: {
    color: '#06684F',
    fontWeight: '800'
  },
  submitTicketBtn: {
    marginTop: 20,
    backgroundColor: '#06684F',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  }
});
