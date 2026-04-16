import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Auth screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';
import ValuationScreen from './src/screens/ValuationScreen';
import ValuationSimplified from './src/screens/ValuationSimplified';
import FCFValuationScreen from './src/screens/FCFValuationScreen';
import ScenarioAnalysisScreen from './src/screens/ScenarioAnalysisScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import IntelligenceScreen from './src/screens/IntelligenceScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import EducationScreen from './src/screens/EducationScreen';
import ScreenerScreen from './src/screens/ScreenerScreen';
import SmartStrategyScreen from './src/screens/SmartStrategyScreen';
import StrategyDetailScreen from './src/screens/StrategyDetailScreen';
import StrategyExplainerScreen from './src/screens/StrategyExplainerScreen';
import FinancialStatementsScreen from './src/screens/FinancialStatementsScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import PeerComparisonScreen from './src/screens/PeerComparisonScreen';
import ValuationHistoryScreen from './src/screens/ValuationHistoryScreen';
import DividendScreen from './src/screens/DividendScreen';
import GoalPlannerScreen from './src/screens/GoalPlannerScreen';
import DCAScreen from './src/screens/DCAScreen';
import ReturnsCalculatorScreen from './src/screens/ReturnsCalculatorScreen';
import EconomicDashboardScreen from './src/screens/EconomicDashboardScreen';
import EconomicImpactScreen from './src/screens/EconomicImpactScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import PortfolioTrackerScreen from './src/screens/PortfolioTrackerScreen';
import PriceAlertsScreen from './src/screens/PriceAlertsScreen';
import NewsIntegrationScreen from './src/screens/NewsIntegrationScreen';
import EnhancedChartingScreen from './src/screens/EnhancedChartingScreen';
import BacktestingScreen from './src/screens/BacktestingScreen';
import MarketsHubScreen from './src/screens/MarketsHubScreen';
import SocialFeedScreen from './src/screens/SocialFeedScreen';
import ChatScreen from './src/screens/ChatScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FinancialUploadScreen from './src/screens/FinancialUploadScreen';
import TradingSimulatorScreen from './src/screens/TradingSimulatorScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import StockComparisonScreen from './src/screens/StockComparisonScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import AIChatScreen from './src/screens/AIChatScreen';
import EarningsCalendarScreen from './src/screens/EarningsCalendarScreen';
import OptionsCalculatorScreen from './src/screens/OptionsCalculatorScreen';
import ReferralScreen from './src/screens/ReferralScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Main tabs (shown after auth)
function MainTabs() {
    const { theme, isDark } = useTheme();
    return (
        <Tab.Navigator
            initialRouteName="Home"
            backBehavior="history"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Charts') iconName = focused ? 'grid' : 'grid-outline';
                    else if (route.name === 'Crowd') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Watchlist') iconName = focused ? 'bookmark' : 'bookmark-outline';
                    return (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name={iconName} size={22} color={color} />
                            {focused && <View style={tabStyles.activeIndicator} />}
                        </View>
                    );
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    marginTop: 2,
                },
                tabBarStyle: {
                    backgroundColor: theme.tabBar,
                    borderTopWidth: isDark ? 1 : 0,
                    borderTopColor: theme.border,
                    elevation: 20,
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: 'Discover' }} />
            <Tab.Screen name="Charts" component={MarketsHubScreen} options={{ tabBarLabel: 'Tools' }} />
            <Tab.Screen name="Crowd" component={IntelligenceScreen} options={{ tabBarLabel: 'Community' }} />
            <Tab.Screen name="Watchlist" component={WatchlistScreen} options={{ tabBarLabel: 'Watchlist' }} />
        </Tab.Navigator>
    );
}

function MainAppStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#ffffff' },
                headerTintColor: '#0f172a',
                headerShadowVisible: false,
                headerBackTitleVisible: false,
                headerTitleStyle: { fontWeight: '700' },
            }}
        >
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Valuation" component={ValuationSimplified} options={{ headerShown: false }} />
            <Stack.Screen name="ValuationFull" component={ValuationScreen} options={{ title: 'Decision Deep Dive' }} />
            <Stack.Screen name="Screener" component={ScreenerScreen} options={{ title: 'Opportunity Finder' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'My Financial Journey' }} />
            <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Investment Details' }} />
            <Stack.Screen name="Financials" component={FinancialStatementsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PeerComparison" component={PeerComparisonScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ValuationHistory" component={ValuationHistoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FCFValuation" component={FCFValuationScreen as any} options={{ title: 'FCF Valuation', headerShown: false }} />
            <Stack.Screen name="ScenarioAnalysis" component={ScenarioAnalysisScreen as any} options={{ title: 'Scenario Analysis', headerShown: false }} />
            <Stack.Screen name="AnalysisSmartStrategy" component={SmartStrategyScreen as any} options={{ headerShown: false }} />
            <Stack.Screen name="StrategyDetail" component={StrategyDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StrategyExplainer" component={StrategyExplainerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Dividends" component={DividendScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GoalPlanner" component={GoalPlannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DCA" component={DCAScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ReturnsCalculator" component={ReturnsCalculatorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EconomicDashboard" component={EconomicDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EconomicImpact" component={EconomicImpactScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Transactions" component={TransactionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Price Alerts' }} />
            <Stack.Screen name="Education" component={EducationScreen} options={{ title: 'Learn' }} />
            <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Investment Guidance' }} />
            <Stack.Screen name="PortfolioTracker" component={PortfolioTrackerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PriceAlerts" component={PriceAlertsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NewsIntegration" component={NewsIntegrationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EnhancedCharting" component={EnhancedChartingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Backtesting" component={BacktestingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SocialFeed" component={SocialFeedScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FriendsScreen" component={FriendsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FinancialUpload" component={FinancialUploadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TradingSimulator" component={TradingSimulatorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StockComparison" component={StockComparisonScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AIChat" component={AIChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EarningsCalendar" component={EarningsCalendarScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OptionsCalculator" component={OptionsCalculatorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
}

const tabStyles = StyleSheet.create({
    activeIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#2563eb',
        marginTop: 4,
    },
});

function RootNavigator() {
    const { user, loading } = useAuth();
    const [onboarded, setOnboarded] = useState<boolean | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('onboarding_complete').then((val) => {
            setOnboarded(val === 'true');
        });
    }, []);

    if (loading || onboarded === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            {!onboarded && (
                <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            {user ? (
                <AuthStack.Screen name="MainApp" component={MainAppStack} />
            ) : (
                <>
                    <AuthStack.Screen name="Login" component={LoginScreen} />
                    <AuthStack.Screen name="Register" component={RegisterScreen} />
                    <AuthStack.Screen name="MainApp" component={MainAppStack} />
                </>
            )}
        </AuthStack.Navigator>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <View testID="app-root" style={{ flex: 1 }}>
                        <NavigationContainer>
                            <StatusBar style="light" />
                            <RootNavigator />
                        </NavigationContainer>
                    </View>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
