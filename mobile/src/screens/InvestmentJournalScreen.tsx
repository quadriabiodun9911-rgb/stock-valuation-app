import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import UnifiedLoading from '../components/UnifiedLoading';

type JournalAction = 'buy' | 'hold' | 'sell';
type HistoryFilter = 'all' | JournalAction;
type DateRangeFilter = 'this-month' | 'last-3-months' | 'all-time';
type StrategyType = 'value' | 'momentum' | 'breakout' | 'mean-reversion' | 'event-driven' | 'other';
type TradeOutcome = 'open' | 'win' | 'loss';

type JournalEntry = {
    id: string;
    action: JournalAction;
    symbol: string;
    reason: string;
    createdAt: string;
    strategyType?: StrategyType;
    outcome?: TradeOutcome;
};

const JOURNAL_STORAGE_KEY = 'sv_investment_journal_records_v1';
const JOURNAL_UI_STORAGE_KEY = 'sv_investment_journal_ui_v1';

type JournalUiState = {
    selectedAction: JournalAction;
    symbol: string;
    reason: string;
    coreThesis: string;
    entryTrigger: string;
    riskPlan: string;
    exitOrReviewPlan: string;
    timeHorizon: string;
    searchQuery: string;
    historyFilter: HistoryFilter;
    dateRangeFilter: DateRangeFilter;
    strategyType: StrategyType;
    outcome: TradeOutcome;
};

const ACTIONS: Array<{ key: JournalAction; label: string; icon: string; color: string }> = [
    { key: 'buy', label: 'Buy', icon: 'trending-up-outline', color: '#22c55e' },
    { key: 'hold', label: 'Hold', icon: 'pause-circle-outline', color: '#60a5fa' },
    { key: 'sell', label: 'Sell', icon: 'trending-down-outline', color: '#f87171' },
];

const STRATEGY_TYPES: Array<{ key: StrategyType; label: string }> = [
    { key: 'value', label: 'Value' },
    { key: 'momentum', label: 'Momentum' },
    { key: 'breakout', label: 'Breakout' },
    { key: 'mean-reversion', label: 'Mean Reversion' },
    { key: 'event-driven', label: 'Event Driven' },
    { key: 'other', label: 'Other' },
];

const OUTCOME_TYPES: Array<{ key: TradeOutcome; label: string }> = [
    { key: 'open', label: 'Open' },
    { key: 'win', label: 'Win' },
    { key: 'loss', label: 'Loss' },
];

