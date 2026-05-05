import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Dimensions, TouchableOpacity,
    FlatList, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type Persona = 'beginner_protector' | 'wealth_builder' | 'active_opportunity_seeker';

type PersonaProfile = {
    persona: Persona;
    experience: string;
    riskTolerance: string;
    primaryGoal: string;
    timeHorizon: string;
    monthlyBudget: string;
};

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

const QUESTIONS = [
    {
        id: 'experience',
        label: 'How would you describe your investing experience?',
        options: [
            { value: 'new', label: 'I am just starting' },
            { value: 'intermediate', label: 'I know the basics' },
            { value: 'advanced', label: 'I actively manage positions' },
        ],
    },
    {
        id: 'riskTolerance',
        label: 'How much risk feels comfortable for you?',
        options: [
            { value: 'low', label: 'Low risk, steady growth' },
            { value: 'medium', label: 'Balanced risk and growth' },
            { value: 'high', label: 'Higher risk for bigger upside' },
        ],
    },
    {
        id: 'primaryGoal',
        label: 'What matters most to you right now?',
        options: [
            { value: 'avoid_losses', label: 'Avoid losses and build confidence' },
            { value: 'long_term_growth', label: 'Build long-term wealth consistently' },
            { value: 'find_setups', label: 'Find better opportunities quickly' },
        ],
    },
    {
        id: 'timeHorizon',
        label: 'What is your typical investing horizon?',
        options: [
            { value: 'short', label: 'Days to weeks' },
            { value: 'medium', label: 'Months to a year' },
            { value: 'long', label: 'Multiple years' },
        ],
    },
    {
        id: 'monthlyBudget',
        label: 'How much do you usually invest monthly?',
        options: [
            { value: 'under_300', label: 'Under $300' },
            { value: '300_1500', label: '$300 - $1,500' },
            { value: 'over_1500', label: 'Over $1,500' },
        ],
    },
] as const;

const scorePersona = (answers: Record<string, string>): Persona => {
    const score = {
        beginner_protector: 0,
        wealth_builder: 0,
        active_opportunity_seeker: 0,
    };

    if (answers.experience === 'new') score.beginner_protector += 3;
    if (answers.experience === 'intermediate') score.wealth_builder += 2;
    if (answers.experience === 'advanced') score.active_opportunity_seeker += 3;

    if (answers.riskTolerance === 'low') score.beginner_protector += 2;
    if (answers.riskTolerance === 'medium') score.wealth_builder += 2;
    if (answers.riskTolerance === 'high') score.active_opportunity_seeker += 2;

    if (answers.primaryGoal === 'avoid_losses') score.beginner_protector += 3;
    if (answers.primaryGoal === 'long_term_growth') score.wealth_builder += 3;
    if (answers.primaryGoal === 'find_setups') score.active_opportunity_seeker += 3;

    if (answers.timeHorizon === 'long') score.wealth_builder += 2;
    if (answers.timeHorizon === 'medium') score.wealth_builder += 1;
    if (answers.timeHorizon === 'short') score.active_opportunity_seeker += 2;

    if (answers.monthlyBudget === 'under_300') score.beginner_protector += 1;
    if (answers.monthlyBudget === '300_1500') score.wealth_builder += 1;
    if (answers.monthlyBudget === 'over_1500') score.wealth_builder += 1;

    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
    return ranked[0][0] as Persona;
};

