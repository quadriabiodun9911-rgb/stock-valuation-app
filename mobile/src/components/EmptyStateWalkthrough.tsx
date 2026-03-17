import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateWalkthroughProps {
    title: string;
    subtitle: string;
    steps: string[];
    primaryLabel: string;
    onPrimaryPress: () => void;
    secondaryLabel?: string;
    onSecondaryPress?: () => void;
}

const EmptyStateWalkthrough: React.FC<EmptyStateWalkthroughProps> = ({
    title,
    subtitle,
    steps,
    primaryLabel,
    onPrimaryPress,
    secondaryLabel,
    onSecondaryPress,
}) => {
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Ionicons name="trail-sign" size={20} color="#38bdf8" />
                <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {steps.map((step, index) => (
                <View key={`${step}-${index}`} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                </View>
            ))}

            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryPress}>
                    <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
                </TouchableOpacity>
                {secondaryLabel && onSecondaryPress && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress}>
                        <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#1f2937',
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 17,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stepBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadgeText: {
        color: '#38bdf8',
        fontSize: 11,
        fontWeight: '700',
    },
    stepText: {
        color: '#e2e8f0',
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    primaryButton: {
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#38bdf8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#0b1120',
        fontSize: 12,
        fontWeight: '700',
    },
    secondaryButton: {
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default EmptyStateWalkthrough;
