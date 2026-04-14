import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';

const SocialFeedScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [composerSymbol, setComposerSymbol] = useState('');
    const [posting, setPosting] = useState(false);

    // Comment modal
    const [commentModal, setCommentModal] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);

    const loadFeed = useCallback(async () => {
        try {
            const data = await stockAPI.getSocialFeed(50);
            setPosts(data.posts || []);
        } catch (e) {
            console.error('Feed load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadFeed(); }, [loadFeed]);

    const handlePost = async () => {
        const trimmed = composerText.trim();
        if (!trimmed) return;
        setPosting(true);
        try {
            await stockAPI.createPost(trimmed, composerSymbol.trim().toUpperCase() || undefined);
            setComposerText('');
            setComposerSymbol('');
            loadFeed();
        } catch { Alert.alert('Error', 'Failed to post.'); }
        finally { setPosting(false); }
    };

    const handleLike = async (postId: number) => {
        try {
            const result = await stockAPI.toggleLike(postId);
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, liked_by_me: result.liked, like_count: result.like_count } : p
            ));
        } catch { /* ignore */ }
    };

    const openComments = async (postId: number) => {
        setCommentModal(postId);
        setCommentsLoading(true);
        try {
            const data = await stockAPI.getComments(postId);
            setComments(data.comments || []);
        } catch { setComments([]); }
        finally { setCommentsLoading(false); }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !commentModal) return;
        try {
            const newComment = await stockAPI.addComment(commentModal, commentText.trim());
            setComments(prev => [...prev, newComment]);
            setCommentText('');
            // Update comment count in feed
            setPosts(prev => prev.map(p =>
                p.id === commentModal ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
            ));
        } catch { Alert.alert('Error', 'Failed to comment.'); }
    };

    const handleDelete = async (postId: number) => {
        Alert.alert('Delete Post', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await stockAPI.deletePost(postId);
                        setPosts(prev => prev.filter(p => p.id !== postId));
                    } catch { Alert.alert('Error', 'Failed to delete.'); }
                },
            },
        ]);
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
    };

    const renderPost = ({ item }: { item: any }) => (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.username}>@{item.username}</Text>
                    <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
                </View>
                {item.symbol && (
                    <TouchableOpacity style={styles.symbolBadge}
                        onPress={() => navigation?.navigate('StockDetail', { symbol: item.symbol })}>
                        <Text style={styles.symbolBadgeText}>${item.symbol}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.postContent}>{item.content}</Text>

            <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item.id)}>
                    <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
                    <Text style={styles.actionCount}>{item.comment_count || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
                    <Ionicons
                        name={item.liked_by_me ? 'heart' : 'heart-outline'}
                        size={18}
                        color={item.liked_by_me ? '#ef4444' : '#64748b'}
                    />
                    <Text style={[styles.actionCount, item.liked_by_me && { color: '#ef4444' }]}>
                        {item.like_count || 0}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#64748b" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Composer */}
            <View style={styles.composer}>
                <View style={styles.composerRow}>
                    <View style={[styles.avatar, styles.avatarSmall]}>
                        <Ionicons name="person" size={16} color="#fff" />
                    </View>
                    <TextInput
                        style={styles.composerInput}
                        placeholder="What's happening in the market?"
                        placeholderTextColor="#94a3b8"
                        value={composerText}
                        onChangeText={setComposerText}
                        multiline
                        maxLength={500}
                    />
                </View>
                <View style={styles.composerBottom}>
                    <TextInput
                        style={styles.symbolInput}
                        placeholder="$TICKER"
                        placeholderTextColor="#94a3b8"
                        value={composerSymbol}
                        onChangeText={setComposerSymbol}
                        autoCapitalize="characters"
                        maxLength={10}
                    />
                    <TouchableOpacity
                        style={[styles.postBtn, (!composerText.trim() || posting) && styles.postBtnDisabled]}
                        onPress={handlePost}
                        disabled={!composerText.trim() || posting}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.postBtnText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed */}
            <FlatList
                data={posts}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderPost}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
                    </View>
                }
                contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
            />

            {/* Comments Modal */}
            <Modal visible={commentModal !== null} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <TouchableOpacity onPress={() => { setCommentModal(null); setComments([]); setCommentText(''); }}>
                                <Ionicons name="close" size={24} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        {commentsLoading ? (
                            <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={comments}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => (
                                    <View style={styles.commentItem}>
                                        <Text style={styles.commentUser}>@{item.username}</Text>
                                        <Text style={styles.commentContent}>{item.content}</Text>
                                        <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                                    </View>
                                )}
                                ListEmptyComponent={<Text style={styles.emptyText}>No comments yet.</Text>}
                                style={{ flex: 1 }}
                            />
                        )}

                        <View style={styles.commentInputRow}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#94a3b8"
                                value={commentText}
                                onChangeText={setCommentText}
                                maxLength={280}
                            />
                            <TouchableOpacity onPress={handleComment} disabled={!commentText.trim()}>
                                <Ionicons name="send" size={22} color={commentText.trim() ? '#2563eb' : '#cbd5e1'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

    // Composer
    composer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    composerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    composerInput: { flex: 1, fontSize: 15, color: '#0f172a', minHeight: 40, maxHeight: 100, paddingTop: 8 },
    composerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    symbolInput: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#2563eb', fontWeight: '700', width: 90 },
    postBtn: { backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
    postBtnDisabled: { opacity: 0.5 },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Avatar
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
    avatarSmall: { width: 32, height: 32, borderRadius: 16 },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Post card
    postCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    username: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    timestamp: { fontSize: 12, color: '#94a3b8' },
    symbolBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    symbolBadgeText: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
    postContent: { fontSize: 15, color: '#1e293b', lineHeight: 22, marginBottom: 10 },

    // Actions
    postActions: { flexDirection: 'row', gap: 24, paddingTop: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionCount: { fontSize: 13, color: '#64748b', fontWeight: '600' },

    // Empty
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' },

    // Comment modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
    commentItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    commentUser: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    commentContent: { fontSize: 14, color: '#475569', marginTop: 2 },
    commentTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    commentInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#0f172a' },
});

export default SocialFeedScreen;