const OnboardingScreen = ({ navigation }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showQuestions, setShowQuestions] = useState(false);
    const [showTryIt, setShowTryIt] = useState(false);
    const [pendingProfile, setPendingProfile] = useState<PersonaProfile | null>(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const handleDone = async (profile?: PersonaProfile) => {
        await AsyncStorage.setItem('onboarding_complete', 'true');
        if (profile) {
            await AsyncStorage.setItem('onboarding_persona_profile', JSON.stringify(profile));
        }
        navigation.replace('Login');
    };

    const handleAnswer = (value: string) => {
        const q = QUESTIONS[questionIndex];
        const nextAnswers = { ...answers, [q.id]: value };
        setAnswers(nextAnswers);

        if (questionIndex < QUESTIONS.length - 1) {
            setQuestionIndex(questionIndex + 1);
            return;
        }

        const persona = scorePersona(nextAnswers);
        const profile: PersonaProfile = {
            persona,
            experience: nextAnswers.experience,
            riskTolerance: nextAnswers.riskTolerance,
            primaryGoal: nextAnswers.primaryGoal,
            timeHorizon: nextAnswers.timeHorizon,
            monthlyBudget: nextAnswers.monthlyBudget,
        };
        // Show interactive "try it" step before finishing
        setPendingProfile(profile);
        setShowTryIt(true);
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
            setCurrentIndex(nextIndex);
        } else {
            setShowQuestions(true);
        }
    };

    const renderSlide = ({ item, index }: any) => (
        <LinearGradient colors={item.gradient as [string, string, ...string[]]} style={styles.slide}>
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

    if (showTryIt) {
        const POPULAR = [
            { symbol: 'AAPL', label: 'Apple', icon: '🍎' },
            { symbol: 'TSLA', label: 'Tesla', icon: '⚡' },
            { symbol: 'NVDA', label: 'NVIDIA', icon: '🖥️' },
            { symbol: 'AMZN', label: 'Amazon', icon: '📦' },
            { symbol: 'MSFT', label: 'Microsoft', icon: '🪟' },
            { symbol: 'JNJ', label: 'J&J', icon: '💊' },
        ];
        const pickStock = async (symbol: string) => {
            await handleDone(pendingProfile ?? undefined);
            // Navigate to stock detail after login redirect is set — app will handle routing
        };
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#0f172a', '#1e293b']} style={[styles.slide, styles.quizContainer]}>
                    <View style={styles.quizHeader}>
                        <Text style={styles.quizProgress}>Almost there!</Text>
                        <Text style={styles.quizTitle}>Pick a stock to explore</Text>
                        <Text style={styles.quizSubtitle}>Tap one and we'll show you its valuation when you open the app.</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                        {POPULAR.map((s) => (
                            <TouchableOpacity
                                key={s.symbol}
                                style={{ backgroundColor: '#1e3a5f', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', width: '42%' }}
                                onPress={() => pickStock(s.symbol)}
                            >
                                <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                                <Text style={{ color: '#f1f5f9', fontWeight: '700', marginTop: 6 }}>{s.label}</Text>
                                <Text style={{ color: '#64748b', fontSize: 12 }}>{s.symbol}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.quizSkip, { marginTop: 24 }]} onPress={() => handleDone(pendingProfile ?? undefined)}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        );
    }

    if (showQuestions) {
        const currentQuestion = QUESTIONS[questionIndex];

        return (
            <View style={styles.container}>
                <LinearGradient colors={['#0f172a', '#1e3a5f']} style={[styles.slide, styles.quizContainer]}>
                    <View style={styles.quizHeader}>
                        <Text style={styles.quizProgress}>Question {questionIndex + 1} of {QUESTIONS.length}</Text>
                        <Text style={styles.quizTitle}>Personalize Your Experience</Text>
                        <Text style={styles.quizSubtitle}>{currentQuestion.label}</Text>
                    </View>

                    <View style={styles.quizOptions}>
                        {currentQuestion.options.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={styles.quizOption}
                                onPress={() => handleAnswer(opt.value)}
                            >
                                <Text style={styles.quizOptionText}>{opt.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.quizSkip} onPress={() => handleDone()}>
                        <Text style={styles.skipText}>Skip personalization</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        );
    }

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
                        <TouchableOpacity onPress={() => handleDone()}>
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
    quizContainer: { justifyContent: 'center', paddingHorizontal: 24 },
    quizHeader: { marginBottom: 20 },
    quizProgress: { color: '#3b82f6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
    quizTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10 },
    quizSubtitle: { color: '#cbd5e1', fontSize: 16, lineHeight: 22 },
    quizOptions: { gap: 10 },
    quizOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.35)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 16,
    },
    quizOptionText: { color: '#f8fafc', fontSize: 15, fontWeight: '600', flex: 1, paddingRight: 10 },
    quizSkip: { alignSelf: 'center', marginTop: 18 },
});

export default OnboardingScreen;
