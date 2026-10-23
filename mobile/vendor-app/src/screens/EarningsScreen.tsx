import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';
import Header from '../components/Header';

export default function EarningsScreen({ navigation }: any) {
  const [earnings, setEarnings] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'held_in_escrow' | 'paid_to_bank'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadEarningsData();
  }, [filter]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      const [earnRes, txRes, notifRes] = await Promise.all([
        api.vendors.getEarnings().catch(() => null),
        api.vendors.getTransactions({ status: filter !== 'all' ? filter : undefined }).catch(() => ({ transactions: [] })),
        api.notifications.getUnreadCount().catch(() => ({ count: 0 }))
      ]);

      if (earnRes?.earnings) {
        setEarnings(earnRes.earnings);
      }
      if (txRes?.transactions) {
        setTransactions(txRes.transactions);
      }
      if (notifRes?.count) {
        setUnreadCount(notifRes.count);
      }
    } catch (err) {
      console.warn('Failed to load earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const handlePayoutInfo = () => {
    Alert.alert(
      'Automated Weekly Bank Settlements',
      'Eligible escrow payments are automatically settled into your registered bank account every Monday via NEFT/IMPS with zero platform surcharge.'
    );
  };

  // Derive summary metrics from backend earnings
  const totalEarnings = earnings?.totalEarnings ?? earnings?.netTotal ?? 0;
  const thisMonthEarnings = earnings?.thisMonthEarnings ?? earnings?.monthlyNet ?? 0;
  const pendingPayouts = earnings?.pendingEscrow ?? earnings?.heldInEscrow ?? 0;
  const completedPayouts = earnings?.totalPaidOut ?? earnings?.settledToBank ?? Math.max(0, totalEarnings - pendingPayouts);
  const hasBankDetails = Boolean(earnings?.bankDetails);

  const renderTransactionCard = ({ item }: { item: any }) => {
    const isSettled = item.paymentStatus === 'paid_to_bank' || item.settlementStatus === 'settled';
    const gross = item.grossAmount || item.amount || 0;
    const commission = item.platformFee || Math.round(gross * 0.1);
    const net = item.netAmount || (gross - commission);

    return (
      <View style={styles.txCard}>
        <View style={styles.txHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{item.jobTitle || item.serviceName || 'Home Service Booking'}</Text>
            <Text style={styles.refCode}>Ref: {item.transactionId || item.bookingRef || item._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, isSettled ? styles.settledBadge : styles.pendingBadge]}>
            <Text style={[styles.statusBadgeText, isSettled ? styles.settledText : styles.pendingText]}>
              {isSettled ? 'SETTLED TO BANK' : 'HELD IN ESCROW'}
            </Text>
          </View>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCol}>
            <Text style={styles.colLabel}>Gross Amount</Text>
            <Text style={styles.colValue}>{formatCurrency(gross)}</Text>
          </View>
          <View style={styles.breakdownCol}>
            <Text style={styles.colLabel}>WorkLogy Fee (10%)</Text>
            <Text style={[styles.colValue, { color: '#DC2626' }]}>-{formatCurrency(commission)}</Text>
          </View>
          <View style={[styles.breakdownCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.colLabel}>Net Earnings</Text>
            <Text style={[styles.colValue, styles.netValue]}>{formatCurrency(net)}</Text>
          </View>
        </View>

        <View style={styles.txFooter}>
          <Text style={styles.txDate}>
            📅 {formatDate(item.date || item.createdAt)}
          </Text>
          <Text style={styles.txMode}>
            {isSettled ? '✓ Bank NEFT Cleared' : '⏳ Awaiting Job Sign-off'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        unreadCount={unreadCount}
        userName="Earnings"
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressProfile={() => navigation.navigate('ProfileTab')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. SUMMARY CARDS (2x2 GRID) ── */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="cash" size={18} color="#059669" />
            </View>
            <Text style={styles.metricValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.metricLabel}>Total Earnings</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={18} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>{formatCurrency(thisMonthEarnings)}</Text>
            <Text style={styles.metricLabel}>This Month</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={18} color="#D97706" />
            </View>
            <Text style={[styles.metricValue, { color: '#D97706' }]}>
              {formatCurrency(pendingPayouts)}
            </Text>
            <Text style={styles.metricLabel}>Pending Escrow</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="card" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.metricValue}>{formatCurrency(completedPayouts)}</Text>
            <Text style={styles.metricLabel}>Completed Payouts</Text>
          </View>
        </View>

        {/* ── 2. BANK SETTLEMENT BANNER ── */}
        <TouchableOpacity
          style={styles.settlementBanner}
          onPress={hasBankDetails ? handlePayoutInfo : () => navigation.navigate('ProfileTab')}
          activeOpacity={0.88}
        >
          <View style={styles.bankIconCircle}>
            <Ionicons name="business" size={20} color="#152B3C" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bankTitle}>
              {hasBankDetails
                ? (earnings?.bankDetails?.bankName ? `${earnings.bankDetails.bankName} Connected` : 'Verified Bank Account Connected')
                : 'No Bank Account Connected'}
            </Text>
            <Text style={styles.bankSub}>
              {hasBankDetails
                ? 'Next automatic payout: Monday • Zero NEFT fee'
                : 'Configure payout bank account in Profile for weekly settlements'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* ── 3. TRANSACTION LEDGER FILTERS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaction Ledger</Text>
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.pill, filter === 'all' && styles.activePill]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.pillText, filter === 'all' && styles.activePillText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, filter === 'held_in_escrow' && styles.activePill]}
              onPress={() => setFilter('held_in_escrow')}
            >
              <Text style={[styles.pillText, filter === 'held_in_escrow' && styles.activePillText]}>
                Escrow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, filter === 'paid_to_bank' && styles.activePill]}
              onPress={() => setFilter('paid_to_bank')}
            >
              <Text style={[styles.pillText, filter === 'paid_to_bank' && styles.activePillText]}>
                Settled
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. TRANSACTION LIST ── */}
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading ledger...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
            <Text style={styles.emptySub}>
              Completed jobs and customer escrow deposits will appear here with detailed fee breakdowns.
            </Text>
          </View>
        ) : (
          <View style={styles.txListContainer}>
            {transactions.map((item, index) => (
              <View key={item._id || index}>
                {renderTransactionCard({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2
  },
  settlementBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  bankIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bankTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark
  },
  bankSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#E5E7EB'
  },
  activePill: {
    backgroundColor: '#152B3C'
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  activePillText: {
    color: '#FFFFFF'
  },
  txListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  refCode: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  settledBadge: {
    backgroundColor: '#ECFDF5'
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  settledText: {
    color: '#047857'
  },
  pendingText: {
    color: '#B45309'
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  breakdownCol: {
    flex: 1
  },
  colLabel: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  colValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2
  },
  netValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46'
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  txMode: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  centerLoading: {
    padding: 32,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 8
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  }
});
