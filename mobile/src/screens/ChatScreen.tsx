import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

type ChatView = 'conversations' | 'messages';

const ChatScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
    const [view, setView] = useState<ChatView>('conversations');
    const [conversations, setConversations] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [activeChat, setActiveChat] = useState<{ id: number; username: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Search for new users to message
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const loadConversations = useCallback(async () => {
        try {
            const data = await stockAPI.getConversations();
            setConversations(data.conversations || []);
        } catch (e) {
            console.error('Conversations load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const openChat = async (userId: number, username: string) => {
        setActiveChat({ id: userId, username });
        setView('messages');
        setLoading(true);
        try {
            const data = await stockAPI.getMessages(userId);
            setMessages(data.messages || []);
        } catch { setMessages([]); }
        finally { setLoading(false); }
    };

    const handleSend = async () => {
        if (!messageText.trim() || !activeChat) return;
        setSending(true);
        try {
            const msg = await stockAPI.sendChatMessage(activeChat.id, messageText.trim());
            setMessages(prev => [...prev, msg]);
            setMessageText('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setSearching(true);
        try {
            const data = await stockAPI.searchUsers(searchQuery);
            setSearchResults(data.users || []);
        } catch { setSearchResults([]); }
        finally { setSearching(false); }
    };

    const goBack = () => {
        setView('conversations');
        setActiveChat(null);
        setMessages([]);
        loadConversations();
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    };

    // ── Conversations list ──
    if (view === 'conversations') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity onPress={() => navigation?.navigate('FriendsScreen')}>
                        <Ionicons name="people-outline" size={24} color="#2563eb" />
                    </TouchableOpacity>
                </View>

                {/* Search to start new conversation */}
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users to message..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
                        <Ionicons name="search" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search results */}
                {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                        {searchResults.map(u => (
                            <TouchableOpacity key={u.id} style={styles.searchItem}
                                onPress={() => { setSearchResults([]); setSearchQuery(''); openChat(u.id, u.username); }}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{u.username[0].toUpperCase()}</Text>
                                </View>
                                <Text style={styles.searchUsername}>@{u.username}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={conversations}
                        keyExtractor={(item) => String(item.other_user_id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.convItem}
                                onPress={() => openChat(item.other_user_id, item.other_username)}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{(item.other_username || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.convHeader}>
                                        <Text style={styles.convName}>@{item.other_username}</Text>
                                        <Text style={styles.convTime}>{timeAgo(item.last_message_at)}</Text>
                                    </View>
                                    <Text style={styles.convPreview} numberOfLines={1}>{item.last_message}</Text>
                                </View>
                                {item.unread_count > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{item.unread_count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No conversations yet.{'\n'}Search for users above to start chatting!</Text>
                            </View>
                        }
                    />
                )}
            </View>
        );
    }

    // ── Chat messages view ──
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            {/* Chat header */}
            <View style={styles.chatHeader}>
                <TouchableOpacity onPress={goBack} style={{ paddingRight: 12 }}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <View style={[styles.avatar, styles.avatarSmall]}>
                    <Text style={[styles.avatarText, { fontSize: 12 }]}>{(activeChat?.username || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.chatHeaderName}>@{activeChat?.username}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => {
                        const isMe = item.sender_username !== activeChat?.username;
                        return (
                            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                                <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
                                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{timeAgo(item.created_at)}</Text>
                                </View>
                            </View>
                        );
                    }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
                        </View>
                    }
                />
            )}

            {/* Message input */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.msgInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#94a3b8"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity onPress={handleSend} disabled={!messageText.trim() || sending}
                    style={[styles.sendBtn, (!messageText.trim() || sending) && { opacity: 0.4 }]}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },

    // Search
    searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', gap: 8 },
    searchInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a' },
    searchBtn: { backgroundColor: '#2563eb', borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    searchResults: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    searchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    searchUsername: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

    // Avatar
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
    avatarSmall: { width: 32, height: 32, borderRadius: 16 },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Conversations
    convItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    convName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    convTime: { fontSize: 12, color: '#94a3b8' },
    convPreview: { fontSize: 13, color: '#64748b', marginTop: 2 },
    badge: { backgroundColor: '#2563eb', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    // Chat header
    chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 60, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    chatHeaderName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

    // Messages
    msgRow: { flexDirection: 'row', marginBottom: 6 },
    msgRowMe: { justifyContent: 'flex-end' },
    msgBubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
    msgBubbleMe: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
    msgBubbleOther: { backgroundColor: '#e2e8f0', borderBottomLeftRadius: 4 },
    msgText: { fontSize: 15, color: '#0f172a', lineHeight: 20 },
    msgTextMe: { color: '#fff' },
    msgTime: { fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'right' },
    msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

    // Input bar
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    msgInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 15, color: '#0f172a', maxHeight: 100 },
    sendBtn: { backgroundColor: '#2563eb', borderRadius: 20, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

    // Empty
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' },
});

export default ChatScreen;
