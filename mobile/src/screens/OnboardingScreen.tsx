import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    navigation: any;
}

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
    const [step, setStep] = useState(0);

    const screens = [
        {
            title: 'Stock Valuation Made Simple',
            subtitle: 'Professional analysis at your fingertips',
            icon: 'trending-up',
            color: '#007AFF',
            description: 'Get DCF valuations, comparable multiples, and technical signals in one tap.',
        },
        {
            title: 'Smart Watchlist',
            subtitle: 'Track what matters',
            icon: 'bookmark',
            color: '#34C759',
            description: 'Set price alerts, monitor daily moves, and get instant notifications.',
        },
        {
            title: 'Price Calculator',
            subtitle: 'Quick valuations',
            icon: 'calculator',
            color: '#FF9500',
            description: 'Calculate target prices using EPS×P/E or quick DCF inputs.',
        },
        {
            title: 'Full Analysis',
            subtitle: 'All-in-one view',
            icon: 'analytics',
            color: '#FF3B30',
            description: 'Smart summaries, risk flags, and unified investment signals.',
        },
    ];

    const current = screens[step];

    const handleNext = () => {
        if (step < screens.length - 1) {
            setStep(step + 1);
        } else {
            navigation.replace('Home');
        }
    };

    const handleSkip = () => {
        navigation.replace('Home');
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                <LinearGradient
                    colors={[current.color, `${current.color}CC`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name={current.icon as any} size={80} color="white" />
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <Text style={styles.title}>{current.title}</Text>
                    <Text style={styles.subtitle}>{current.subtitle}</Text>
                    <Text style={styles.description}>{current.description}</Text>

                    <View style={styles.dots}>
                        {screens.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === step && styles.dotActive,
                                    { backgroundColor: index === step ? current.color : '#e5e7eb' },
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipButton}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: current.color }]}
                    onPress={handleNext}
                >
                    <Text style={styles.nextButtonText}>
                        {step === screens.length - 1 ? 'Start' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scroll: {
        flex: 1,
    },
    gradient: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginTop: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#9ca3af',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 48,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    skipButton: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default OnboardingScreen;
