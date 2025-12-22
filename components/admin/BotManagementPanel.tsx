import React, { useState, useEffect } from 'react';
import {
    generateSmartBots,
    cleanupLegacyBots,
    getSmartBots,
    simulateSmartBotActivity
} from '../../services/smartBotService';
import { getLeaderboardAnalytics, syncUserToLeaderboard } from '../../services/leaderboardService';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const BotManagementPanel: React.FC = () => {
    // Config state is removed as we hardcoded 3 bots for now.
    // const [config, setConfig] = useState<BotSystemConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [botList, setBotList] = useState<any[]>([]);
    const [showBotList, setShowBotList] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        const stats = await getLeaderboardAnalytics();
        setAnalytics(stats);
    };

    const loadBotList = async () => {
        const bots = await getSmartBots();
        setBotList(bots);
    };

    const handleGenerateSmartBots = async () => {
        if (!confirm('🛠️ This will DELETE all old bots and create 3 NEW Smart Bots. Continue?')) return;

        setLoading(true);
        try {
            console.log('🗑️ Cleaning legacy bots...');
            await cleanupLegacyBots();

            console.log('🤖 Generating 3 Smart Bots...');
            await generateSmartBots();

            alert('✅ Success! 3 Smart Bots Created & Synced to Users collection.');
            await loadAnalytics();
            if (showBotList) loadBotList();

        } catch (error) {
            console.error(error);
            alert('❌ Error during generation. Check console.');
        }
        setLoading(false);
    };

    const handleSimulateActivity = async () => {
        setLoading(true);
        try {
            await simulateSmartBotActivity();
            alert('✅ Activity Simulated (This feature is in Phase 2 Development)');
        } catch (error) {
            alert('❌ Error simulating activity');
        }
        setLoading(false);
    };

    const handleCleanup = async () => {
        if (!confirm('Delete ALL bots?')) return;
        setLoading(true);
        try {
            await cleanupLegacyBots();
            alert('✅ All bots deleted.');
            await loadAnalytics();
            setBotList([]);
        } catch (error) {
            alert('❌ Error cleaning up.');
        }
        setLoading(false);
    };

    const handleSyncMyScore = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                await syncUserToLeaderboard(
                    auth.currentUser.uid,
                    data.username || "Admin",
                    data.coins || 0,
                    data.photoURL,
                    data.totalSpins || 0,
                    data.level || 1
                );
                alert(`✅ Synced! Your score (${data.coins}) is now on the Leaderboard.`);
            }
        } catch (error) {
            console.error(error);
            alert('❌ Error syncing score.');
        }
        setLoading(false);
    };


    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>🤖 Smart Bot System (Phase 1)</h2>
                <button onClick={() => { loadAnalytics(); if (showBotList) loadBotList(); }} style={styles.refreshBtn}>
                    🔄 Refresh
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
                            <div style={styles.statLabel}>Bots (Target: 3)</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Control Buttons */}
            <div style={styles.controlsCard}>
                <h3>🎮 Bot Controls</h3>
                <div style={styles.btnGrid}>
                    <button
                        onClick={handleGenerateSmartBots}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#9C27B0' }}
                    >
                        🛠️ Initialize 3 Smart Bots
                    </button>

                    <button
                        onClick={() => handleSimulateActivity()}
                        disabled={loading}
                        style={styles.btn}
                    >
                        🎲 Simulate Activity (Auto)
                    </button>

                    <button
                        onClick={() => {
                            setShowBotList(!showBotList);
                            if (!showBotList) loadBotList();
                        }}
                        disabled={loading}
                        style={styles.btn}
                    >
                        {showBotList ? '👁️ Hide' : '👁️ View'} Bot List
                    </button>
                    <button
                        onClick={handleCleanup}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#f44336' }}
                    >
                        🗑️ Delete All Bots
                    </button>


                    <button
                        onClick={handleSyncMyScore}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#4CAF50' }}
                    >
                        🔄 Sync MY Score to Leaderboard
                    </button>
                </div>

                {/* SIMULATION TOOLS */}
                <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#aaa' }}>🕹️ Force Simulation (Testing)</h4>
                <div style={styles.btnGrid}>
                    <button
                        onClick={() => { setLoading(true); simulateSmartBotActivity(1).then(() => { alert('Simulated MONDAY (Rank 50+)'); setLoading(false); }); }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#607D8B' }}
                    >
                        Force Mon (Low)
                    </button>
                    <button
                        onClick={() => { setLoading(true); simulateSmartBotActivity(5).then(() => { alert('Simulated FRIDAY (Rank 5+)'); setLoading(false); }); }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#009688' }}
                    >
                        Force Fri (High)
                    </button>
                    <button
                        onClick={() => { setLoading(true); simulateSmartBotActivity(0).then(() => { alert('Simulated SUNDAY (Rank 3+)'); setLoading(false); }); }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#FF9800' }}
                    >
                        Force Sun (Top 3)
                    </button>
                    <button
                        onClick={() => { setLoading(true); simulateSmartBotActivity(0, true).then(() => { alert('Simulated RUSH HOUR (Rank 1!)'); setLoading(false); }); }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#E91E63' }}
                    >
                        🔥 Force RUSH HOUR
                    </button>
                </div>
            </div>

            {/* Bot List */}
            {
                showBotList && (
                    <div style={styles.botListCard}>
                        <h3>🤖 Active Bots ({botList.length})</h3>
                        <div style={styles.botList}>
                            {botList.map((bot, index) => (
                                <div key={bot.id} style={styles.botItem}>
                                    <div style={styles.botRank}>#{index + 1}</div>
                                    <div style={styles.botInfo}>
                                        <div style={styles.botName}>{bot.username}</div>
                                        <div style={styles.botMeta}>
                                            <span style={{ color: '#aaa' }}>
                                                {bot.botTier}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={styles.botCoins}>
                                        {bot.coins} Coins
                                    </div>
                                </div>
                            ))}
                            {botList.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No bots found.</p>}
                        </div>
                    </div>
                )
            }

            {
                loading && (
                    <div style={styles.loadingOverlay}>
                        <div style={styles.spinner}>⏳ Processing...</div>
                    </div>
                )
            }
        </div >
    );
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
