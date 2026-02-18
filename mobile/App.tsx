import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';
import ValuationScreen from './src/screens/ValuationScreen';
import ValuationSimplified from './src/screens/ValuationSimplified';
import OnboardingScreen from './src/screens/OnboardingScreen';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator for Home tab
function HomeStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="HomeMain"
                component={HomeScreen}
                options={{ title: 'Stock Valuation' }}
            />
            <Stack.Screen
                name="Valuation"
                component={ValuationSimplified}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ValuationFull"
                component={ValuationScreen}
                options={{ title: 'Full Analysis' }}
            />
            <Stack.Screen
                name="Screener"
                component={ScreenerScreen}
                options={{ title: 'AI Screener' }}
            />
            <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Portfolio Dashboard' }}
            />
            <Stack.Screen
                name="StockDetail"
                component={StockDetailScreen}
                options={{ title: 'Stock Details' }}
            />
            <Stack.Screen
                name="FCFValuation"
                component={FCFValuationScreen as any}
                options={{ title: 'FCF Valuation', headerShown: false }}
            />
            <Stack.Screen
                name="ScenarioAnalysis"
                component={ScenarioAnalysisScreen as any}
                options={{ title: 'Scenario Analysis', headerShown: false }}
            />
            <Stack.Screen
                name="AnalysisSmartStrategy"
                component={SmartStrategyScreen as any}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StrategyDetail"
                component={StrategyDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StrategyExplainer"
                component={StrategyExplainerScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}

// Stack Navigator for Analysis tab
function AnalysisStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="AnalysisMain"
                component={AnalysisScreen}
                options={{ title: 'Market Analysis' }}
            />
            <Stack.Screen
                name="Valuation"
                component={ValuationSimplified}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ValuationFull"
                component={ValuationScreen}
                options={{ title: 'Full Analysis' }}
            />
            <Stack.Screen
                name="Screener"
                component={ScreenerScreen}
                options={{ title: 'AI Screener' }}
            />
            <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Portfolio Dashboard' }}
            />
            <Stack.Screen
                name="StockDetail"
                component={StockDetailScreen}
                options={{ title: 'Stock Details' }}
            />
            <Stack.Screen
                name="FCFValuation"
                component={FCFValuationScreen as any}
                options={{ title: 'FCF Valuation', headerShown: false }}
            />
            <Stack.Screen
                name="ScenarioAnalysis"
                component={ScenarioAnalysisScreen as any}
                options={{ title: 'Scenario Analysis', headerShown: false }}
            />
            <Stack.Screen
                name="AnalysisSmartStrategy"
                component={SmartStrategyScreen as any}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StrategyDetail"
                component={StrategyDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StrategyExplainer"
                component={StrategyExplainerScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <View testID="app-root" style={{ flex: 1 }}>
            <NavigationContainer>
                <StatusBar style="auto" />
                <Tab.Navigator
                    screenOptions={({ route }) => ({
                        tabBarIcon: ({ focused, color, size }) => {
                            let iconName;

                            if (route.name === 'Home') {
                                iconName = focused ? 'home' : 'home-outline';
                            } else if (route.name === 'Intelligence') {
                                iconName = focused ? 'bulb' : 'bulb-outline';
                            } else if (route.name === 'Alerts') {
                                iconName = focused ? 'notifications' : 'notifications-outline';
                            } else if (route.name === 'Education') {
                                iconName = focused ? 'school' : 'school-outline';
                            } else if (route.name === 'Search') {
                                iconName = focused ? 'search' : 'search-outline';
                            } else if (route.name === 'Analysis') {
                                iconName = focused ? 'analytics' : 'analytics-outline';
                            } else if (route.name === 'Watchlist') {
                                iconName = focused ? 'bookmark' : 'bookmark-outline';
                            }

                            return <Ionicons name={iconName} size={size} color={color} />;
                        },
                        tabBarActiveTintColor: '#007AFF',
                        tabBarInactiveTintColor: 'gray',
                        headerShown: false,
                    })}
                >
                    <Tab.Screen name="Home" component={HomeStack} />
                    <Tab.Screen name="Intelligence" component={IntelligenceScreen} />
                    <Tab.Screen name="Alerts" component={AlertsScreen} />
                    <Tab.Screen name="Education" component={EducationScreen} />
                    <Tab.Screen name="Search" component={SearchScreen} />
                    <Tab.Screen name="Analysis" component={AnalysisStack} />
                    <Tab.Screen name="Watchlist" component={WatchlistScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </View>
    );
}