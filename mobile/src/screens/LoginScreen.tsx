import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
    Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Props { navigation: any; }

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, friction: 4, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Missing Fields', 'Please enter email and password.');
            return;
        }
        try {
            setLoading(true);
            await login(email.trim().toLowerCase(), password);
        } catch (e: any) {
            Alert.alert('Login Failed', e.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={['#0f172a', '#1e3a5f', '#2563eb']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Logo & Branding */}
                    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoInner}>
                                <Ionicons name="bar-chart" size={32} color="#2563eb" />
                            </View>
                            <View style={styles.logoPulse} />
                        </View>
                        <Text style={styles.appName}>StockVal</Text>
                        <Text style={styles.tagline}>Simple investing guidance for every generation</Text>
                    </Animated.View>

                    {/* Stats banner */}
                    <Animated.View style={[styles.statsBanner, { opacity: fadeAnim }]}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>Simple</Text>
                            <Text style={styles.statLabel}>Decisions</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>Supportive</Text>
                            <Text style={styles.statLabel}>Community</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>Long-term</Text>
                            <Text style={styles.statLabel}>Freedom</Text>
                        </View>
                    </Animated.View>

                    {/* Form Card */}
                    <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.formTitle}>Welcome Back</Text>
                        <Text style={styles.formSub}>Sign in to continue your investment journey and community growth</Text>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email address"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.buttonGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>Sign In</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity style={styles.guestButton} onPress={() => navigation.navigate('MainApp')} activeOpacity={0.7}>
                            <Ionicons name="flash-outline" size={18} color="#2563eb" />
                            <Text style={styles.guestButtonText}>Explore the Community</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.footerLink}> Create one</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },

    // Header / Logo
    header: { alignItems: 'center', marginBottom: 24 },
    logoContainer: { position: 'relative', marginBottom: 16 },
    logoInner: {
        width: 72, height: 72, borderRadius: 22, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    logoPulse: {
        position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
        borderRadius: 26, borderWidth: 2, borderColor: 'rgba(37,99,235,0.2)',
    },
    appName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    tagline: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    // Stats
    statsBanner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28, paddingVertical: 12 },
    statItem: { alignItems: 'center', flex: 1 },
    statNumber: { fontSize: 16, fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

    // Form Card
    formCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    formTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
    formSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 24 },

    inputGroup: { marginBottom: 14 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
        borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#1e293b' },

    button: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },
    buttonGrad: { flexDirection: 'row', height: 52, justifyContent: 'center', alignItems: 'center', gap: 8 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
    dividerText: { marginHorizontal: 12, fontSize: 13, color: '#94a3b8', fontWeight: '600' },

    guestButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
        height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#2563eb', backgroundColor: '#eff6ff',
    },
    guestButtonText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: '#64748b' },
    footerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});

export default LoginScreen;
