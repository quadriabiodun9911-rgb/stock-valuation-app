import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI } from '../services/api';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    type?: string;
    timestamp: Date;
}

const SUGGESTIONS = [
    "Should I buy AAPL?",
    "How is my portfolio doing?",
    "Compare MSFT vs GOOGL",
    "How risky is TSLA?",
    "What are NVDA's dividends?",
    "Tell me about AMD",
];

const AIChatScreen = ({ navigation, route }: any) => {
    const symbolFromRoute: string | undefined = route?.params?.symbol;
    const prefillMessage: string | undefined = route?.params?.prefillMessage;
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            text: symbolFromRoute
                ? `Hi! I'm your AI stock analyst. I can focus on ${symbolFromRoute.toUpperCase()} or your broader portfolio.`
                : "Hi! I'm your AI stock analyst. Ask me anything about stocks, your portfolio, or market trends.\n\nTry: \"Should I buy AAPL?\" or \"How is my portfolio doing?\"",
            isUser: false,
            type: 'help',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState(prefillMessage || '');
    const [loading, setLoading] = useState(false);
    const listRef = useRef<FlatList>(null);

    const sendMessage = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: msg,
            isUser: true,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await stockAPI.sendAIChat(msg, symbolFromRoute);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: res.response,
                isUser: false,
                type: res.type,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I couldn't process that. Please try again.",
                isUser: false,
                type: 'error',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (listRef.current && messages.length > 1) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    useEffect(() => {
        if (symbolFromRoute) {
            sendMessage(`Give me a concise valuation brief for ${symbolFromRoute.toUpperCase()}.`);
        }
    }, [symbolFromRoute]);

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.msgRow, item.isUser && styles.msgRowUser]}>
            {!item.isUser && (
                <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={16} color="#2563eb" />
                </View>
            )}
            <View style={[styles.msgBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, item.isUser && styles.userText]}>{item.text}</Text>
                <Text style={styles.timestamp}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>AI Analyst</Text>
                    <View style={styles.onlineDot} />
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AssistiveMetrics')}
                    style={styles.metricsBtn}
                >
                    <Ionicons name="stats-chart" size={18} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>

            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatList}
                ListFooterComponent={loading ? (
                    <View style={styles.typingRow}>
                        <View style={styles.aiAvatar}>
                            <Ionicons name="sparkles" size={16} color="#2563eb" />
                        </View>
                        <View style={styles.typingBubble}>
                            <ActivityIndicator size="small" color="#2563eb" />
                            <Text style={styles.typingText}>Analyzing...</Text>
                        </View>
                    </View>
                ) : null}
            />

            {/* Suggestions (show only if few messages) */}
            {messages.length <= 2 && (
                <View style={styles.suggestionsRow}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={SUGGESTIONS}
                        keyExtractor={(item) => item}
                        contentContainerStyle={{ paddingHorizontal: 12 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionChip}
                                onPress={() => sendMessage(item)}
                            >
                                <Text style={styles.suggestionText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask about any stock..."
                        placeholderTextColor="#94a3b8"
                        onSubmitEditing={() => sendMessage()}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!input.trim() || loading}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginLeft: 8 },
    metricsBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatList: { padding: 16, paddingBottom: 8 },
    msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    msgRowUser: { flexDirection: 'row-reverse' },
    aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    msgBubble: { maxWidth: '75%', borderRadius: 18, padding: 14, paddingBottom: 8 },
    userBubble: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    msgText: { fontSize: 15, color: '#0f172a', lineHeight: 22 },
    userText: { color: '#fff' },
    timestamp: { fontSize: 10, color: 'rgba(148,163,184,0.8)', marginTop: 4, textAlign: 'right' },
    typingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 12, paddingHorizontal: 16 },
    typingText: { fontSize: 13, color: '#64748b', marginLeft: 8 },
    suggestionsRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingVertical: 10 },
    suggestionChip: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#bfdbfe' },
    suggestionText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: '#0f172a', marginRight: 10 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
});

export default AIChatScreen;
