import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

interface Props { navigation: any; }

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleRegister = async () => {
        if (!email.trim() || !username.trim() || !password) {
            Alert.alert('Missing Fields', 'All fields are required.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }
        try {
            setLoading(true);
            await register(email.trim().toLowerCase(), username.trim(), password);
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message || 'Could not create account');
        } finally {
            setLoading(false);
        }
    };

    const strengthLevel = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
    const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#10b981'];
    const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={['#0f172a', '#1e3a5f', '#2563eb']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                        <View style={styles.logoInner}>
                            <Ionicons name="person-add" size={28} color="#2563eb" />
                        </View>
                        <Text style={styles.appName}>Join StockVal</Text>
                        <Text style={styles.tagline}>Create your free account</Text>
                    </Animated.View>

                    <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#94a3b8" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#94a3b8" autoCapitalize="none" value={username} onChangeText={setUsername} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password (min. 6 chars)" placeholderTextColor="#94a3b8" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            {password.length > 0 && (
                                <View style={styles.strengthRow}>
                                    <View style={styles.strengthBar}>
                                        {[1, 2, 3].map((i) => (
                                            <View key={i} style={[styles.strengthSeg, { backgroundColor: i <= strengthLevel ? strengthColors[strengthLevel] : '#e2e8f0' }]} />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthText, { color: strengthColors[strengthLevel] }]}>{strengthLabels[strengthLevel]}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrap}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor="#94a3b8" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.buttonGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Text style={styles.buttonText}>Create Account</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.footerLink}> Sign In</Text>
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

    header: { alignItems: 'center', marginBottom: 24 },
    logoInner: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    appName: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    tagline: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    formCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    inputGroup: { marginBottom: 14 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
        borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#1e293b' },

    strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    strengthBar: { flexDirection: 'row', gap: 4, flex: 1 },
    strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
    strengthText: { fontSize: 12, fontWeight: '700' },

    button: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },
    buttonGrad: { flexDirection: 'row', height: 52, justifyContent: 'center', alignItems: 'center', gap: 8 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: '#64748b' },
    footerLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});

export default RegisterScreen;