const InvestmentJournalScreen: React.FC = () => {
    const [selectedAction, setSelectedAction] = useState<JournalAction>('buy');
    const [symbol, setSymbol] = useState('');
    const [reason, setReason] = useState('');
    const [coreThesis, setCoreThesis] = useState('');
    const [entryTrigger, setEntryTrigger] = useState('');
    const [riskPlan, setRiskPlan] = useState('');
    const [exitOrReviewPlan, setExitOrReviewPlan] = useState('');
    const [timeHorizon, setTimeHorizon] = useState('');
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all-time');
    const [strategyType, setStrategyType] = useState<StrategyType>('value');
    const [outcome, setOutcome] = useState<TradeOutcome>('open');
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<'error' | 'success' | 'info'>('info');
    const [uiHydrated, setUiHydrated] = useState(false);

    const selectedActionMeta = useMemo(
        () => ACTIONS.find((item) => item.key === selectedAction) || ACTIONS[0],
        [selectedAction]
    );

    const filteredEntries = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        return entries.filter((entry) => {
            const entryDate = new Date(entry.createdAt);
            const matchesFilter = historyFilter === 'all' || entry.action === historyFilter;
            const matchesQuery =
                !normalizedQuery ||
                entry.symbol.toLowerCase().includes(normalizedQuery) ||
                entry.reason.toLowerCase().includes(normalizedQuery);
            const matchesDateRange =
                dateRangeFilter === 'all-time' ||
                (dateRangeFilter === 'this-month' && entryDate >= monthStart) ||
                (dateRangeFilter === 'last-3-months' && entryDate >= threeMonthsAgo);

            return matchesFilter && matchesQuery && matchesDateRange;
        });
    }, [entries, historyFilter, searchQuery, dateRangeFilter]);

    const monthlyInsight = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthEntries = entries.filter((entry) => {
            const entryDate = new Date(entry.createdAt);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });

        const actionCounts: Record<JournalAction, number> = { buy: 0, hold: 0, sell: 0 };
        const symbolCounts: Record<string, number> = {};

        monthEntries.forEach((entry) => {
            actionCounts[entry.action] += 1;
            symbolCounts[entry.symbol] = (symbolCounts[entry.symbol] || 0) + 1;
        });

        let topSymbol = 'N/A';
        let topSymbolCount = 0;

        Object.entries(symbolCounts).forEach(([asset, count]) => {
            if (count > topSymbolCount) {
                topSymbol = asset;
                topSymbolCount = count;
            }
        });

        const dominantAction = (Object.keys(actionCounts) as JournalAction[]).reduce((best, next) =>
            actionCounts[next] > actionCounts[best] ? next : best
            , 'buy');

        return {
            monthLabel: now.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
            total: monthEntries.length,
            actionCounts,
            topSymbol,
            topSymbolCount,
            dominantAction,
        };
    }, [entries]);

    const strategyOutcomeInsights = useMemo(() => {
        const grouped: Record<StrategyType, { wins: number; losses: number; open: number }> = {
            value: { wins: 0, losses: 0, open: 0 },
            momentum: { wins: 0, losses: 0, open: 0 },
            breakout: { wins: 0, losses: 0, open: 0 },
            'mean-reversion': { wins: 0, losses: 0, open: 0 },
            'event-driven': { wins: 0, losses: 0, open: 0 },
            other: { wins: 0, losses: 0, open: 0 },
        };

        entries.forEach((entry) => {
            const strategy = entry.strategyType || 'other';
            const result = entry.outcome || 'open';
            if (result === 'win') grouped[strategy].wins += 1;
            if (result === 'loss') grouped[strategy].losses += 1;
            if (result === 'open') grouped[strategy].open += 1;
        });

        return STRATEGY_TYPES.map((item) => {
            const stats = grouped[item.key];
            const closed = stats.wins + stats.losses;
            const winRate = closed > 0 ? Math.round((stats.wins / closed) * 100) : null;
            return {
                strategy: item.label,
                wins: stats.wins,
                losses: stats.losses,
                open: stats.open,
                winRate,
            };
        }).filter((item) => item.wins + item.losses + item.open > 0);
    }, [entries]);

    useEffect(() => {
        const loadEntries = async () => {
            try {
                const [storedEntries, storedUi] = await Promise.all([
                    AsyncStorage.getItem(JOURNAL_STORAGE_KEY),
                    AsyncStorage.getItem(JOURNAL_UI_STORAGE_KEY),
                ]);

                if (storedEntries) {
                    const parsed = JSON.parse(storedEntries) as JournalEntry[];
                    if (Array.isArray(parsed)) {
                        setEntries(parsed);
                    }
                }

                if (storedUi) {
                    const parsedUi = JSON.parse(storedUi) as Partial<JournalUiState>;
                    if (parsedUi.selectedAction && ACTIONS.some((item) => item.key === parsedUi.selectedAction)) {
                        setSelectedAction(parsedUi.selectedAction);
                    }
                    if (typeof parsedUi.symbol === 'string') setSymbol(parsedUi.symbol);
                    if (typeof parsedUi.reason === 'string') setReason(parsedUi.reason);
                    if (typeof parsedUi.coreThesis === 'string') setCoreThesis(parsedUi.coreThesis);
                    if (typeof parsedUi.entryTrigger === 'string') setEntryTrigger(parsedUi.entryTrigger);
                    if (typeof parsedUi.riskPlan === 'string') setRiskPlan(parsedUi.riskPlan);
                    if (typeof parsedUi.exitOrReviewPlan === 'string') setExitOrReviewPlan(parsedUi.exitOrReviewPlan);
                    if (typeof parsedUi.timeHorizon === 'string') setTimeHorizon(parsedUi.timeHorizon);
                    if (typeof parsedUi.searchQuery === 'string') setSearchQuery(parsedUi.searchQuery);
                    if (parsedUi.historyFilter && (parsedUi.historyFilter === 'all' || ACTIONS.some((item) => item.key === parsedUi.historyFilter))) {
                        setHistoryFilter(parsedUi.historyFilter);
                    }
                    if (parsedUi.dateRangeFilter && ['this-month', 'last-3-months', 'all-time'].includes(parsedUi.dateRangeFilter)) {
                        setDateRangeFilter(parsedUi.dateRangeFilter as DateRangeFilter);
                    }
                    if (parsedUi.strategyType && STRATEGY_TYPES.some((item) => item.key === parsedUi.strategyType)) {
                        setStrategyType(parsedUi.strategyType);
                    }
                    if (parsedUi.outcome && OUTCOME_TYPES.some((item) => item.key === parsedUi.outcome)) {
                        setOutcome(parsedUi.outcome);
                    }
                }
            } catch (error) {
                console.error('Unable to load journal entries:', error);
                setStatusType('error');
                setStatusMessage('Unable to load journal history right now.');
            } finally {
                setUiHydrated(true);
                setIsLoading(false);
            }
        };

        loadEntries();
    }, []);

    const persistEntries = async (nextEntries: JournalEntry[]) => {
        setEntries(nextEntries);
        await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(nextEntries));
    };

    useEffect(() => {
        if (!uiHydrated) return;

        const uiState: JournalUiState = {
            selectedAction,
            symbol,
            reason,
            coreThesis,
            entryTrigger,
            riskPlan,
            exitOrReviewPlan,
            timeHorizon,
            searchQuery,
            historyFilter,
            dateRangeFilter,
            strategyType,
            outcome,
        };

        AsyncStorage.setItem(JOURNAL_UI_STORAGE_KEY, JSON.stringify(uiState)).catch((error) => {
            console.error('Unable to persist journal UI state:', error);
        });
    }, [
        uiHydrated,
        selectedAction,
        symbol,
        reason,
        coreThesis,
        entryTrigger,
        riskPlan,
        exitOrReviewPlan,
        timeHorizon,
        searchQuery,
        historyFilter,
        dateRangeFilter,
        strategyType,
        outcome,
    ]);

    const generateStrategyReason = () => {
        const cleanSymbol = symbol.trim().toUpperCase();

        if (!cleanSymbol) {
            setStatusType('error');
            setStatusMessage('Add an asset symbol first to generate strategy.');
            return;
        }

        if (!coreThesis.trim() || !entryTrigger.trim() || !riskPlan.trim() || !exitOrReviewPlan.trim()) {
            setStatusType('error');
            setStatusMessage('Complete the strategy room fields before generating.');
            return;
        }

        const generatedReason = [
            `Action: ${selectedAction.toUpperCase()} ${cleanSymbol}`,
            `Core thesis: ${coreThesis.trim()}`,
            `Trigger: ${entryTrigger.trim()}`,
            `Risk control: ${riskPlan.trim()}`,
            `${selectedAction === 'sell' ? 'Exit confirmation' : 'Review/exit plan'}: ${exitOrReviewPlan.trim()}`,
            `Time horizon: ${timeHorizon.trim() || 'Not specified'}`,
        ].join('\n');

        setReason(generatedReason);
        setStatusType('success');
        setStatusMessage('Strategy generated. Review and save to history.');
    };

    const addEntry = async () => {
        const cleanSymbol = symbol.trim().toUpperCase();
        const cleanReason = reason.trim();

        if (!cleanSymbol || !cleanReason) {
            setStatusType('error');
            setStatusMessage('Add both asset symbol and reason before saving.');
            return;
        }

        const newEntry: JournalEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            action: selectedAction,
            symbol: cleanSymbol,
            reason: cleanReason,
            createdAt: new Date().toISOString(),
            strategyType,
            outcome,
        };

        try {
            const nextEntries = [newEntry, ...entries];
            await persistEntries(nextEntries);
            setReason('');
            setCoreThesis('');
            setEntryTrigger('');
            setRiskPlan('');
            setExitOrReviewPlan('');
            setTimeHorizon('');
            setOutcome('open');
            setStatusType('success');
            setStatusMessage('Decision note saved to your history.');
        } catch (error) {
            console.error('Unable to save journal entry:', error);
            setStatusType('error');
            setStatusMessage('Save failed. Please retry.');
        }
    };

    const deleteEntry = async (entryId: string) => {
        try {
            const nextEntries = entries.filter((item) => item.id !== entryId);
            await persistEntries(nextEntries);
            setStatusType('info');
            setStatusMessage('Entry removed from history.');
        } catch (error) {
            console.error('Unable to delete journal entry:', error);
            setStatusType('error');
            setStatusMessage('Could not remove this entry.');
        }
    };

    const toCsvValue = (value: string) => {
        const escapedValue = value.replace(/"/g, '""');
        return `"${escapedValue}"`;
    };

    const exportFilteredAsJson = async () => {
        if (!filteredEntries.length) {
            setStatusType('info');
            setStatusMessage('No filtered records to export.');
            return;
        }

        try {
            const payload = JSON.stringify(filteredEntries, null, 2);
            await Share.share({
                title: 'Investment Journal JSON Export',
                message: payload,
            });
            setStatusType('success');
            setStatusMessage('JSON export opened in share sheet.');
        } catch (error) {
            console.error('Unable to export JSON:', error);
            setStatusType('error');
            setStatusMessage('JSON export failed.');
        }
    };

    const exportFilteredAsCsv = async () => {
        if (!filteredEntries.length) {
            setStatusType('info');
            setStatusMessage('No filtered records to export.');
            return;
        }

        try {
            const header = 'id,action,symbol,strategyType,outcome,reason,createdAt';
            const rows = filteredEntries.map((entry) =>
                [
                    toCsvValue(entry.id),
                    toCsvValue(entry.action),
                    toCsvValue(entry.symbol),
                    toCsvValue(entry.strategyType || 'other'),
                    toCsvValue(entry.outcome || 'open'),
                    toCsvValue(entry.reason),
                    toCsvValue(entry.createdAt),
                ].join(',')
            );

            const csvText = [header, ...rows].join('\n');

            await Share.share({
                title: 'Investment Journal CSV Export',
                message: csvText,
            });

            setStatusType('success');
            setStatusMessage('CSV export opened in share sheet.');
        } catch (error) {
            console.error('Unable to export CSV:', error);
            setStatusType('error');
            setStatusMessage('CSV export failed.');
        }
    };

    const renderEntry = ({ item }: { item: JournalEntry }) => {
        const actionMeta = ACTIONS.find((entry) => entry.key === item.action) || ACTIONS[0];

        return (
            <View style={styles.entryCard}>
                <View style={styles.entryHeader}>
                    <View style={[styles.actionBadge, { borderColor: actionMeta.color }]}>
                        <Ionicons name={actionMeta.icon as any} size={15} color={actionMeta.color} />
                        <Text style={[styles.actionBadgeText, { color: actionMeta.color }]}>
                            {actionMeta.label}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteEntry(item.id)} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={16} color="#fca5a5" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.entrySymbol}>{item.symbol}</Text>
                <View style={styles.entryMetaRow}>
                    <View style={styles.entryMetaChip}>
                        <Text style={styles.entryMetaText}>{(item.strategyType || 'other').toUpperCase()}</Text>
                    </View>
                    <View style={[styles.entryMetaChip, (item.outcome || 'open') === 'win' && styles.outcomeWin, (item.outcome || 'open') === 'loss' && styles.outcomeLoss]}>
                        <Text style={styles.entryMetaText}>{(item.outcome || 'open').toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.entryReason}>{item.reason}</Text>
                <Text style={styles.entryDate}>
                    {new Date(item.createdAt).toLocaleString()}
                </Text>
            </View>
        );
    };

    if (isLoading) {
        return <UnifiedLoading message="Loading journal..." fullScreen />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <View style={styles.headerSection}>
                        <Text style={styles.title}>Decision Journal</Text>
                        <Text style={styles.subtitle}>
                            Record why you buy, hold, or sell. Use this history to improve future decisions.
                        </Text>

                        <View style={styles.actionRow}>
                            {ACTIONS.map((item) => {
                                const selected = selectedAction === item.key;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[
                                            styles.actionChip,
                                            selected && {
                                                borderColor: item.color,
                                                backgroundColor: '#1f2937',
                                            },
                                        ]}
                                        onPress={() => setSelectedAction(item.key)}
                                    >
                                        <Ionicons name={item.icon as any} size={16} color={item.color} />
                                        <Text style={[styles.actionChipText, selected && { color: '#f8fafc' }]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.formCard}>
                            <Text style={styles.label}>Asset symbol or name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="AAPL, TSLA, BTC, Gold..."
                                placeholderTextColor="#94a3b8"
                                value={symbol}
                                onChangeText={setSymbol}
                                autoCapitalize="characters"
                            />

                            <View style={styles.strategyRoomCard}>
                                <View style={styles.strategyRoomHeader}>
                                    <Ionicons name="bulb-outline" size={16} color="#93c5fd" />
                                    <Text style={styles.strategyRoomTitle}>Strategy Room</Text>
                                </View>
                                <Text style={styles.strategyRoomSubtitle}>
                                    Build your tactic first, then generate a structured reason for long-term learning.
                                </Text>

                                <Text style={styles.label}>Core thesis</Text>
                                <TextInput
                                    style={[styles.input, styles.strategyInput]}
                                    placeholder="Why is this opportunity valid?"
                                    placeholderTextColor="#94a3b8"
                                    value={coreThesis}
                                    onChangeText={setCoreThesis}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Entry trigger or condition</Text>
                                <TextInput
                                    style={[styles.input, styles.strategyInput]}
                                    placeholder="What condition confirms buy/hold/sell action?"
                                    placeholderTextColor="#94a3b8"
                                    value={entryTrigger}
                                    onChangeText={setEntryTrigger}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Risk plan</Text>
                                <TextInput
                                    style={[styles.input, styles.strategyInput]}
                                    placeholder="Position sizing, stop level, or downside guard"
                                    placeholderTextColor="#94a3b8"
                                    value={riskPlan}
                                    onChangeText={setRiskPlan}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Exit / review plan</Text>
                                <TextInput
                                    style={[styles.input, styles.strategyInput]}
                                    placeholder="When will you exit or review this decision?"
                                    placeholderTextColor="#94a3b8"
                                    value={exitOrReviewPlan}
                                    onChangeText={setExitOrReviewPlan}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Time horizon (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: 2 weeks, 3 months, 1 year"
                                    placeholderTextColor="#94a3b8"
                                    value={timeHorizon}
                                    onChangeText={setTimeHorizon}
                                />

                                <TouchableOpacity style={styles.generateButton} onPress={generateStrategyReason}>
                                    <Ionicons name="sparkles-outline" size={16} color="#e0f2fe" />
                                    <Text style={styles.generateButtonText}>Generate Strategy Reason</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Reason for {selectedActionMeta.label.toLowerCase()}</Text>
                            <TextInput
                                style={[styles.input, styles.reasonInput]}
                                placeholder="Write your thesis, trigger, and risk view..."
                                placeholderTextColor="#94a3b8"
                                value={reason}
                                onChangeText={setReason}
                                multiline
                                textAlignVertical="top"
                            />

                            <Text style={styles.label}>Strategy type</Text>
                            <View style={styles.selectorRow}>
                                {STRATEGY_TYPES.map((item) => (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[styles.selectorChip, strategyType === item.key && styles.selectorChipActive]}
                                        onPress={() => setStrategyType(item.key)}
                                    >
                                        <Text style={styles.selectorChipText}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Outcome status</Text>
                            <View style={styles.selectorRow}>
                                {OUTCOME_TYPES.map((item) => (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[styles.selectorChip, outcome === item.key && styles.selectorChipActive]}
                                        onPress={() => setOutcome(item.key)}
                                    >
                                        <Text style={styles.selectorChipText}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {statusMessage ? (
                                <View
                                    style={[
                                        styles.statusBanner,
                                        statusType === 'error' && styles.statusError,
                                        statusType === 'success' && styles.statusSuccess,
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            statusType === 'error'
                                                ? 'alert-circle'
                                                : statusType === 'success'
                                                    ? 'checkmark-circle'
                                                    : 'information-circle'
                                        }
                                        size={16}
                                        color="#e2e8f0"
                                    />
                                    <Text style={styles.statusText}>{statusMessage}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity style={styles.saveButton} onPress={addEntry}>
                                <Ionicons name="save-outline" size={16} color="#ffffff" />
                                <Text style={styles.saveButtonText}>Save Record</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.insightCard}>
                            <View style={styles.insightHeader}>
                                <Ionicons name="trending-up-outline" size={18} color="#22d3ee" />
                                <Text style={styles.insightTitle}>Outcome Analytics by Strategy</Text>
                            </View>
                            {strategyOutcomeInsights.length ? (
                                strategyOutcomeInsights.map((item) => (
                                    <Text key={item.strategy} style={styles.insightText}>
                                        {item.strategy}: {item.wins}W / {item.losses}L / {item.open} Open
                                        {item.winRate === null ? ' • Win rate: n/a' : ` • Win rate: ${item.winRate}%`}
                                    </Text>
                                ))
                            ) : (
                                <Text style={styles.insightHint}>Add outcomes to your entries to measure what strategy types work best for you.</Text>
                            )}
                        </View>

                        <View style={styles.insightCard}>
                            <View style={styles.insightHeader}>
                                <Ionicons name="bar-chart-outline" size={18} color="#93c5fd" />
                                <Text style={styles.insightTitle}>Monthly Insight Summary</Text>
                            </View>
                            <Text style={styles.insightMonth}>{monthlyInsight.monthLabel}</Text>

                            {monthlyInsight.total > 0 ? (
                                <>
                                    <Text style={styles.insightText}>Entries recorded: {monthlyInsight.total}</Text>
                                    <Text style={styles.insightText}>
                                        Buy: {monthlyInsight.actionCounts.buy} • Hold: {monthlyInsight.actionCounts.hold} • Sell: {monthlyInsight.actionCounts.sell}
                                    </Text>
                                    <Text style={styles.insightText}>
                                        Most reviewed asset: {monthlyInsight.topSymbol} ({monthlyInsight.topSymbolCount} notes)
                                    </Text>
                                    <Text style={styles.insightHint}>
                                        Dominant behavior this month: {monthlyInsight.dominantAction.toUpperCase()}. Review whether this aligns with your risk plan.
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.insightHint}>
                                    No entries this month yet. Add notes to unlock trend insights.
                                </Text>
                            )}
                        </View>

                        <Text style={styles.historyTitle}>Historical Records</Text>
                        <View style={styles.historyToolsCard}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by asset or reason"
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />

                            <View style={styles.filterRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.historyFilterChip,
                                        historyFilter === 'all' && styles.historyFilterChipActive,
                                    ]}
                                    onPress={() => setHistoryFilter('all')}
                                >
                                    <Ionicons name="funnel-outline" size={14} color="#cbd5e1" />
                                    <Text style={styles.historyFilterText}>All</Text>
                                </TouchableOpacity>

                                {ACTIONS.map((item) => (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[
                                            styles.historyFilterChip,
                                            historyFilter === item.key && styles.historyFilterChipActive,
                                        ]}
                                        onPress={() => setHistoryFilter(item.key)}
                                    >
                                        <Ionicons name={item.icon as any} size={14} color={item.color} />
                                        <Text style={styles.historyFilterText}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.rangeRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.rangeChip,
                                        dateRangeFilter === 'this-month' && styles.rangeChipActive,
                                    ]}
                                    onPress={() => setDateRangeFilter('this-month')}
                                >
                                    <Text style={styles.rangeChipText}>This Month</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.rangeChip,
                                        dateRangeFilter === 'last-3-months' && styles.rangeChipActive,
                                    ]}
                                    onPress={() => setDateRangeFilter('last-3-months')}
                                >
                                    <Text style={styles.rangeChipText}>Last 3 Months</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.rangeChip,
                                        dateRangeFilter === 'all-time' && styles.rangeChipActive,
                                    ]}
                                    onPress={() => setDateRangeFilter('all-time')}
                                >
                                    <Text style={styles.rangeChipText}>All Time</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.historyCount}>
                                Showing {filteredEntries.length} of {entries.length} records
                            </Text>

                            <View style={styles.exportRow}>
                                <TouchableOpacity style={styles.exportButton} onPress={exportFilteredAsJson}>
                                    <Ionicons name="code-slash-outline" size={15} color="#e2e8f0" />
                                    <Text style={styles.exportButtonText}>Export JSON</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.exportButton} onPress={exportFilteredAsCsv}>
                                    <Ionicons name="document-text-outline" size={15} color="#e2e8f0" />
                                    <Text style={styles.exportButtonText}>Export CSV</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="book-outline" size={40} color="#64748b" />
                        <Text style={styles.emptyTitle}>
                            {entries.length ? 'No matching records' : 'No records yet'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {entries.length
                                ? 'Try a different filter or search term.'
                                : 'Save your first Buy/Hold/Sell reason to start your learning history.'}
                        </Text>
                    </View>
                }
                renderItem={renderEntry}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    headerSection: {
        marginBottom: 10,
    },
    title: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        marginBottom: 14,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        paddingHorizontal: 12,
        minHeight: 40,
        backgroundColor: '#111827',
    },
    actionChipText: {
        color: '#cbd5e1',
        fontWeight: '600',
        fontSize: 13,
    },
    formCard: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 14,
    },
    label: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        color: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    reasonInput: {
        minHeight: 96,
    },
    strategyInput: {
        minHeight: 70,
    },
    strategyRoomCard: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#0f172a',
    },
    strategyRoomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    strategyRoomTitle: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '700',
    },
    strategyRoomSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 6,
    },
    selectorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 2,
    },
    selectorChip: {
        minHeight: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        justifyContent: 'center',
        backgroundColor: '#0f172a',
    },
    selectorChipActive: {
        borderColor: '#0ea5e9',
        backgroundColor: '#082f49',
    },
    selectorChipText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    generateButton: {
        marginTop: 12,
        minHeight: 40,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#0c4a6e',
        backgroundColor: '#082f49',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    generateButtonText: {
        color: '#e0f2fe',
        fontSize: 13,
        fontWeight: '700',
    },
    statusBanner: {
        marginTop: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#1e293b',
    },
    statusError: {
        backgroundColor: '#7f1d1d',
    },
    statusSuccess: {
        backgroundColor: '#14532d',
    },
    statusText: {
        color: '#e2e8f0',
        fontSize: 13,
        flex: 1,
    },
    saveButton: {
        marginTop: 14,
        minHeight: 44,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    historyTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    insightCard: {
        marginTop: 14,
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 14,
        gap: 6,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    insightTitle: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
    },
    insightMonth: {
        color: '#cbd5e1',
        fontSize: 13,
        marginTop: 2,
    },
    insightText: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 18,
    },
    insightHint: {
        color: '#93c5fd',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    historyToolsCard: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 12,
        marginBottom: 12,
    },
    searchInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        color: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    historyFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 34,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        backgroundColor: '#0f172a',
    },
    historyFilterChipActive: {
        backgroundColor: '#1e293b',
        borderColor: '#475569',
    },
    historyFilterText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    historyCount: {
        marginTop: 10,
        color: '#94a3b8',
        fontSize: 12,
    },
    exportRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
    },
    exportButton: {
        flex: 1,
        minHeight: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    exportButtonText: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '700',
    },
    rangeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    rangeChip: {
        minHeight: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        justifyContent: 'center',
        backgroundColor: '#0f172a',
    },
    rangeChipActive: {
        backgroundColor: '#1e293b',
        borderColor: '#475569',
    },
    rangeChipText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        marginTop: 10,
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 20,
        alignItems: 'center',
    },
    emptyTitle: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 10,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 6,
    },
    entryCard: {
        backgroundColor: '#111827',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        padding: 12,
        marginBottom: 10,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 9,
        minHeight: 28,
        gap: 5,
        backgroundColor: '#0f172a',
    },
    actionBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    deleteButton: {
        minWidth: 34,
        minHeight: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    entrySymbol: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '700',
    },
    entryReason: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6,
    },
    entryMetaRow: {
        marginTop: 6,
        flexDirection: 'row',
        gap: 8,
    },
    entryMetaChip: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        paddingHorizontal: 8,
        minHeight: 24,
        justifyContent: 'center',
    },
    entryMetaText: {
        color: '#cbd5e1',
        fontSize: 10,
        fontWeight: '700',
    },
    outcomeWin: {
        borderColor: '#14532d',
        backgroundColor: '#052e16',
    },
    outcomeLoss: {
        borderColor: '#7f1d1d',
        backgroundColor: '#450a0a',
    },
    entryDate: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 8,
    },
});

export default InvestmentJournalScreen;
