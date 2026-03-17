import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RegisterAccessScreenProps = {
    hasRegisteredAccount: boolean;
    registeredEmail?: string;
    defaultRememberMe?: boolean;
    onRegister: (payload: { fullName: string; email: string; password: string; rememberMe: boolean }) => void;
    onSignIn: (payload: { email: string; password: string; rememberMe: boolean }) => Promise<{ success: boolean; message?: string }>;
};

const RegisterAccessScreen: React.FC<RegisterAccessScreenProps> = ({
    hasRegisteredAccount,
    registeredEmail,
    defaultRememberMe = true,
    onRegister,
    onSignIn,
}) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSignInMode, setIsSignInMode] = useState(hasRegisteredAccount);
    const [rememberMe, setRememberMe] = useState(defaultRememberMe);

    useEffect(() => {
        if (hasRegisteredAccount && registeredEmail && !email) {
            setEmail(registeredEmail);
        }
    }, [hasRegisteredAccount, registeredEmail, email]);

    const handlePrimaryAction = async () => {
        if (isSignInMode) {
            await handleSignIn();
            return;
        }
        handleRegister();
    };

    const handleRegister = () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!fullName.trim() || !normalizedEmail || !password.trim()) {
            setErrorMessage('Complete all fields to continue.');
            return;
        }

        if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
            setErrorMessage('Enter a valid email address.');
            return;
        }

        if (password.trim().length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }

        setErrorMessage(null);
        onRegister({
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: password.trim(),
            rememberMe,
        });
    };

    const handleSignIn = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password.trim()) {
            setErrorMessage('Enter your email and password to sign in.');
            return;
        }

        const result = await onSignIn({
            email: normalizedEmail,
            password: password.trim(),
            rememberMe,
        });

        if (!result.success) {
            setErrorMessage(result.message || 'Sign in failed.');
            return;
        }

        setErrorMessage(null);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.headerCard}>
                    <Ionicons name="shield-checkmark" size={26} color="#60a5fa" />
                    <Text style={styles.title}>Registered Users Section</Text>
                    <Text style={styles.subtitle}>
                        {isSignInMode
                            ? 'Sign in to continue with your existing registered account.'
                            : 'Register once to unlock portfolio tracker, smart alerts, watchlist workflows, and full valuation tools.'}
                    </Text>
                    {isSignInMode && registeredEmail ? (
                        <Text style={styles.helperText}>Saved account: {registeredEmail}</Text>
                    ) : null}
                </View>

                <View style={styles.formCard}>
                    {!isSignInMode && (
                        <>
                            <Text style={styles.label}>Full name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Your name"
                                placeholderTextColor="#94a3b8"
                            />
                        </>
                    )}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((prev) => !prev)}>
                        <Ionicons
                            name={rememberMe ? 'checkbox-outline' : 'square-outline'}
                            size={18}
                            color={rememberMe ? '#60a5fa' : '#94a3b8'}
                        />
                        <Text style={styles.rememberText}>Remember me on this device</Text>
                    </TouchableOpacity>

                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={16} color="#fecaca" />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity style={styles.primaryButton} onPress={handlePrimaryAction}>
                        <Text style={styles.primaryButtonText}>
                            {isSignInMode ? 'Sign In' : 'Register & Continue'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            setErrorMessage(null);
                            setIsSignInMode((prev) => !prev);
                        }}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {isSignInMode ? 'Create a new account' : 'Already registered? Sign in'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    content: {
        padding: 16,
        gap: 16,
    },
    headerCard: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 16,
        gap: 8,
    },
    title: {
        color: '#f8fafc',
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
    },
    helperText: {
        color: '#93c5fd',
        fontSize: 12,
        marginTop: 4,
    },
    formCard: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 16,
    },
    label: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#1e293b',
        borderRadius: 10,
        color: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 15,
    },
    errorBox: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#7f1d1d',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    errorText: {
        color: '#fee2e2',
        fontSize: 13,
        flex: 1,
    },
    rememberRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rememberText: {
        color: '#cbd5e1',
        fontSize: 13,
        fontWeight: '600',
    },
    primaryButton: {
        marginTop: 16,
        minHeight: 46,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
    secondaryButton: {
        marginTop: 10,
        minHeight: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#0f172a',
    },
    secondaryButtonText: {
        color: '#cbd5e1',
        fontWeight: '600',
        fontSize: 13,
    },
});

export default RegisterAccessScreen;
