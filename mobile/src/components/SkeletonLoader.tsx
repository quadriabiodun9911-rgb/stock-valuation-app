import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: '#e2e8f0', opacity },
                style,
            ]}
        />
    );
};

export const SkeletonCard = ({ style }: { style?: ViewStyle }) => (
    <View style={[skStyles.card, style]}>
        <View style={skStyles.row}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} />
            </View>
            <Skeleton width={70} height={20} borderRadius={10} />
        </View>
    </View>
);

export const SkeletonChart = ({ style }: { style?: ViewStyle }) => (
    <View style={[skStyles.card, style]}>
        <Skeleton width="40%" height={14} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={180} borderRadius={12} />
    </View>
);

export const SkeletonList = ({ count = 4, style }: { count?: number; style?: ViewStyle }) => (
    <View style={style}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} style={{ marginBottom: 12 }} />
        ))}
    </View>
);

const skStyles = StyleSheet.create({
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
});

export default Skeleton;
