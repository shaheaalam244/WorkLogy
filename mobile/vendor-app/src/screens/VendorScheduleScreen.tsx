import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP_FULL_TO_SHORT: { [key: string]: string } = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};
const DAY_MAP_SHORT_TO_FULL: { [key: string]: string } = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday'
};

const TIME_OPTIONS = [
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM'
];

export default function VendorScheduleScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Schedule States
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('07:00 PM');
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [maxDailyJobs, setMaxDailyJobs] = useState(5);

  // Modals for selection
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const [maxJobsModalOpen, setMaxJobsModalOpen] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const [availRes, profRes] = await Promise.all([
        api.vendors.getAvailability().catch(() => null),
        api.vendors.getProfile().catch(() => null)
      ]);

      if (availRes?.availability) {
        const a = availRes.availability;
        if (a.days && Array.isArray(a.days) && a.days.length > 0) {
          const short = a.days.map((d: string) => DAY_MAP_FULL_TO_SHORT[d] || d);
          setSelectedDays(short);
        }
        if (a.hours?.start) {
          setStartTime(format24to12(a.hours.start));
        }
        if (a.hours?.end) {
          setEndTime(format24to12(a.hours.end));
        }
      }

      if (profRes?.vendor) {
        const v = profRes.vendor;
        if (v.emergencyAvailability) {
          setEmergencyAvailable(v.emergencyAvailability.isAvailable !== false);
          if (v.emergencyAvailability.maxDailyJobs) {
            setMaxDailyJobs(v.emergencyAvailability.maxDailyJobs);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const format24to12 = (time24: string) => {
    if (!time24) return '09:00 AM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const format12to24 = (time12: string) => {
    const [time, ampm] = time12.split(' ');
    let [h, m] = time.split(':').map((num) => parseInt(num, 10));
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        Alert.alert('Notice', 'At least one working day must be active.');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      const fullDays = selectedDays.map((d) => DAY_MAP_SHORT_TO_FULL[d] || d);
      const res = await api.vendors.updateAvailability({
        days: fullDays,
        hours: {
          start: format12to24(startTime),
          end: format12to24(endTime)
        },
        emergencyAvailable,
        maxDailyJobs
      });

      if (res?.success) {
        Alert.alert(
          'Schedule Saved 🎉',
          'Your operational working days and hours have been successfully synchronized with the dispatch engine.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not update schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* ── TOP HEADER ── */}
      <View style={[styles.headerBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability & Schedule</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#06684F" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading schedule settings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── WORKING DAYS SECTION ── */}
          <Text style={styles.sectionHeading}>Working Days</Text>

          <View style={styles.cardContainer}>
            <View style={styles.daysRow}>
              {ALL_DAYS.map((day) => {
                const isActive = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── WORKING HOURS SECTION ── */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Working Hours</Text>

          <View style={styles.cardContainer}>
            <View style={styles.hoursRow}>
              {/* Start Time */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputSubLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.timeSelectorBox}
                  onPress={() => setTimePickerTarget('start')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={styles.timeSelectorText}>{startTime}</Text>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* End Time */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputSubLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeSelectorBox}
                  onPress={() => setTimePickerTarget('end')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={styles.timeSelectorText}>{endTime}</Text>
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── EMERGENCY CALLS TOGGLE ── */}
          <View style={[styles.cardContainer, { marginTop: 16 }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleIconWrap}>
                <Ionicons name="flash" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.toggleTitle}>Available for Emergency Calls</Text>
                <Text style={styles.toggleSub}>I can attend urgent service requests</Text>
              </View>
              <Switch
                value={emergencyAvailable}
                onValueChange={setEmergencyAvailable}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={emergencyAvailable ? '#06684F' : '#94A3B8'}
              />
            </View>
          </View>

          {/* ── MAXIMUM BOOKINGS PER DAY ── */}
          <View style={[styles.cardContainer, { marginTop: 16 }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleIconWrap}>
                <Ionicons name="calendar" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.toggleTitle}>Maximum Bookings Per Day</Text>
                <Text style={styles.toggleSub}>Prevents overbooking your schedule</Text>
              </View>
              <TouchableOpacity
                style={styles.maxJobsPill}
                onPress={() => setMaxJobsModalOpen(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.maxJobsPillText}>{maxDailyJobs} ⌵</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SAVE SCHEDULE BUTTON ── */}
          <TouchableOpacity
            style={styles.saveScheduleBtn}
            onPress={handleSaveSchedule}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveScheduleBtnText}>Save Schedule</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── TIME PICKER MODAL ── */}
      <Modal visible={!!timePickerTarget} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeaderTitle}>
              Select {timePickerTarget === 'start' ? 'Start Time' : 'End Time'}
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {TIME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.timeOptionItem}
                  onPress={() => {
                    if (timePickerTarget === 'start') setStartTime(opt);
                    if (timePickerTarget === 'end') setEndTime(opt);
                    setTimePickerTarget(null);
                  }}
                >
                  <Text style={styles.timeOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setTimePickerTarget(null)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MAX JOBS PICKER MODAL ── */}
      <Modal visible={maxJobsModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeaderTitle}>Select Maximum Bookings Per Day</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 14 }}>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.numPill, maxDailyJobs === num && styles.numPillActive]}
                  onPress={() => {
                    setMaxDailyJobs(num);
                    setMaxJobsModalOpen(false);
                  }}
                >
                  <Text style={[styles.numPillText, maxDailyJobs === num && styles.numPillTextActive]}>
                    {num} Jobs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setMaxJobsModalOpen(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },

  // ── Days Row ──
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayChipActive: {
    backgroundColor: '#06684F',
    borderColor: '#06684F'
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569'
  },
  dayChipTextActive: {
    color: '#FFFFFF'
  },

  // ── Hours Row ──
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '600'
  },
  timeSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  timeSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },

  // ── Toggle Rows ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1
  },
  maxJobsPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  maxJobsPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A'
  },

  // ── Save Button ──
  saveScheduleBtn: {
    marginTop: 24,
    backgroundColor: '#06684F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06684F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  saveScheduleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF'
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12
  },
  timeOptionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  timeOptionText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600'
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center'
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B'
  },
  numPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  numPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#06684F'
  },
  numPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  numPillTextActive: {
    color: '#06684F',
    fontWeight: '800'
  }
});
