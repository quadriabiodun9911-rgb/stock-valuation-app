import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TooltipProps {
    text: string;
    title?: string;
    position?: 'top' | 'bottom';
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
    text,
    title,
    position = 'top',
    children,
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7}>
                {children}
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.tooltipContainer}>
                        {title && <Text style={styles.tooltipTitle}>{title}</Text>}
                        <Text style={styles.tooltipText}>{text}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setVisible(false)}
                        >
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

interface InfoCardProps {
    icon: string;
    title: string;
    description: string;
    backgroundColor?: string;
    textColor?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
    icon,
    title,
    description,
    backgroundColor = '#E3F2FD',
    textColor = '#1976D2',
}) => {
    return (
        <View style={[styles.infoCard, { backgroundColor }]}>
            <Ionicons name={icon as any} size={24} color={textColor} />
            <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: textColor }]}>{title}</Text>
                <Text style={[styles.infoDescription, { color: textColor }]}>
                    {description}
                </Text>
            </View>
        </View>
    );
};

interface HelpButtonProps {
    onPress: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onPress }) => (
    <TouchableOpacity
        style={styles.helpButton}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Ionicons name="help-circle" size={20} color="#007AFF" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    tooltipContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        maxWidth: '85%',
    },
    tooltipTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
    },
    tooltipText: {
        fontSize: 13,
        color: '#e5e5e5',
        lineHeight: 18,
        marginBottom: 12,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 4,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
    },
    infoContent: {
        marginLeft: 12,
        flex: 1,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoDescription: {
        fontSize: 11,
        lineHeight: 16,
    },
    helpButton: {
        padding: 8,
    },
});
