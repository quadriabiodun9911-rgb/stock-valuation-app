import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const { theme, isDark } = useTheme();

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", onPress: () => logout(), style: 'destructive' }
            ]
        );
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        safeArea: { flex: 1 },
        header: {
            paddingTop: 30,
            paddingBottom: 20,
            paddingHorizontal: 20,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        headerTitle: { fontSize: 32, fontWeight: 'bold', color: theme.text },
        profileCard: {
            alignItems: 'center',
            margin: 20,
            padding: 25,
            backgroundColor: theme.card,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: isDark ? 0.1 : 0.05,
            shadowRadius: 15,
            elevation: 8,
        },
        userEmail: { fontSize: 20, fontWeight: '600', marginTop: 15, color: theme.text },
        userStatus: { fontSize: 16, color: '#3b82f6', marginTop: 8, fontWeight: 'bold' },
        menuContainer: { marginHorizontal: 20 },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            padding: 20,
            borderRadius: 15,
            marginBottom: 15,
        },
        menuItemText: { fontSize: 18, marginLeft: 20, color: theme.text, fontWeight: '500' },
        logoutButton: {
            margin: 20,
            marginTop: 30,
            backgroundColor: isDark ? '#4b5563' : '#ef4444',
            padding: 20,
            borderRadius: 15,
            alignItems: 'center',
        },
        logoutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    });

    const menuItems = [
        { icon: 'person-outline', text: 'Account Details' },
        { icon: 'settings-outline', text: 'App Settings' },
        { icon: 'notifications-outline', text: 'Notifications' },
        { icon: 'shield-checkmark-outline', text: 'Privacy & Security' },
        { icon: 'help-circle-outline', text: 'Help & Support' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>

                <View style={styles.profileCard}>
                    <Ionicons name="person-circle-outline" size={90} color={theme.text} />
                    <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                    <Text style={styles.userStatus}>Gold Member</Text>
                </View>

                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.menuItem}>
                            <Ionicons name={item.icon as any} size={26} color={theme.subtext} />
                            <Text style={styles.menuItemText}>{item.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;
