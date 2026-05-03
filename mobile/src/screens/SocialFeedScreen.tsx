import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView,
    Platform, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Parse $TICKER mentions in post text and return mixed Text/TouchableOpacity nodes
const renderMentions = (content: string, onPress: (sym: string) => void) => {
    const parts = content.split(/(\$[A-Z]{1,5})/g);
    return parts.map((part, i) => {
        const match = /^\$([A-Z]{1,5})$/.exec(part);
        if (match) {
            return (
                <Text
                    key={i}
                    style={styles.mentionTag}
                    onPress={() => onPress(match[1])}
                >
                    {part}
                </Text>
            );
        }
        return <Text key={i} style={styles.postContentInline}>{part}</Text>;
    });
};

const SocialFeedScreen: React.FC<{ navigation?: any; filterSymbol?: string }> = ({ navigation, filterSymbol }) => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [composerText, setComposerText] = useState('');
    const [composerSymbol, setComposerSymbol] = useState(filterSymbol || '');
    const [posting, setPosting] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(filterSymbol || null);
    const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
    const [followLoading, setFollowLoading] = useState<Record<number, boolean>>({});

    // Comment modal
    const [commentModal, setCommentModal] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Derive unique symbols from posts for filter chips
    const symbolChips = useMemo(() => {
        const seen = new Set<string>();
        const chips: string[] = [];
        for (const p of posts) {
            if (p.symbol && !seen.has(p.symbol)) {
                seen.add(p.symbol);
                chips.push(p.symbol);
            }
        }
        return chips.slice(0, 12);
    }, [posts]);

    // Filtered posts
    const displayedPosts = useMemo(() => {
        if (!activeFilter) return posts;
        return posts.filter(p => p.symbol === activeFilter);
    }, [posts, activeFilter]);

    const loadFeed = useCallback(async () => {
        try {
            const data = await stockAPI.getSocialFeed(50, 0, filterSymbol);
            setPosts(data.posts || []);
        } catch (e) {
            console.error('Feed load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterSymbol]);

    useEffect(() => { loadFeed(); }, [loadFeed]);

    const handlePost = async () => {
        const trimmed = composerText.trim();
        if (!trimmed) return;
        // Auto-detect $TICKER in the text if no explicit symbol was entered
        let sym = composerSymbol.trim().toUpperCase() || undefined;
        if (!sym) {
            const m = /\$([A-Z]{1,5})/.exec(trimmed.toUpperCase());
            if (m) sym = m[1];
        }
        setPosting(true);
        try {
            await stockAPI.createPost(trimmed, sym);
            setComposerText('');
            setComposerSymbol('');
            loadFeed();
        } catch { Alert.alert('Error', 'Failed to post.'); }
        finally { setPosting(false); }
    };

    const handleFollow = async (postUserId: number) => {
        if (!postUserId || postUserId === (user as any)?.id) return;
        const isNowFollowing = !followingMap[postUserId];
        setFollowLoading(prev => ({ ...prev, [postUserId]: true }));
        setFollowingMap(prev => ({ ...prev, [postUserId]: isNowFollowing }));
        try {
            if (isNowFollowing) {
                await stockAPI.followUser(postUserId);
            } else {
                await stockAPI.unfollowUser(postUserId);
            }
        } catch {
            // Revert on error
            setFollowingMap(prev => ({ ...prev, [postUserId]: !isNowFollowing }));
        } finally {
            setFollowLoading(prev => ({ ...prev, [postUserId]: false }));
        }
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

    const renderPost = ({ item }: { item: any }) => {
        const isOwnPost = item.user_id === (user as any)?.id;
        const isFollowing = followingMap[item.user_id];
        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                            <Text style={styles.username}>@{item.username}</Text>
                            <Text style={styles.dot}>·</Text>
                            <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
                        </View>
                    </View>
                    {!isOwnPost && (
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                            onPress={() => handleFollow(item.user_id)}
                            disabled={followLoading[item.user_id]}
                        >
                            {followLoading[item.user_id] ? (
                                <ActivityIndicator size="small" color={isFollowing ? '#2563eb' : '#fff'} />
                            ) : (
                                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                    {item.symbol && (
                        <TouchableOpacity style={styles.symbolBadge}
                            onPress={() => navigation?.navigate('StockDetail', { symbol: item.symbol })}>
                            <Ionicons name="trending-up" size={12} color="#2563eb" />
                            <Text style={styles.symbolBadgeText}>${item.symbol}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.postContent}>
                    {renderMentions(item.content, (sym) => navigation?.navigate('StockDetail', { symbol: sym }))}
                </Text>

                <View style={styles.postActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item.id)} activeOpacity={0.6}>
                        <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
                        <Text style={styles.actionCount}>{item.comment_count || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)} activeOpacity={0.6}>
                        <Ionicons
                            name={item.liked_by_me ? 'heart' : 'heart-outline'}
                            size={18}
                            color={item.liked_by_me ? '#ef4444' : '#64748b'}
                        />
                        <Text style={[styles.actionCount, item.liked_by_me && { color: '#ef4444' }]}>
                            {item.like_count || 0}
                        </Text>
                    </TouchableOpacity>

                    {isOwnPost && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.6}>
                            <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const handleBack = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }
        navigation?.navigate?.('MainTabs');
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
            {!filterSymbol && (
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle}>Community Feed</Text>
                    <View style={styles.headerSpacer} />
                </View>
            )}
            {!filterSymbol && (
                <View style={styles.communityBanner}>
                    <Text style={styles.communityTitle}>Grow together</Text>
                    <Text style={styles.communityText}>Share ideas, ask questions, and help each other build better money habits and long-term financial freedom. Type <Text style={{ fontWeight: '800', color: '#2563eb' }}>$AAPL</Text> in your post to link a stock.</Text>
                </View>
            )}

            {/* Composer */}
            <View style={styles.composer}>
                <View style={styles.composerRow}>
                    <View style={[styles.avatar, styles.avatarSmall]}>
                        {user?.username ? (
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{user.username[0].toUpperCase()}</Text>
                        ) : (
                            <Ionicons name="person" size={16} color="#fff" />
                        )}
                    </View>
                    <TextInput
                        style={styles.composerInput}
                        placeholder={filterSymbol ? `Share your take on $${filterSymbol}…` : 'Share a lesson, question, or idea — use $AAPL to tag a stock'}
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

            {/* Symbol filter chips */}
            {symbolChips.length > 0 && !filterSymbol && (
                <View style={styles.filterBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity
                            style={[styles.filterChip, !activeFilter && styles.filterChipActive]}
                            onPress={() => setActiveFilter(null)}
                        >
                            <Text style={[styles.filterChipText, !activeFilter && styles.filterChipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {symbolChips.map(sym => (
                            <TouchableOpacity
                                key={sym}
                                style={[styles.filterChip, activeFilter === sym && styles.filterChipActive]}
                                onPress={() => setActiveFilter(activeFilter === sym ? null : sym)}
                            >
                                <Text style={[styles.filterChipText, activeFilter === sym && styles.filterChipTextActive]}>${sym}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Feed */}
            <FlatList
                data={displayedPosts}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderPost}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={52} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>
                            {activeFilter ? `No posts about $${activeFilter} yet` : 'Be the first to share'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeFilter
                                ? `Share your take on $${activeFilter} — tag it in your post above.`
                                : 'Share a lesson, ask a question, or post an investment idea.\nType $AAPL in your post to link a stock.'}
                        </Text>
                    </View>
                }
                contentContainerStyle={displayedPosts.length === 0 ? { flex: 1 } : undefined}
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
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    topBar: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSpacer: {
        width: 36,
        height: 36,
    },
    communityBanner: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#dbeafe',
    },
    communityTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#312e81',
        marginBottom: 4,
    },
    communityText: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 19,
    },

    // Composer
    composer: {
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
        borderBottomWidth: 0, marginBottom: 2,
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    composerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    composerInput: { flex: 1, fontSize: 15, color: '#0f172a', minHeight: 40, maxHeight: 100, paddingTop: 8 },
    composerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    symbolInput: {
        backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
        fontSize: 13, color: '#2563eb', fontWeight: '800', width: 100, borderWidth: 1, borderColor: '#dbeafe',
    },
    postBtn: { backgroundColor: '#2563eb', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 10 },
    postBtnDisabled: { opacity: 0.4 },
    postBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    // Avatar
    avatar: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563eb',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
    },
    avatarSmall: { width: 34, height: 34, borderRadius: 17 },
    avatarText: { color: '#fff', fontWeight: '900', fontSize: 17 },

    // Post card
    postCard: {
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16,
        marginHorizontal: 0, marginBottom: 1,
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    username: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    dot: { fontSize: 12, color: '#94a3b8' },
    timestamp: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
    symbolBadge: {
        backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#dbeafe',
    },
    symbolBadgeText: { color: '#2563eb', fontWeight: '800', fontSize: 13 },
    postContent: { fontSize: 15, color: '#1e293b', lineHeight: 23, marginBottom: 12, marginLeft: 54, flexDirection: 'row', flexWrap: 'wrap' },

    // Actions
    postActions: { flexDirection: 'row', gap: 28, paddingTop: 6, marginLeft: 54 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount: { fontSize: 13, color: '#64748b', fontWeight: '700' },

    // Empty
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: '#475569', marginTop: 16, textAlign: 'center' },
    emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center', lineHeight: 21, fontWeight: '500' },

    // Filter bar
    filterBar: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    filterScroll: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    filterChipTextActive: {
        color: '#fff',
    },

    // Follow button
    followBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: '#2563eb',
        marginRight: 6,
    },
    followBtnActive: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#2563eb',
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    followBtnTextActive: {
        color: '#2563eb',
    },

    // Mention tag
    mentionTag: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 15,
    },
    postContentInline: {
        fontSize: 15,
        color: '#1e293b',
        lineHeight: 23,
    },

    // Comment modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    commentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    commentUser: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
    commentContent: { fontSize: 14, color: '#475569', marginTop: 3, lineHeight: 20 },
    commentTime: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
    commentInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#e2e8f0',
    },
    commentInput: {
        flex: 1, backgroundColor: '#f1f5f9', borderRadius: 22, paddingHorizontal: 16,
        paddingVertical: 10, fontSize: 14, color: '#0f172a',
    },
});

export default SocialFeedScreen;
