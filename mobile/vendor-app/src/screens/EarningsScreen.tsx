import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EarningsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const [earnings, setEarnings] = useState<any | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'This Month' | 'This Week' | 'All Time'>('This Month');

  useEffect(() => {
    loadEarningsData();
  }, [period]);

  const loadEarningsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [earnRes, statsRes, txRes] = await Promise.all([
        api.vendors.getEarnings().catch(() => null),
        api.vendors.getDashboardStats().catch(() => null),
        api.vendors.getTransactions().catch(() => ({ transactions: [] }))
      ]);

      if (earnRes?.earnings) {
        setEarnings(earnRes.earnings);
      }
      if (statsRes?.stats) {
        setDashboardStats(statsRes.stats);
      }
      if (txRes?.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch (err) {
      console.warn('Failed to load earnings data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEarningsData(true);
  };

  // Metrics resolution
  const totalEarnings = earnings?.totalEarnings ?? dashboardStats?.totalEarnings ?? 0;
  const completedEarnings = earnings?.settledToBank ?? earnings?.totalPaidOut ?? 0;
  const pendingEarnings = earnings?.pendingEscrow ?? dashboardStats?.pendingEscrow ?? 0;
  const totalOrdersAmount = earnings?.totalOrdersAmount ?? 0;

  // Chart data
  const defaultWeeklyChart = [
    { day: 'Mon', amount: 0 },
    { day: 'Tue', amount: 0 },
    { day: 'Wed', amount: 0 },
    { day: 'Thu', amount: 0 },
    { day: 'Fri', amount: 0 },
    { day: 'Sat', amount: 0 },
    { day: 'Sun', amount: 0 }
  ];

  const chartData = (dashboardStats?.weeklyChartData && dashboardStats.weeklyChartData.length === 7)
    ? dashboardStats.weeklyChartData
    : defaultWeeklyChart;
  const maxChartVal = Math.max(...chartData.map((d: any) => d.amount || 0), 1000);

  return (
    <View style={styles.screenWrapper}>
      {/* ── TOP HEADER WITH BACK & PERIOD FILTER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction & Payments</Text>
        <TouchableOpacity
          style={styles.periodPill}
          onPress={() => {
            const next = period === 'This Month' ? 'This Week' : period === 'This Week' ? 'All Time' : 'This Month';
            setPeriod(next);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.periodPillText}>{period} ⌵</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading financial ledger...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── FOREST GREEN TOTAL EARNINGS HERO CARD ── */}
          <View style={styles.heroEarningsCard}>
            <View style={styles.heroWalletIconWrap}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.heroEarningsLabel}>Total Earnings</Text>
            <Text style={styles.heroEarningsAmount}>
              {formatCurrency(totalEarnings)}
            </Text>
          </View>

          {/* ── 3 SUB-METRICS CARD ── */}
          <View style={styles.subMetricsCard}>
            {/* Metric 1: Completed */}
            <View style={styles.subMetricCol}>
              <Text style={styles.subMetricValue}>{formatCurrency(completedEarnings)}</Text>
              <Text style={styles.subMetricLabel}>Completed</Text>
            </View>

            <View style={styles.subMetricDivider} />

            {/* Metric 2: Pending */}
            <View style={styles.subMetricCol}>
              <Text style={styles.subMetricValue}>{formatCurrency(pendingEarnings)}</Text>
              <Text style={styles.subMetricLabel}>Pending</Text>
            </View>

            <View style={styles.subMetricDivider} />

            {/* Metric 3: Total Orders */}
            <View style={styles.subMetricCol}>
              <Text style={styles.subMetricValue}>{formatCurrency(totalOrdersAmount)}</Text>
              <Text style={styles.subMetricLabel}>Total Orders</Text>
            </View>
          </View>

          {/* ── WEEKLY EARNINGS BAR CHART ── */}
          <View style={styles.chartContainerCard}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>Earnings Activity (₹)</Text>
              <Text style={styles.chartSubtitle}>Mon – Sun Breakdown</Text>
            </View>

            <View style={styles.chartBodyRow}>
              {/* Y-Axis Labels */}
              <View style={styles.chartYAxis}>
                <Text style={styles.chartYText}>8K</Text>
                <Text style={styles.chartYText}>6K</Text>
                <Text style={styles.chartYText}>4K</Text>
                <Text style={styles.chartYText}>2K</Text>
                <Text style={styles.chartYText}>0</Text>
              </View>

              {/* 7 Daily Bars */}
              <View style={styles.chartBarsWrap}>
                {chartData.map((d: any, idx: number) => {
                  const barHeightPct = Math.min(Math.max((d.amount / maxChartVal) * 100, 10), 100);
                  return (
                    <View key={idx} style={styles.chartBarCol}>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[
                            styles.chartBarFill,
                            { height: `${barHeightPct}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.chartDayLabel}>{d.day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── RECENT TRANSACTIONS LIST ── */}
          <Text style={styles.sectionHeading}>Recent Transactions</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptySub}>
                Completed customer jobs and payouts will appear in your ledger here.
              </Text>
            </View>
          ) : (
            transactions.map((tx, idx) => {
              const isPaid = tx.paymentStatus === 'paid_to_bank' || tx.settlementStatus === 'settled';
              const gross = tx.grossAmount || tx.amount || 0;
              const net = tx.netAmount || gross * 0.9;

              return (
                <View key={tx._id || idx} style={styles.txItemCard}>
                  <View style={styles.txTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txServiceTitle} numberOfLines={1}>
                        {tx.jobTitle || tx.serviceName || 'Home Maintenance Service'}
                      </Text>
                      <Text style={styles.txRefCode}>
                        Ref: {tx.transactionId || tx._id?.slice(-8).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.txStatusPill, isPaid ? styles.txStatusPaid : styles.txStatusPending]}>
                      <Text style={[styles.txStatusText, isPaid ? styles.txStatusTextPaid : styles.txStatusTextPending]}>
                        {isPaid ? 'Settled' : 'In Escrow'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txBottomRow}>
                    <Text style={styles.txDateText}>
                      📅 {tx.date ? formatDate(tx.date) : 'Today'}
                    </Text>
                    <Text style={styles.txNetText}>
                      {formatCurrency(net)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
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
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A'
  },
  periodPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06684F'
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16
  },

  // ── Hero Total Earnings Card ──
  heroEarningsCard: {
    backgroundColor: '#065F46', // Deep forest green
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  heroWalletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  heroEarningsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1FAE5',
    marginBottom: 4
  },
  heroEarningsAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },

  // ── 3 Sub-Metrics Card ──
  subMetricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  subMetricCol: {
    flex: 1,
    alignItems: 'center'
  },
  subMetricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2
  },
  subMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B'
  },
  subMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0'
  },

  // ── Weekly Chart ──
  chartContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A'
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B'
  },
  chartBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140
  },
  chartYAxis: {
    height: 110,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingBottom: 22
  },
  chartYText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8'
  },
  chartBarsWrap: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 4
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end'
  },
  chartBarTrack: {
    width: 18,
    height: 110,
    justifyContent: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden'
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6
  },
  chartDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6
  },

  // ── Transactions ──
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  txItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  txServiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  txRefCode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  txStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  txStatusPaid: {
    backgroundColor: '#ECFDF5'
  },
  txStatusPending: {
    backgroundColor: '#FFF7ED'
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  txStatusTextPaid: {
    color: '#059669'
  },
  txStatusTextPending: {
    color: '#D97706'
  },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  txDateText: {
    fontSize: 11,
    color: '#64748B'
  },
  txNetText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669'
  }
});
