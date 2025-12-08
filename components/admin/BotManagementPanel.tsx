import React, { useState, useEffect } from 'react';
import {
    getBotSystemConfig,
    updateBotSystemConfig,
    generateBotUsers,
    activateBotsForWeek,
    deactivateAllBots,
    deleteAllBots,
    getBotLeaderboard,
    simulateBotActivity,
    getRealUserStats
} from '../../services/botService';
import { getLeaderboardAnalytics } from '../../services/leaderboardService';
import { BotSystemConfig, BotTier } from '../../types';
import { Timestamp } from 'firebase/firestore'; // NEW: Added Import

export const BotManagementPanel: React.FC = () => {
    const [config, setConfig] = useState<BotSystemConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [realUserStats, setRealUserStats] = useState<any>(null);
    const [botLeaderboard, setBotLeaderboard] = useState<any[]>([]);
    const [showBotList, setShowBotList] = useState(false);

    useEffect(() => {
        loadConfig();
        loadAnalytics();
        loadRealUserStats();
    }, []);

    const loadConfig = async () => {
        const cfg = await getBotSystemConfig();
        setConfig(cfg);
    };

    const loadAnalytics = async () => {
        const stats = await getLeaderboardAnalytics();
        setAnalytics(stats);
    };

    const loadRealUserStats = async () => {
        const stats = await getRealUserStats();
        setRealUserStats(stats);
    };

    const loadBotLeaderboard = async () => {
        const bots = await getBotLeaderboard();
        setBotLeaderboard(bots);
    };

    const handleToggleSystem = async () => {
        if (!config) return;
        setLoading(true);
        try {
            await updateBotSystemConfig({ enabled: !config.enabled });
            await loadConfig();
            alert(`Bot system ${!config.enabled ? 'enabled' : 'disabled'} successfully!`);
        } catch (error) {
            alert('Error toggling bot system');
        }
        setLoading(false);
    };

    const handleGenerateBots = async () => {
        if (!confirm('🛠️ This will RESET and REPAIR the bot system. It will delete old bots and create fresh ones. Continue?')) return;

        setLoading(true);
        try {
            // NUCLEAR OPTION: Clear everything to ensure ID match
            console.log('🗑️ Deleting old bots...');
            await deleteAllBots();

            console.log('🤖 Generating fresh bots...');
            await generateBotUsers();

            console.log('⚡ Activating bots...');
            await activateBotsForWeek();

            console.log('🎲 Simulating initial activity...');
            await simulateBotActivity();

            alert('✅ Success! Bots have been reset, activated, and synced. Please check the leaderboard now.');
            await loadAnalytics();
        } catch (error) {
            console.error(error);
            alert('❌ Error during fix process. Check console.');
        }
        setLoading(false);
    };

    const handleActivateBots = async () => {
        setLoading(true);
        try {
            await activateBotsForWeek();
            alert('✅ Bots activated based on tier schedule!');
            await loadAnalytics();
        } catch (error) {
            alert('❌ Error activating bots');
        }
        setLoading(false);
    };

    const handleDeactivateBots = async () => {
        if (!confirm('This will reset all bot coins to 0. Continue?')) return;

        setLoading(true);
        try {
            await deactivateAllBots();
            alert('✅ All bots deactivated!');
            await loadAnalytics();
        } catch (error) {
            alert('❌ Error deactivating bots');
        }
        setLoading(false);
    };

    const handleSimulateBotActivity = async () => {
        setLoading(true);
        try {
            // Update timestamp so auto-system knows it just ran
            await updateBotSystemConfig({ lastGlobalUpdate: Timestamp.now() });

            await simulateBotActivity();
            alert('✅ Bot activity simulated & Timer Reset!');
            await loadAnalytics();
            await loadBotLeaderboard();
        } catch (error) {
            alert('❌ Error simulating bot activity');
        }
        setLoading(false);
    };

    const handleDeleteAllBots = async () => {
        if (!confirm('⚠️ This will DELETE all bot users permanently. Continue?')) return;

        setLoading(true);
        try {
            await deleteAllBots();
            alert('✅ All bots deleted!');
            await loadAnalytics();
            setBotLeaderboard([]);
        } catch (error) {
            alert('❌ Error deleting bots');
        }
        setLoading(false);
    };

    const handleRefresh = () => {
        loadConfig();
        loadAnalytics();
        loadRealUserStats();
        if (showBotList) {
            loadBotLeaderboard();
        }
    };

    if (!config) {
        return <div style={styles.loading}>Loading bot configuration...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>🤖 Bot Management System</h2>
                <button onClick={handleRefresh} style={styles.refreshBtn}>
                    🔄 Refresh
                </button>
            </div>

            {/* System Status */}
            <div style={styles.statusCard}>
                <div style={styles.statusHeader}>
                    <h3>System Status</h3>
                    <div style={styles.statusIndicator}>
                        <span style={{
                            ...styles.statusDot,
                            backgroundColor: config.enabled ? '#4CAF50' : '#f44336'
                        }} />
                        {config.enabled ? 'ACTIVE' : 'DISABLED'}
                    </div>
                </div>
                <button
                    onClick={handleToggleSystem}
                    disabled={loading}
                    style={{
                        ...styles.btn,
                        backgroundColor: config.enabled ? '#f44336' : '#4CAF50'
                    }}
                >
                    {config.enabled ? '⏸️ Disable Bot System' : '▶️ Enable Bot System'}
                </button>
            </div>

            {/* Analytics */}
            {analytics && (
                <div style={styles.analyticsCard}>
                    <h3>📊 Leaderboard Analytics</h3>
                    <div style={styles.statsGrid}>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{analytics.total}</div>
                            <div style={styles.statLabel}>Total Players</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{analytics.realUsers}</div>
                            <div style={styles.statLabel}>Real Users</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{analytics.bots}</div>
                            <div style={styles.statLabel}>Bots</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{analytics.realUsersTop100}</div>
                            <div style={styles.statLabel}>Real Users (Top 100)</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{analytics.botsTop100}</div>
                            <div style={styles.statLabel}>Bots (Top 100)</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>
                                {analytics.realUserPercentageTop100.toFixed(1)}%
                            </div>
                            <div style={styles.statLabel}>Real User %</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Real User Stats */}
            {realUserStats && (
                <div style={styles.analyticsCard}>
                    <h3>👥 Real User Statistics</h3>
                    <div style={styles.statsGrid}>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{realUserStats.count}</div>
                            <div style={styles.statLabel}>Real Users in Top 100</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{Math.round(realUserStats.averageCoins)}</div>
                            <div style={styles.statLabel}>Average Coins</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{realUserStats.maxCoins}</div>
                            <div style={styles.statLabel}>Max Coins</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={styles.statValue}>{realUserStats.top10MaxCoins}</div>
                            <div style={styles.statLabel}>Top 10 Max</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bot Configuration */}
            <div style={styles.configCard}>
                <h3>⚙️ Bot Configuration</h3>
                <div style={styles.configGrid}>
                    <div style={styles.configItem}>
                        <span>Total Bots:</span>
                        <strong>{config.totalBots}</strong>
                    </div>
                    <div style={styles.configItem}>
                        <span>Elite Bots:</span>
                        <strong>{config.eliteBots}</strong>
                    </div>
                    <div style={styles.configItem}>
                        <span>Competitive Bots:</span>
                        <strong>{config.competitiveBots}</strong>
                    </div>
                    <div style={styles.configItem}>
                        <span>Active Bots:</span>
                        <strong>{config.activeBots}</strong>
                    </div>
                    <div style={styles.configItem}>
                        <span>Casual Bots:</span>
                        <strong>{config.casualBots}</strong>
                    </div>
                    <div style={styles.configItem}>
                        <span>Priority Threshold:</span>
                        <strong>{(config.realUserPriorityThreshold * 100).toFixed(0)}%</strong>
                    </div>
                </div>
            </div>

            {/* Control Buttons */}
            <div style={styles.controlsCard}>
                <h3>🎮 Bot Controls</h3>
                <div style={styles.btnGrid}>
                    <button
                        onClick={handleGenerateBots}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#9C27B0' }} // Purple for Magic Fix
                    >
                        🛠️ Fix & Reset Bots
                    </button>
                    <button
                        onClick={handleActivateBots}
                        disabled={loading}
                        style={styles.btn}
                    >
                        ▶️ Activate Bots
                    </button>
                    <button
                        onClick={handleSimulateBotActivity}
                        disabled={loading}
                        style={styles.btn}
                    >
                        🎲 Simulate Activity
                    </button>
                    <button
                        onClick={handleDeactivateBots}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#ff9800' }}
                    >
                        ⏸️ Deactivate All Bots
                    </button>
                    <button
                        onClick={() => {
                            setShowBotList(!showBotList);
                            if (!showBotList) loadBotLeaderboard();
                        }}
                        disabled={loading}
                        style={styles.btn}
                    >
                        {showBotList ? '👁️ Hide' : '👁️ View'} Bot List
                    </button>
                    <button
                        onClick={handleDeleteAllBots}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#f44336' }}
                    >
                        🗑️ Delete All Bots
                    </button>
                </div>
            </div>

            {/* Bot Leaderboard */}
            {showBotList && botLeaderboard.length > 0 && (
                <div style={styles.botListCard}>
                    <h3>🤖 Bot Leaderboard ({botLeaderboard.length} bots)</h3>
                    <div style={styles.botList}>
                        {botLeaderboard.slice(0, 50).map((bot, index) => (
                            <div key={bot.id} style={styles.botItem}>
                                <div style={styles.botRank}>#{index + 1}</div>
                                <div style={styles.botInfo}>
                                    <div style={styles.botName}>{bot.username}</div>
                                    <div style={styles.botMeta}>
                                        <span style={getTierColor(bot.botTier)}>
                                            {bot.botTier}
                                        </span>
                                        {' • '}
                                        <span>{bot.spinPattern}</span>
                                    </div>
                                </div>
                                <div style={styles.botCoins}>
                                    {bot.coins} / {bot.targetCoins}
                                    <div style={styles.progressBar}>
                                        <div
                                            style={{
                                                ...styles.progressFill,
                                                width: `${bot.progress}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={styles.botStatus}>
                                    {bot.isActivated ? '🟢 Active' : '🔴 Inactive'}
                                </div>
                            </div>
                        ))}
                    </div>
                    {botLeaderboard.length > 50 && (
                        <div style={styles.showMoreText}>
                            Showing top 50 of {botLeaderboard.length} bots
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div style={styles.loadingOverlay}>
                    <div style={styles.spinner}>⏳ Processing...</div>
                </div>
            )}
        </div>
    );
};

const getTierColor = (tier: BotTier) => {
    const colors = {
        [BotTier.ELITE]: { color: '#FFD700', fontWeight: 'bold' },
        [BotTier.COMPETITIVE]: { color: '#C0C0C0', fontWeight: 'bold' },
        [BotTier.ACTIVE]: { color: '#CD7F32', fontWeight: 'bold' },
        [BotTier.CASUAL]: { color: '#888', fontWeight: 'normal' }
    };
    return colors[tier] || {};
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        color: '#fff'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    title: {
        margin: 0,
        fontSize: '24px',
        color: '#FFD700'
    },
    refreshBtn: {
        padding: '8px 16px',
        background: '#333',
        border: '1px solid #555',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer'
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        color: '#fff'
    },
    statusCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    statusHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    statusDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%'
    },
    analyticsCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginTop: '15px'
    },
    statBox: {
        background: 'rgba(255,255,255,0.05)',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: '5px'
    },
    statLabel: {
        fontSize: '12px',
        color: '#aaa'
    },
    configCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    configGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginTop: '15px'
    },
    configItem: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '6px'
    },
    controlsCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    btnGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginTop: '15px'
    },
    btn: {
        padding: '12px 20px',
        background: '#2196F3',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'all 0.3s'
    },
    botListCard: {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },
    botList: {
        marginTop: '15px',
        maxHeight: '500px',
        overflowY: 'auto'
    },
    botItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        marginBottom: '8px'
    },
    botRank: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#FFD700',
        minWidth: '40px'
    },
    botInfo: {
        flex: 1
    },
    botName: {
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '4px'
    },
    botMeta: {
        fontSize: '12px',
        color: '#aaa'
    },
    botCoins: {
        textAlign: 'right',
        minWidth: '120px',
        fontSize: '13px'
    },
    progressBar: {
        width: '100%',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        marginTop: '4px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
        borderRadius: '2px'
    },
    botStatus: {
        fontSize: '12px',
        minWidth: '80px',
        textAlign: 'center'
    },
    showMoreText: {
        textAlign: 'center',
        color: '#aaa',
        fontSize: '12px',
        marginTop: '10px'
    },
    loadingOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
    },
    spinner: {
        fontSize: '24px',
        color: '#fff',
        padding: '30px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '12px'
    }
};
