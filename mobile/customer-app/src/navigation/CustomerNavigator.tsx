import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MyJobsScreen from '../screens/MyJobsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import ReviewModalScreen from '../screens/ReviewModalScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { COLORS } from '../theme/colors';

export function CustomerAppContainer() {
  const [currentRoute, setCurrentRoute] = React.useState<string>('HomeTab');
  const [routeParams, setRouteParams] = React.useState<any>({});
  const [history, setHistory] = React.useState<string[]>(['HomeTab']);

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
      setCurrentRoute('HomeTab');
    }
  };

  const navigation = {
    navigate,
    goBack
  };

  const isTabScreen = ['HomeTab', 'ExploreTab', 'MyJobsTab', 'MessagesTab', 'ProfileTab'].includes(currentRoute);

  const renderScreen = () => {
    const route = { params: routeParams };
    switch (currentRoute) {
      case 'HomeTab':
        return <HomeScreen navigation={navigation} route={route} />;
      case 'ExploreTab':
        return <ExploreScreen navigation={navigation} route={route} />;
      case 'MyJobsTab':
        return <MyJobsScreen navigation={navigation} route={route} />;
      case 'MessagesTab':
        return <MessagesScreen navigation={navigation} route={route} />;
      case 'ProfileTab':
        return <ProfileScreen navigation={navigation} route={route} />;
      case 'CategoryDetail':
        return <CategoryDetailScreen navigation={navigation} route={route} />;
      case 'CreateJob':
        return <CreateJobScreen navigation={navigation} route={route} />;
      case 'Emergency':
        return <EmergencyScreen navigation={navigation} route={route} />;
      case 'JobDetail':
        return <JobDetailScreen navigation={navigation} route={route} />;
      case 'ChatDetail':
        return <ChatDetailScreen navigation={navigation} route={route} />;
      case 'ReviewModal':
        return <ReviewModalScreen navigation={navigation} route={route} />;
      case 'Login':
        return <LoginScreen navigation={navigation} route={route} />;
      case 'Register':
        return <RegisterScreen navigation={navigation} route={route} />;
      default:
        return <HomeScreen navigation={navigation} route={route} />;
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
            {currentRoute === 'CategoryDetail'
              ? 'Service Details'
              : currentRoute === 'CreateJob'
              ? 'Request Service'
              : currentRoute === 'Emergency'
              ? 'Emergency Service'
              : currentRoute === 'JobDetail'
              ? 'Booking Dossier'
              : currentRoute === 'ChatDetail'
              ? 'Technician Chat'
              : currentRoute === 'ReviewModal'
              ? 'Submit Review'
              : currentRoute === 'Login'
              ? 'Sign In'
              : currentRoute === 'Register'
              ? 'Sign Up'
              : 'WorkLogy'}
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
            onPress={() => navigate('HomeTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'HomeTab' && styles.tabActiveIcon]}>
              🏠
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'HomeTab' && styles.tabActiveLabel]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('ExploreTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'ExploreTab' && styles.tabActiveIcon]}>
              🔍
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'ExploreTab' && styles.tabActiveLabel]}>
              Explore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('MyJobsTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'MyJobsTab' && styles.tabActiveIcon]}>
              📋
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'MyJobsTab' && styles.tabActiveLabel]}>
              My Jobs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('MessagesTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'MessagesTab' && styles.tabActiveIcon]}>
              💬
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'MessagesTab' && styles.tabActiveLabel]}>
              Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigate('ProfileTab')}
          >
            <Text style={[styles.tabIcon, currentRoute === 'ProfileTab' && styles.tabActiveIcon]}>
              👤
            </Text>
            <Text style={[styles.tabLabel, currentRoute === 'ProfileTab' && styles.tabActiveLabel]}>
              Profile
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

export default CustomerAppContainer;
