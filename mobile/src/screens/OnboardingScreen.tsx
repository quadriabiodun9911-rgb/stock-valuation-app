import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Dimensions, TouchableOpacity,
    FlatList, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: 'analytics' as const,
        title: 'Make Smarter Decisions',
        subtitle: 'Make smarter investing decisions with clear guidance, not noise.',
        gradient: ['#0f172a', '#1e3a5f'] as const,
        accent: '#3b82f6',
        features: ['Clear Call', 'Fair Value', 'Risk Flags'],
    },
    {
        id: '2',
        icon: 'bulb' as const,
        title: 'For Every Stage of Life',
        subtitle: 'Simple language, clear steps, and helpful guidance for both new and experienced investors.',
        gradient: ['#0f172a', '#1a3329'] as const,
        accent: '#16a34a',
        features: ['Simple Steps', 'Less Jargon', 'Confidence Builder'],
    },
    {
        id: '3',
        icon: 'people' as const,
        title: 'Grow Together',
        subtitle: 'Learn with the community, support one another, and move toward long-term financial freedom.',
        gradient: ['#0f172a', '#2d1b4e'] as const,
        accent: '#7c3aed',
        features: ['Community Support', 'Shared Learning', 'Long-Term Freedom'],
    },
];

const OnboardingScreen = ({ navigation }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const handleDone = async () => {
        await AsyncStorage.setItem('onboarding_complete', 'true');
        navigation.replace('Login');
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleDone();
        }
    };

    const renderSlide = ({ item, index }: any) => (
        <LinearGradient colors={[...item.gradient]} style={styles.slide}>
            <View style={styles.slideContent}>
                {/* Icon */}
                <View style={[styles.iconCircle, { backgroundColor: `${item.accent}20` }]}>
                    <View style={[styles.iconInner, { backgroundColor: `${item.accent}30` }]}>
                        <Ionicons name={item.icon} size={48} color={item.accent} />
                    </View>
                </View>

                {/* Text */}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>

                {/* Feature pills */}
                <View style={styles.features}>
                    {item.features.map((f: string) => (
                        <View key={f} style={[styles.featurePill, { borderColor: `${item.accent}40` }]}>
                            <Ionicons name="checkmark-circle" size={14} color={item.accent} />
                            <Text style={[styles.featureText, { color: item.accent }]}>{f}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </LinearGradient>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
            />

            {/* Bottom controls */}
            <View style={styles.bottom}>
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
                        );
                    })}
                </View>

                <View style={styles.buttonsRow}>
                    {currentIndex < SLIDES.length - 1 ? (
                        <TouchableOpacity onPress={handleDone}>
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    ) : <View />}

                    <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                        <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.nextBtn}>
                            <Text style={styles.nextText}>
                                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    slide: { width, height },
    slideContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 140 },
    iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    iconInner: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginTop: 12, lineHeight: 24 },
    features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 28 },
    featurePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    featureText: { fontSize: 12, fontWeight: '700' },
    bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 32 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
    dot: { height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
    buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skipText: { fontSize: 15, fontWeight: '600', color: '#64748b', padding: 8 },
    nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
    nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default OnboardingScreen;
