import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UnifiedLoadingProps {
    message: string;
    fullScreen?: boolean;
}

const UnifiedLoading: React.FC<UnifiedLoadingProps> = ({ message, fullScreen = false }) => {
    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <View style={styles.row}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Ionicons name="sync" size={14} color="#38bdf8" />
                <Text style={styles.text}>{message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b1120',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    text: {
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
});

export default UnifiedLoading;
