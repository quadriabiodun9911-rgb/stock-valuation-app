import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stockAPI, DCFParams } from '../services/api';

interface Props {
    route: any;
    navigation: any;
}

const ValuationSimplified: React.FC<Props> = ({ route, navigation }) => {
    const { symbol = '', stockInfo } = route.params || {};
    const [activeTab, setActiveTab] = useState<'eps' | 'dcf'>('eps');
    const [loading, setLoading] = useState(false);

    // EPS × P/E Calculator
    const [eps, setEps] = useState('');
    const [pe, setPe] = useState('');
    const epsPePrice = useMemo(() => {
        const e = parseFloat(eps);
        const p = parseFloat(pe);
        return e && p && e > 0 && p > 0 ? e * p : null;
    }, [eps, pe]);

    // Quick DCF (simplified)
    const [fcf, setFcf] = useState('');
    const [growthRate, setGrowthRate] = useState('5');
    const [discountRate, setDiscountRate] = useState('10');
    const [terminalGrowth, setTerminalGrowth] = useState('3');
    const [shareCount, setShareCount] = useState('');
    const [dcfPrice, setDcfPrice] = useState<number | null>(null);

    const calculateQuickDCF = () => {
        const fcfVal = parseFloat(fcf);
        const growthVal = parseFloat(growthRate) / 100;
        const discountVal = parseFloat(discountRate) / 100;
        const terminalVal = parseFloat(terminalGrowth) / 100;
        const sharesVal = parseFloat(shareCount);

        // Validate all inputs are numbers
        if (isNaN(fcfVal) || isNaN(growthVal) || isNaN(discountVal) || isNaN(terminalVal) || isNaN(sharesVal)) {
            Alert.alert('Invalid Input', 'Please enter valid numbers for all fields.');
            return;
        }

        if (fcfVal <= 0 || sharesVal <= 0) {
            Alert.alert('Invalid Input', 'FCF and share count must be greater than zero.');
            return;
        }

        if (discountVal <= growthVal) {
            Alert.alert('Invalid Rates', 'Discount rate must be higher than growth rate.');
            return;
        }

        if (discountVal <= terminalVal) {
            Alert.alert('Invalid Rates', 'Discount rate must be higher than terminal growth rate.');
            return;
        }

        try {
            setLoading(true);
            
            // Simple 5-year DCF calculation
            const years = 5;
            let presentValueSum = 0;

            // Calculate present value of FCF for 5 years
            for (let year = 1; year <= years; year++) {
                const projectedFCF = fcfVal * Math.pow(1 + growthVal, year);
                const discountFactor = Math.pow(1 + discountVal, year);
                const presentValue = projectedFCF / discountFactor;
                presentValueSum += presentValue;
            }

            // Calculate terminal value
            const terminalYearFCF = fcfVal * Math.pow(1 + growthVal, years + 1);
            const terminalValue = terminalYearFCF / (discountVal - terminalVal);
            const presentTerminalValue = terminalValue / Math.pow(1 + discountVal, years);

            // Total enterprise value
            const totalValue = presentValueSum + presentTerminalValue;

            // Price per share (FCF in millions, shares in millions)
            const pricePerShare = totalValue / sharesVal;
            
            // Check if result is valid
            if (isNaN(pricePerShare) || !isFinite(pricePerShare)) {
                Alert.alert('Calculation Error', 'Unable to calculate valuation. Please check your rates.');
                setLoading(false);
                return;
            }
            
            setDcfPrice(pricePerShare);
        } catch (error) {
            Alert.alert('Error', 'Failed to calculate DCF valuation. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{symbol || 'Quick Calculator'}</Text>
                    <Text style={styles.headerPrice}>
                        {stockInfo?.price ? `₦${stockInfo.price.toFixed(2)}` : 'Enter values below'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => symbol ? navigation.navigate('ValuationFull', { symbol, stockInfo }) : null}>
                    <Ionicons name="cog" size={24} color={symbol ? "white" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Quick Tip */}
                <View style={styles.tipCard}>
                    <Ionicons name="bulb" size={20} color="#FF9500" />
                    <Text style={styles.tipText}>
                        {activeTab === 'eps'
                            ? 'EPS × P/E gives quick target price'
                            : 'DCF values stock based on future cash flows'}
                    </Text>
                </View>

                {/* Tab Selector */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'eps' && styles.tabActive]}
                        onPress={() => setActiveTab('eps')}
                    >
                        <Ionicons
                            name="calculator"
                            size={18}
                            color={activeTab === 'eps' ? '#007AFF' : '#999'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'eps' && styles.tabTextActive,
                            ]}
                        >
                            EPS × P/E
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'dcf' && styles.tabActive]}
                        onPress={() => setActiveTab('dcf')}
                    >
                        <Ionicons
                            name="trending-up"
                            size={18}
                            color={activeTab === 'dcf' ? '#007AFF' : '#999'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'dcf' && styles.tabTextActive,
                            ]}
                        >
                            Quick DCF
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* EPS × P/E Tab */}
                {activeTab === 'eps' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Target Price Calculator</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Earnings Per Share (EPS)</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="cash" size={20} color="#667eea" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 2.50"
                                    keyboardType="decimal-pad"
                                    value={eps}
                                    onChangeText={setEps}
                                    placeholderTextColor="#ccc"
                                />
                            </View>
                            <Text style={styles.hint}>Annual earnings per share</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Price-to-Earnings Ratio (P/E)</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="bar-chart" size={20} color="#667eea" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 15.00"
                                    keyboardType="decimal-pad"
                                    value={pe}
                                    onChangeText={setPe}
                                    placeholderTextColor="#ccc"
                                />
                            </View>
                            <Text style={styles.hint}>Market price-to-earnings multiple</Text>
                        </View>

                        {epsPePrice !== null && (
                            <LinearGradient
                                colors={['#34C759', '#00A86B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.resultCard}
                            >
                                <Text style={styles.resultLabel}>Target Price</Text>
                                <Text style={styles.resultValue}>
                                    ₦{epsPePrice.toFixed(2)}
                                </Text>
                                <View style={styles.resultDivider} />
                                <Text style={styles.resultFormula}>EPS × P/E = {eps} × {pe}</Text>
                                <View style={styles.compareRow}>
                                    <View>
                                        <Text style={styles.compareLabel}>Current Price</Text>
                                        <Text style={styles.compareValue}>
                                            ₦{stockInfo?.price?.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.compareArrow}>
                                        <Ionicons
                                            name={
                                                epsPePrice > (stockInfo?.price || 0)
                                                    ? 'arrow-up'
                                                    : 'arrow-down'
                                            }
                                            size={24}
                                            color="white"
                                        />
                                    </View>
                                    <View style={styles.compareRightAlign}>
                                        <Text style={styles.compareLabel}>Difference</Text>
                                        <Text style={styles.compareValue}>
                                            ₦
                                            {(
                                                epsPePrice - (stockInfo?.price || 0)
                                            ).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        )}
                    </View>
                )}

                {/* DCF Tab */}
                {activeTab === 'dcf' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Quick DCF Valuation</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Free Cash Flow (Annual)</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="cash-outline" size={20} color="#667eea" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="in millions"
                                    keyboardType="decimal-pad"
                                    value={fcf}
                                    onChangeText={setFcf}
                                    placeholderTextColor="#ccc"
                                />
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Growth Rate (%)</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="5"
                                        keyboardType="decimal-pad"
                                        value={growthRate}
                                        onChangeText={setGrowthRate}
                                        placeholderTextColor="#ccc"
                                    />
                                    <Text style={styles.suffix}>%</Text>
                                </View>
                            </View>

                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Discount Rate (%)</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="10"
                                        keyboardType="decimal-pad"
                                        value={discountRate}
                                        onChangeText={setDiscountRate}
                                        placeholderTextColor="#ccc"
                                    />
                                    <Text style={styles.suffix}>%</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Terminal Growth (%)</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="3"
                                        keyboardType="decimal-pad"
                                        value={terminalGrowth}
                                        onChangeText={setTerminalGrowth}
                                        placeholderTextColor="#ccc"
                                    />
                                    <Text style={styles.suffix}>%</Text>
                                </View>
                            </View>

                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Share Count (M)</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="millions"
                                        keyboardType="decimal-pad"
                                        value={shareCount}
                                        onChangeText={setShareCount}
                                        placeholderTextColor="#ccc"
                                    />
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.calculateButton}
                            onPress={calculateQuickDCF}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="calculator" size={20} color="white" />
                                    <Text style={styles.calculateButtonText}>Calculate Valuation</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {dcfPrice !== null && (
                            <LinearGradient
                                colors={['#007AFF', '#0051D5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.resultCard}
                            >
                                <Text style={styles.resultLabel}>Fair Value Per Share</Text>
                                <Text style={styles.resultValue}>₦{dcfPrice.toFixed(2)}</Text>
                                <View style={styles.resultDivider} />
                                <View style={styles.compareRow}>
                                    <View>
                                        <Text style={styles.compareLabel}>Current Price</Text>
                                        <Text style={styles.compareValue}>
                                            ₦{stockInfo?.price?.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.compareArrow}>
                                        <Ionicons
                                            name={
                                                dcfPrice > (stockInfo?.price || 0)
                                                    ? 'arrow-up'
                                                    : 'arrow-down'
                                            }
                                            size={24}
                                            color="white"
                                        />
                                    </View>
                                    <View style={styles.compareRightAlign}>
                                        <Text style={styles.compareLabel}>
                                            {dcfPrice > (stockInfo?.price || 0)
                                                ? 'Upside'
                                                : 'Downside'}
                                        </Text>
                                        <Text style={styles.compareValue}>
                                            {(
                                                ((dcfPrice -
                                                    (stockInfo?.price || 0)) /
                                                    (stockInfo?.price || 1)) *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        )}
                    </View>
                )}

                <View style={styles.footer} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
    },
    headerContent: {
        flex: 1,
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
    },
    headerPrice: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500',
    },
    tipText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 12,
        flex: 1,
        lineHeight: 18,
    },
    tabs: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    tabActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#999',
    },
    tabTextActive: {
        color: '#007AFF',
    },
    tabContent: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 14,
        color: '#1a1a1a',
    },
    suffix: {
        fontSize: 13,
        color: '#999',
        fontWeight: '600',
    },
    hint: {
        fontSize: 11,
        color: '#999',
        marginTop: 6,
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    calculateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 14,
        marginTop: 8,
        gap: 8,
    },
    calculateButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    resultCard: {
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    resultLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 8,
    },
    resultValue: {
        fontSize: 32,
        fontWeight: '700',
        color: 'white',
    },
    resultDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginVertical: 12,
    },
    resultFormula: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 12,
    },
    compareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compareLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    compareValue: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },
    compareArrow: {
        alignItems: 'center',
        marginHorizontal: 8,
    },
    compareRightAlign: {
        alignItems: 'flex-end',
    },
    footer: {
        height: 20,
    },
});

export default ValuationSimplified;
