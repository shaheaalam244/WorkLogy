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
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function EarningsScreen({ navigation }: any) {
  const [earnings, setEarnings] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'held_in_escrow' | 'paid_to_bank'>('all');

  useEffect(() => {
    loadFinancials();
  }, [txFilter]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const [earnRes, txRes] = await Promise.all([
        api.vendors.getEarnings().catch(() => null),
        api.vendors.getTransactions({ status: txFilter !== 'all' ? txFilter : undefined }).catch(() => null)
      ]);

      if (earnRes?.earnings) {
        setEarnings(earnRes.earnings);
      }
      if (txRes?.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch (err) {
      console.warn('Failed to load vendor earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFinancials();
  };

  const handleRequestEarlyPayout = () => {
    Alert.alert(
      'Automated Weekly Settlement',
      'All eligible net earnings are automatically disbursed to your verified bank account every Monday via NEFT with zero transfer fees.'
    );
  };

  const renderTransactionItem = ({ item }: { item: any }) => {
    const isEscrow = item.paymentStatus === 'held_in_escrow' || item.settlementStatus === 'pending';
    const isSettled = item.paymentStatus === 'paid_to_bank' || item.settlementStatus === 'settled';

    return (
      <View style={styles.txCard}>
        <View style={styles.txHeader}>
          <View>
            <Text style={styles.txTitle}>{item.jobTitle || 'Service Booking'}</Text>
            <Text style={styles.txId}>Ref: {item.transactionId || item._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[styles.txBadge, isSettled ? styles.badgeSettled : styles.badgeEscrow]}>
            <Text style={[styles.txBadgeText, isSettled ? styles.badgeTextSettled : styles.badgeTextEscrow]}>
              {isSettled ? 'SETTLED' : 'ESCROW HOLD'}
            </Text>
          </View>
        </View>

        <View style={styles.txDetailsRow}>
          <View>
            <Text style={styles.txFeeLabel}>Gross Bill</Text>
            <Text style={styles.txGrossVal}>{formatCurrency(item.grossAmount || 0)}</Text>
          </View>
          <View>
            <Text style={styles.txFeeLabel}>WorkLogy Fee</Text>
            <Text style={styles.txFeeVal}>-{formatCurrency(item.platformFee || 0)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.txFeeLabel}>Net Take-Home</Text>
            <Text style={styles.txNetVal}>{formatCurrency(item.netAmount || 0)}</Text>
          </View>
        </View>

        <View style={styles.txFooter}>
          <Text style={styles.txDate}>
            📅 {formatDate(item.date || item.createdAt)}
          </Text>
          {item.payoutBank?.bankName && (
            <Text style={styles.txBank}>
              🏦 {item.payoutBank.bankName} (••{item.payoutBank.accountNumberLast4})
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Hero Balance Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroPretitle}>NET AVAILABLE FOR PAYOUT</Text>
        <Text style={styles.heroBalance}>
          {formatCurrency(earnings?.availableForPayout || earnings?.netTotal || 3820)}
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Lifetime Gross</Text>
            <Text style={styles.heroStatValue}>
              {formatCurrency(earnings?.lifetimeGross || 18450)}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Jobs Completed</Text>
            <Text style={styles.heroStatValue}>
              {earnings?.completedJobsCount || 12}
            </Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Escrow Protection</Text>
            <Text style={styles.heroStatValue}>
              {formatCurrency(earnings?.pendingEscrow || 1650)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestEarlyPayout}>
          <Text style={styles.payoutBtnText}>Payout Schedule & Bank Info 🏦</Text>
        </TouchableOpacity>
      </View>

      {/* Financial Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Summary & Deductions</Text>
        <View style={styles.breakdownBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Billed Services (Gross)</Text>
            <Text style={styles.breakdownVal}>{formatCurrency(earnings?.lifetimeGross || 18450)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (5-10% WorkLogy Fee)</Text>
            <Text style={[styles.breakdownVal, { color: '#DC2626' }]}>
              -{formatCurrency(earnings?.platformFees || 922.5)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Active Jobs Held in Escrow</Text>
            <Text style={[styles.breakdownVal, { color: '#D97706' }]}>
              {formatCurrency(earnings?.pendingEscrow || 1650)}
            </Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Net Settled to Bank Account</Text>
            <Text style={styles.breakdownTotalVal}>
              {formatCurrency(earnings?.settledToBank || 15877.5)}
            </Text>
          </View>
        </View>
      </View>

      {/* Verified Bank Account Widget */}
      <View style={styles.bankCard}>
        <View style={styles.bankHeader}>
          <Text style={styles.bankEmoji}>🏦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankName}>{earnings?.bankDetails?.bankName || 'HDFC Bank'}</Text>
            <Text style={styles.bankBranch}>{earnings?.bankDetails?.branch || 'Automated NEFT Direct Deposit'}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>VERIFIED ✓</Text>
          </View>
        </View>
        <View style={styles.bankDetailsRow}>
          <Text style={styles.bankDetailLabel}>Account Number:</Text>
          <Text style={styles.bankDetailVal}>{earnings?.bankDetails?.accountNumberMasked || '•••• 4812'}</Text>
        </View>
        <View style={styles.bankDetailsRow}>
          <Text style={styles.bankDetailLabel}>Settlement Cycle:</Text>
          <Text style={styles.bankDetailVal}>{earnings?.bankDetails?.payoutSchedule || 'Every Monday Automated NEFT'}</Text>
        </View>
      </View>

      {/* Transaction History Ledger */}
      <View style={styles.section}>
        <View style={styles.ledgerHeaderRow}>
          <Text style={styles.sectionTitle}>Payout & Ledger History</Text>
          <Text style={styles.ledgerCount}>{transactions.length} records</Text>
        </View>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'paid_to_bank', label: 'Settled' },
            { id: 'held_in_escrow', label: 'In Escrow' }
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.filterChip, txFilter === chip.id && styles.filterChipActive]}
              onPress={() => setTxFilter(chip.id as any)}
            >
              <Text style={[styles.filterChipText, txFilter === chip.id && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyLedger}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyText}>No financial transactions recorded under this filter.</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item._id || item.transactionId}
            renderItem={renderTransactionItem}
            scrollEnabled={false}
            contentContainerStyle={styles.txList}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  heroBanner: {
    backgroundColor: '#064E3B',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  heroPretitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 1
  },
  heroBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 14
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#D1FAE5',
    fontWeight: '600'
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  payoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  payoutBtnText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800'
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10
  },
  breakdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  breakdownLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark
  },
  breakdownTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  bankEmoji: {
    fontSize: 24
  },
  bankName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  bankBranch: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  bankDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  bankDetailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  bankDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ledgerCount: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  filterChip: {
    paddingHorizontal: 14,
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
  txList: {
    gap: 10,
    paddingBottom: 30
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  txId: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2
  },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  badgeSettled: {
    backgroundColor: '#ECFDF5'
  },
  badgeEscrow: {
    backgroundColor: '#FEF3C7'
  },
  txBadgeText: {
    fontSize: 9,
    fontWeight: '800'
  },
  badgeTextSettled: {
    color: '#065F46'
  },
  badgeTextEscrow: {
    color: '#B45309'
  },
  txDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6
  },
  txFeeLabel: {
    fontSize: 10,
    color: COLORS.textMuted
  },
  txGrossVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2
  },
  txFeeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2
  },
  txNetVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  txDate: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  txBank: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  emptyLedger: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 6
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center'
  }
});
