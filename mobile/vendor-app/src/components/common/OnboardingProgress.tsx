import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

interface StepItem {
  key: string;
  label: string;
  stepNumber: number;
}

const STEPS: StepItem[] = [
  { key: 'profile', label: 'Profile', stepNumber: 1 },
  { key: 'domains', label: 'Domains', stepNumber: 2 },
  { key: 'service', label: 'First Service', stepNumber: 3 }
];

interface OnboardingProgressProps {
  currentStep: 1 | 2 | 3;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ currentStep }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 6, 14) }]}>
      <View style={styles.stepsRow}>
        {STEPS.map((s, index) => {
          const isCurrent = s.stepNumber === currentStep;
          const isCompleted = s.stepNumber < currentStep;

          return (
            <React.Fragment key={s.key}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isCurrent && styles.circleTextCurrent
                      ]}
                    >
                      {s.stepNumber}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isCompleted && styles.stepLabelCompleted
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </View>

              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    currentStep > s.stepNumber && styles.lineCompleted
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  circleCurrent: {
    backgroundColor: COLORS.primary
  },
  circleCompleted: {
    backgroundColor: COLORS.primaryAction
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted
  },
  circleTextCurrent: {
    color: '#FFFFFF'
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  stepLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  stepLabelCompleted: {
    color: COLORS.textDark,
    fontWeight: '700'
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#EDF1F3',
    marginHorizontal: 8
  },
  lineCompleted: {
    backgroundColor: COLORS.primaryAction
  }
});

export default OnboardingProgress;
