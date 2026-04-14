import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

const FriendsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
    const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [friends, setFriends] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [f, r] = await Promise.all([stockAPI.getFriends(), stockAPI.getFriendRequests()]);
            setFriends(f.friends || []);
            setRequests(r.requests || []);
        } catch (e) {
            console.error('Friends load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        try {
            const data = await stockAPI.searchUsers(searchQuery);
            setSearchResults(data.users || []);
        } catch { setSearchResults([]); }
    };

    const handleAddFriend = async (userId: number) => {
        try {
            const result = await stockAPI.sendFriendRequest(userId);
            Alert.alert('Sent', result.message || 'Friend request sent!');
        } catch { Alert.alert('Error', 'Failed to send request.'); }
    };

    const handleRespond = async (requestId: number, accept: boolean) => {
        try {
            await stockAPI.respondFriendRequest(requestId, accept);
            setRequests(prev => prev.filter(r => r.id !== requestId));
            if (accept) loadData();
        } catch { Alert.alert('Error', 'Failed to respond.'); }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={{ paddingRight: 12 }}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Friends</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['friends', 'requests', 'search'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}>
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'friends' ? `Friends (${friends.length})` :
                                t === 'requests' ? `Requests (${requests.length})` : 'Find People'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'friends' && (
                <FlatList
                    data={friends}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.userRow}
                            onPress={() => navigation?.navigate('ChatScreen', { userId: item.id, username: item.username })}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.username}>@{item.username}</Text>
                                <Text style={styles.email}>{item.email}</Text>
                            </View>
                            <Ionicons name="chatbubble-outline" size={20} color="#2563eb" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No friends yet.{'\n'}Search for people to connect!</Text>
                        </View>
                    }
                />
            )}

            {tab === 'requests' && (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <View style={styles.userRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.username}>@{item.username}</Text>
                            </View>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond(item.id, true)}>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRespond(item.id, false)}>
                                <Ionicons name="close" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No pending requests.</Text>
                        </View>
                    }
                />
            )}

            {tab === 'search' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchRow}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by username or email..."
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
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <View style={styles.userRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.username}>@{item.username}</Text>
                                    <Text style={styles.email}>{item.email}</Text>
                                </View>
                                <TouchableOpacity style={styles.addBtn} onPress={() => handleAddFriend(item.id)}>
                                    <Ionicons name="person-add" size={16} color="#fff" />
                                    <Text style={styles.addBtnText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            searchQuery.length >= 2 ? (
                                <View style={styles.empty}>
                                    <Text style={styles.emptyText}>No users found.</Text>
                                </View>
                            ) : null
                        }
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

    tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
    tabActive: { backgroundColor: '#2563eb' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    tabTextActive: { color: '#fff' },

    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    username: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    email: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

    acceptBtn: { backgroundColor: '#16a34a', borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    rejectBtn: { backgroundColor: '#dc2626', borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: '#fff' },
    searchInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a' },
    searchBtn: { backgroundColor: '#2563eb', borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' },
});

export default FriendsScreen;
