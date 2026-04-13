import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

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
import EconomicDashboardScreen from './src/screens/EconomicDashboardScreen';
import EconomicImpactScreen from './src/screens/EconomicImpactScreen';
import TransactionScreen from './src/screens/TransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// All screens reachable from Home tab
function HomeStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Stock Valuation' }} />
            <Stack.Screen name="Valuation" component={ValuationSimplified} options={{ headerShown: false }} />
            <Stack.Screen name="ValuationFull" component={ValuationScreen} options={{ title: 'Full Analysis' }} />
            <Stack.Screen name="Screener" component={ScreenerScreen} options={{ title: 'AI Screener' }} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Portfolio Dashboard' }} />
            <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Stock Details' }} />
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
            <Stack.Screen name="EconomicDashboard" component={EconomicDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EconomicImpact" component={EconomicImpactScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Transactions" component={TransactionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Price Alerts' }} />
            <Stack.Screen name="Education" component={EducationScreen} options={{ title: 'Learn' }} />
            <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Market Analysis' }} />
        </Stack.Navigator>
    );
}

// Main tabs (shown after auth)
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Crowd') iconName = focused ? 'people' : 'people-outline';
                    else if (route.name === 'Watchlist') iconName = focused ? 'bookmark' : 'bookmark-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#94a3b8',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Search" component={SearchScreen} />
            <Tab.Screen name="Crowd" component={IntelligenceScreen} />
            <Tab.Screen name="Watchlist" component={WatchlistScreen} />
        </Tab.Navigator>
    );
}

function RootNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <AuthStack.Screen name="MainApp" component={MainTabs} />
            ) : (
                <>
                    <AuthStack.Screen name="Login" component={LoginScreen} />
                    <AuthStack.Screen name="Register" component={RegisterScreen} />
                    <AuthStack.Screen name="MainApp" component={MainTabs} />
                </>
            )}
        </AuthStack.Navigator>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
        <AuthProvider>
        <View testID="app-root" style={{ flex: 1 }}>
            <NavigationContainer>
                <StatusBar style="auto" />
                <RootNavigator />
            </NavigationContainer>
        </View>
        </AuthProvider>
        </ErrorBoundary>
    );
}
