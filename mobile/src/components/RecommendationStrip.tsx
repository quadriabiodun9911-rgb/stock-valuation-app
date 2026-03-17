import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecommendationStripProps {
    action: 'Buy' | 'Hold' | 'Review' | 'Avoid';
    reason: string;
    confidence?: 'Low' | 'Medium' | 'High';
    whyThisMatters?: string;
    whatToDoNext?: string;
    dataSource?: string;
    lastUpdated?: string;
    limitations?: string;
    onPress?: () => void;
}

const colorMap: Record<RecommendationStripProps['action'], string> = {
    Buy: '#16a34a',
    Hold: '#f59e0b',
    Review: '#0ea5e9',
    Avoid: '#ef4444',
};

const RecommendationStrip: React.FC<RecommendationStripProps> = ({
    action,
    reason,
    confidence = 'Medium',
    whyThisMatters,
    whatToDoNext,
    dataSource,
    lastUpdated,
    limitations,
    onPress,
}) => {
    const color = colorMap[action];
    const trustLine = [dataSource ? `Source: ${dataSource}` : null, lastUpdated ? `Updated: ${lastUpdated}` : null]
        .filter(Boolean)
        .join(' • ');

    return (
        <View style={styles.wrapper}>
            <View style={[styles.pill, { borderColor: color }]}>
                <Ionicons name="sparkles" size={14} color={color} />
                <Text style={[styles.actionText, { color }]}>{action}</Text>
                <Text style={styles.confidenceText}>{confidence}</Text>
            </View>
            <Text style={styles.reasonText}>{reason}</Text>
            {whyThisMatters ? <Text style={styles.metaText}><Text style={styles.metaLabel}>Why this matters:</Text> {whyThisMatters}</Text> : null}
            {whatToDoNext ? <Text style={styles.metaText}><Text style={styles.metaLabel}>What to do next:</Text> {whatToDoNext}</Text> : null}
            {trustLine ? <Text style={styles.trustText}>{trustLine}</Text> : null}
            {limitations ? <Text style={styles.limitText}>Limitations: {limitations}</Text> : null}
            {onPress && (
                <TouchableOpacity style={styles.cta} onPress={onPress}>
                    <Text style={styles.ctaText}>View Why</Text>
                    <Ionicons name="chevron-forward" size={14} color="#38bdf8" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 20,
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e293b',
        backgroundColor: '#0f172a',
        gap: 8,
    },
    pill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        minHeight: 28,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    confidenceText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
        marginLeft: 4,
    },
    reasonText: {
        color: '#e2e8f0',
        fontSize: 12,
        lineHeight: 17,
    },
    metaText: {
        color: '#cbd5e1',
        fontSize: 12,
        lineHeight: 17,
    },
    metaLabel: {
        color: '#93c5fd',
        fontWeight: '700',
    },
    trustText: {
        color: '#94a3b8',
        fontSize: 11,
    },
    limitText: {
        color: '#fbbf24',
        fontSize: 11,
        lineHeight: 16,
    },
    cta: {
        alignSelf: 'flex-start',
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ctaText: {
        color: '#38bdf8',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default RecommendationStrip;
