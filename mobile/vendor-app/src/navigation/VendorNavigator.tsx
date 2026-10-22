import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import VendorHomeScreen from '../screens/VendorHomeScreen';
import AvailableJobsScreen from '../screens/AvailableJobsScreen';
import ConfirmedJobsScreen from '../screens/ConfirmedJobsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import VendorProfileScreen from '../screens/VendorProfileScreen';
import VendorJobDetailScreen from '../screens/VendorJobDetailScreen';
import VendorChatDetailScreen from '../screens/VendorChatDetailScreen';
import VendorLoginScreen from '../screens/VendorLoginScreen';
import VendorRegisterScreen from '../screens/VendorRegisterScreen';
import { COLORS } from '../theme/colors';

export function VendorAppContainer() {
  const [currentRoute, setCurrentRoute] = React.useState<string>('VendorHomeTab');
  const [routeParams, setRouteParams] = React.useState<any>({});
  const [history, setHistory] = React.useState<string[]>(['VendorHomeTab']);

  const navigate = (screen: string, params: any = {}) => {
    setRouteParams(params);
    setHistory((prev: string[]) => [...prev, screen]);
    setCurrentRoute(screen);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentRoute(prevScreen);
    } else {
      setCurrentRoute('VendorHomeTab');
    }
  };

  const navigation = {
    navigate,
    goBack
  };

  const isTabScreen = ['VendorHomeTab', 'AvailableTab', 'ConfirmedTab', 'EarningsTab', 'ProfileTab'].includes(
    currentRoute
  );

  const renderScreen = () => {
    const route = { params: routeParams };
    switch (currentRoute) {
      case 'VendorHomeTab':
        return <VendorHomeScreen navigation={navigation} route={route} />;
      case 'AvailableTab':
        return <AvailableJobsScreen navigation={navigation} route={route} />;
      case 'ConfirmedTab':
        return <ConfirmedJobsScreen navigation={navigation} route={route} />;
      case 'EarningsTab':
        return <EarningsScreen navigation={navigation} route={route} />;
      case 'ProfileTab':
        return <VendorProfileScreen navigation={navigation} route={route} />;
      case 'VendorJobDetail':
        return <VendorJobDetailScreen navigation={navigation} route={route} />;
      case 'ChatDetail':
        return <VendorChatDetailScreen navigation={navigation} route={route} />;
      case 'VendorLogin':
        return <VendorLoginScreen navigation={navigation} route={route} />;
      case 'VendorRegister':
        return <VendorRegisterScreen navigation={navigation} route={route} />;
      default:
        return <VendorHomeScreen navigation={navigation} route={route} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Back Header for Stack Screens */}
      {!isTabScreen && (
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navHeaderTitle}>
            {currentRoute === 'VendorJobDetail'
              ? 'Work Dossier'
              : currentRoute === 'ChatDetail'
              ? 'Client Communication'
              : currentRoute === 'VendorLogin'
              ? 'Pro Authentication'
              : currentRoute === 'VendorRegister'
              ? 'Pro Registration'
              : 'WorkLogy Pro'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Main Screen Body */}
      <View style={styles.screenBody}>{renderScreen()}</View>

      {/* Persistent Bottom Tab Bar */}
      {isTabScreen && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('VendorHomeTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'VendorHomeTab' && styles.tabActiveIcon]}>
              ⚡
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'VendorHomeTab' && styles.tabActiveLabel]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('AvailableTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'AvailableTab' && styles.tabActiveIcon]}>
              📡
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'AvailableTab' && styles.tabActiveLabel]}>
              Available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('ConfirmedTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'ConfirmedTab' && styles.tabActiveIcon]}>
              📋
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'ConfirmedTab' && styles.tabActiveLabel]}>
              Field Jobs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('EarningsTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'EarningsTab' && styles.tabActiveIcon]}>
              💰
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'EarningsTab' && styles.tabActiveLabel]}>
              Earnings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('ProfileTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'ProfileTab' && styles.tabActiveIcon]}>
              🛠️
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'ProfileTab' && styles.tabActiveLabel]}>
              Pro Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  screenBody: {
    flex: 1
  },
  navHeader: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary
  },
  navHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark
  },
  bottomBar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6
  },
  tabActiveIcon: {
    opacity: 1
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2
  },
  tabActiveLabel: {
    color: COLORS.primary,
    fontWeight: '800'
  }
});

export default VendorAppContainer;
