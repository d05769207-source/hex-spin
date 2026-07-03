import React, { useState, useEffect, useRef } from 'react';
import {
    generateSmartBots,
    retireOldBots,
    hardDeleteAllBots,
    getSmartBots,
    simulateSmartBotActivity,
    getSimulationState,
    setSimulationState,
    generateDemoLeaderboard,
    clearDemoLeaderboard
} from '../../services/smartBotService';
import { getLeaderboardAnalytics, syncUserToLeaderboard } from '../../services/leaderboardService';
import { getCurrentWeekId } from '../../utils/weekUtils';
import { supabase, auth } from '../../supabaseClient';

export const BotManagementPanel: React.FC = () => {
    // Config state is removed as we hardcoded 3 bots for now.
    // const [config, setConfig] = useState<BotSystemConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [reservedCount, setReservedCount] = useState<number>(0);
    const [levelConfig, setLevelConfig] = useState<any>(null); // NEW: Level config
    const [levelPools, setLevelPools] = useState<any>(null); // NEW: Level pools
    const [photoStats, setPhotoStats] = useState({ used: 0, total: 0 }); // NEW: Photo stats
    const [botList, setBotList] = useState<any[]>([]);
    const [showBotList, setShowBotList] = useState(false);

    // Simulation Toggle State
    const [simState, setSimState] = useState<{ forceDay: number | undefined, forceRushHour: boolean }>({ forceDay: undefined, forceRushHour: false });

    // Auto-Run State
    const [autoRun, setAutoRun] = useState(false);
    const autoRunInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadAnalytics();
        const savedState = getSimulationState();
        setSimState(savedState);

        // REAL-TIME LISTENERS for Reserved IDs System
        const reservedChannel = supabase
            .channel('reserved_bot_ids')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'system',
                filter: 'id=eq.reserved_bot_ids'
            }, async (payload) => {
                if (payload.new) {
                    const data = payload.new as any;
                    setReservedCount(data.ids?.length || 0);
                    setLevelPools(data.level_pools || {});
                }
            })
            .subscribe();

        const configChannel = supabase
            .channel('reserved_ids_config')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'system',
                filter: 'id=eq.reserved_ids_config'
            }, async (payload) => {
                if (payload.new) {
                    setLevelConfig(payload.new);
                } else {
                    // Fallback config if not initialized
                    setLevelConfig({
                        currentLevel: 1,
                        levels: {
                            1: { maxIds: 6, gapSize: 2, filled: 0 },
                            2: { maxIds: 10, gapSize: 5, filled: 0 },
                            3: { maxIds: 20, gapSize: 10, filled: 0 },
                            4: { maxIds: 50, gapSize: 20, filled: 0 },
                            5: { maxIds: 100, gapSize: 50, filled: 0 }
                        }
                    });
                }
            })
            .subscribe();

        // Initial fetch for reserved data
        const fetchReservedData = async () => {
            const { data } = await supabase
                .from('system')
                .select('*')
                .eq('id', 'reserved_bot_ids')
                .single();
            if (data) {
                setReservedCount(data.ids?.length || 0);
                setLevelPools(data.level_pools || {});
            }
        };

        const fetchConfigData = async () => {
            const { data } = await supabase
                .from('system')
                .select('*')
                .eq('id', 'reserved_ids_config')
                .single();
            if (data) {
                setLevelConfig(data);
            } else {
                // Fallback config if not initialized
                setLevelConfig({
                    currentLevel: 1,
                    levels: {
                        1: { maxIds: 6, gapSize: 2, filled: 0 },
                        2: { maxIds: 10, gapSize: 5, filled: 0 },
                        3: { maxIds: 20, gapSize: 10, filled: 0 },
                        4: { maxIds: 50, gapSize: 20, filled: 0 },
                        5: { maxIds: 100, gapSize: 50, filled: 0 }
                    }
                });
            }
        };

        fetchReservedData();
        fetchConfigData();

        return () => {
            if (autoRunInterval.current) clearInterval(autoRunInterval.current);
            supabase.removeChannel(reservedChannel);
            supabase.removeChannel(configChannel);
        };
    }, []);

    // Auto-Run Logic
    useEffect(() => {
        if (autoRun) {
            // Run immediately
            handleSimulateActivity(true);

            // Then run every 60 seconds
            autoRunInterval.current = setInterval(() => {
                handleSimulateActivity(true);
            }, 60000);
        } else {
            if (autoRunInterval.current) clearInterval(autoRunInterval.current);
        }
    }, [autoRun]);

    const loadAnalytics = async () => {
        const stats = await getLeaderboardAnalytics();
        setAnalytics(stats);

        // Fetch Photo Stats
        const { count: totalPhotos } = await supabase
            .from('bot_profile_photos')
            .select('*', { count: 'exact', head: true });

        const { count: usedPhotos } = await supabase
            .from('bot_profile_photos')
            .select('*', { count: 'exact', head: true })
            .eq('is_used', true);

        setPhotoStats({ used: usedPhotos || 0, total: totalPhotos || 0 });

        // Note: Reserved IDs are now handled by real-time listeners above
    };

    const loadBotList = async () => {
        const bots = await getSmartBots();
        setBotList(bots);
    };

    const handleGenerateSmartBots = async () => {
        if (!confirm('🛠️ This will RETIRE all old bots and INITIALIZE 3 Smart Bots.\n\n⚠️ If bots exist for THIS WEEK:\n- UIDs will remain SAME\n- Coins will RESET to 0\n- Name, Avatar, Level will be NEW\n\nContinue?')) return;

        setLoading(true);
        try {
            console.log('🗑️ Retiring old bots...');
            await retireOldBots();

            console.log('🤖 Generating 3 Smart Bots...');
            await generateSmartBots();

            alert('✅ Success! 3 Smart Bots Initialized.\n\n✔ Same Week = UIDs Preserved, Coins Reset\n✔ New Week = Fresh Bots Created');
            await loadAnalytics();
            if (showBotList) loadBotList();

        } catch (error) {
            console.error(error);
            alert('❌ Error during generation. Check console.');
        }
        setLoading(false);
    };

    const handleSimulateActivity = async (silent = false) => {
        // If auto-run is on, we don't show loading spinner to avoid UI flicker
        if (!silent) setLoading(true);

        try {
            // Check state again
            const currentState = getSimulationState();
            await simulateSmartBotActivity(currentState.forceDay, currentState.forceRushHour);
            if (!silent) alert('✅ Activity Simulated (This triggers one 55-second loop). \nIMPORTANT: The simulation will now auto-refresh state every 6 seconds.');

            // Refresh stats silently
            loadAnalytics();
            if (showBotList) loadBotList();

        } catch (error) {
            console.error(error);
            if (!silent) alert('❌ Error simulating activity');
        }
        if (!silent) setLoading(false);
    };

    const handleRetire = async () => {
        if (!confirm('👴 Retire all ACTIVE bots? They will be removed from Leaderboard and moved to Hall of Fame.')) return;
        setLoading(true);
        try {
            const count = await retireOldBots();
            alert(`✅ Retired ${count} bots.`);
            await loadAnalytics();
            setBotList([]);
        } catch (error) {
            alert('❌ Error retiring bots.');
        }
        setLoading(false);
    };

    const handleHardDelete = async () => {
        if (!confirm('🔥 DANGER: This will PERMANENTLY DELETE all bots. Use only if system is broken.')) return;
        setLoading(true);
        try {
            const count = await hardDeleteAllBots();
            alert(`✅ Deleted ${count} bots.`);
            await loadAnalytics();
            setBotList([]);
        } catch (error) {
            alert('❌ Error deleting bots.');
        }
        setLoading(false);
    };

    const handleSyncMyScore = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setLoading(true);
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('uid', user.id)
                .single();
            if (userData) {
                await syncUserToLeaderboard(
                    user.id,
                    userData.username || "Admin",
                    userData.coins || 0,
                    userData.photo_url,
                    userData.total_spins || 0,
                    userData.level || 1
                );
                alert(`✅ Synced! Your score (${userData.coins}) is now on the Leaderboard.`);
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
                <h2 style={styles.title}>🤖 ADMIN BOT CONTROL v2</h2>
                <span style={{ fontSize: '14px', color: '#aaa', marginLeft: '10px' }}>
                    (Week: {getCurrentWeekId()})
                </span>
                <div style={styles.headerControls}>
                    {(simState.forceDay !== undefined || simState.forceRushHour) && (
                        <span style={styles.simBadge}>🕹️ Simulation Active</span>
                    )}
                    {autoRun && (
                        <span style={{ ...styles.simBadge, backgroundColor: '#4CAF50' }}>🔄 Auto-Run ON</span>
                    )}
                    <button onClick={() => { loadAnalytics(); if (showBotList) loadBotList(); }} style={styles.refreshBtn}>
                        🔄 Refresh Stats
                    </button>
                </div>
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
                            <div style={styles.statLabel}>Active Bots</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={{ ...styles.statValue, color: '#00bcd4' }}>Level {levelConfig?.currentLevel || 1}</div>
                            <div style={styles.statLabel}>Current Level</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={{ ...styles.statValue, color: '#4CAF50' }}>
                                {reservedCount}/{levelConfig?.levels?.[levelConfig?.currentLevel || 1]?.maxIds || 6}
                            </div>
                            <div style={styles.statLabel}>Reserved IDs Pool</div>
                        </div>
                        <div style={styles.statBox}>
                            <div style={{ ...styles.statValue, color: '#E91E63' }}>
                                {photoStats.total - photoStats.used}
                            </div>
                            <div style={styles.statLabel}>Photos Remaining</div>
                        </div>
                    </div>

                    {/* Level Progress Bar */}
                    {
                        levelConfig && (
                            <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#00bcd4' }}>
                                        Level {levelConfig?.currentLevel} Progress
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#aaa' }}>
                                        {reservedCount}/{levelConfig?.levels?.[levelConfig?.currentLevel]?.maxIds || 0} IDs
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '10px', background: '#222', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(100, (reservedCount / (levelConfig?.levels?.[levelConfig?.currentLevel]?.maxIds || 1)) * 100)}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #00bcd4, #4CAF50)',
                                        transition: 'width 0.3s ease',
                                        borderRadius: '5px'
                                    }} />
                                </div>

                                {/* Level Breakdown */}
                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#aaa' }}>Level Breakdown:</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5].map(level => {
                                            const poolSize = levelPools?.[level]?.length || 0;
                                            const maxIds = levelConfig?.levels?.[level]?.maxIds || 0;
                                            const gapSize = levelConfig?.levels?.[level]?.gapSize || 0;
                                            const isCurrent = level === (levelConfig?.currentLevel || 1);
                                            const isUnlocked = level <= (levelConfig?.currentLevel || 1);

                                            return (
                                                <div key={level} style={{
                                                    background: isCurrent ? 'rgba(0, 188, 212, 0.2)' : 'rgba(255,255,255,0.05)',
                                                    border: isCurrent ? '2px solid #00bcd4' : '1px solid #444',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    textAlign: 'center',
                                                    opacity: isUnlocked ? 1 : 0.5
                                                }}>
                                                    <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>L{level}</div>
                                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: isUnlocked ? '#4CAF50' : '#666' }}>
                                                        {poolSize}/{maxIds}
                                                    </div>
                                                    <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
                                                        Gap: {gapSize}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
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
                        onClick={() => setAutoRun(!autoRun)}
                        style={{ ...styles.btn, backgroundColor: autoRun ? '#4CAF50' : '#333', border: autoRun ? '2px solid #fff' : '1px solid #555' }}
                    >
                        {autoRun ? '🔄 Auto-Run: ON' : '🔄 Auto-Run: OFF'}
                    </button>

                    <button
                        onClick={() => handleSimulateActivity()}
                        disabled={loading || autoRun}
                        style={{ ...styles.btn, opacity: autoRun ? 0.5 : 1 }}
                    >
                        🎲 Trigger Once (55s)
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
                        onClick={handleRetire}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#FF9800' }}
                    >
                        👴 Retire Old Bots (Persistent)
                    </button>
                    <button
                        onClick={handleHardDelete}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#f44336' }}
                    >
                        🔥 Hard Reset (Delete All)
                    </button>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        onClick={handleSyncMyScore}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#4CAF50', width: '100%' }}
                    >
                        🔄 Sync MY Score to Leaderboard
                    </button>
                </div>

                {/* TESTING ZONE (NEW) */}
                <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#aaa', borderTop: '1px solid #444', paddingTop: '10px' }}>
                    🧪 Testing Zone (Safe to use)
                </h4>
                <div style={styles.btnGrid}>
                    <button
                        onClick={async () => {
                            if (!confirm('Create 80 fake demo bots in Leaderboard for testing?')) return;
                            setLoading(true);
                            try {
                                await generateDemoLeaderboard(80);
                                alert('✅ 80 Demo Bots Added!');
                                loadAnalytics();
                            } catch (e) { alert('Error: ' + e); }
                            setLoading(false);
                        }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: '#673AB7', border: '1px dashed #B39DDB' }}
                    >
                        🧪 Fill Leaderboard (80 Bots)
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm('Clear all demo bots?')) return;
                            setLoading(true);
                            try {
                                await clearDemoLeaderboard();
                                alert('✅ Demo Bots Cleared!');
                                loadAnalytics();
                            } catch (e) { alert('Error: ' + e); }
                            setLoading(false);
                        }}
                        disabled={loading}
                        style={{ ...styles.btn, backgroundColor: 'transparent', border: '1px dashed #f44336', color: '#f44336' }}
                    >
                        ❌ Clear Demo Bots
                    </button>
                </div>


                {/* SIMULATION TOOLS (PERSISTENT TOGGLES) */}
                <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#aaa', borderTop: '1px solid #444', paddingTop: '10px' }}>
                    🕹️ Force Simulation (Persistent)
                    <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '10px', color: '#888' }}>
                        (Updates effectively every 6s)
                    </span>
                </h4>

                <div style={styles.btnGrid}>
                    <button
                        onClick={() => {
                            const newValue = simState.forceDay === 1 ? undefined : 1;
                            setSimulationState(newValue, undefined); // Turn off Rush if changing day
                            setSimState(getSimulationState());
                            // We don't need to force run simulateSmartBotActivity here because the RUNNING loop will pick it up
                        }}
                        style={{ ...styles.btn, backgroundColor: simState.forceDay === 1 ? '#607D8B' : '#333', border: simState.forceDay === 1 ? '2px solid #fff' : '1px solid #555' }}
                    >
                        {simState.forceDay === 1 ? '🟢 ON: Mon (Low)' : '⚪ OFF: Mon (Low)'}
                    </button>

                    <button
                        onClick={() => {
                            const newValue = simState.forceDay === 5 ? undefined : 5;
                            setSimulationState(newValue, undefined);
                            setSimState(getSimulationState());
                        }}
                        style={{ ...styles.btn, backgroundColor: simState.forceDay === 5 ? '#009688' : '#333', border: simState.forceDay === 5 ? '2px solid #fff' : '1px solid #555' }}
                    >
                        {simState.forceDay === 5 ? '🟢 ON: Fri (Rank 5+)' : '⚪ OFF: Fri (Rank 5+)'}
                    </button>

                    <button
                        onClick={() => {
                            const newValue = simState.forceDay === 0 ? undefined : 0;
                            setSimulationState(newValue, undefined);
                            setSimState(getSimulationState());
                        }}
                        style={{ ...styles.btn, backgroundColor: simState.forceDay === 0 ? '#FF9800' : '#333', border: simState.forceDay === 0 ? '2px solid #fff' : '1px solid #555' }}
                    >
                        {simState.forceDay === 0 ? '🟢 ON: Sun (Top 3)' : '⚪ OFF: Sun (Top 3)'}
                    </button>

                    <button
                        onClick={() => {
                            const newValue = !simState.forceRushHour;
                            // If turning ON Rush Hour, force SundayDay as well? Not strictly needed but safer:
                            setSimulationState(newValue ? 0 : simState.forceDay, newValue);
                            setSimState(getSimulationState());
                        }}
                        style={{ ...styles.btn, backgroundColor: simState.forceRushHour ? '#E91E63' : '#333', border: simState.forceRushHour ? '2px solid #fff' : '1px solid #555' }}
                    >
                        {simState.forceRushHour ? '🔥 RUSH HOUR: ON' : '⚪ RUSH HOUR: OFF'}
                    </button>

                </div>
                {(simState.forceDay !== undefined || simState.forceRushHour) && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(233, 30, 99, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#ff80ab' }}>⚠️ Simulation Mode Active! Bots will ignore real time and follow these settings.</p>
                        <button
                            onClick={() => {
                                setSimulationState(undefined, false);
                                setSimState(getSimulationState());
                                alert('Simulation Reset to Real Time. Bots will revert to normal behavior in < 6 seconds.');
                            }}
                            style={{ marginTop: '5px', background: 'transparent', border: '1px solid #ff80ab', color: '#ff80ab', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '10px' }}
                        >
                            Reset to Normal
                        </button>
                    </div>
                )}
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
                loading && !autoRun && (
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
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
    },
    headerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    title: {
        margin: 0,
        fontSize: '24px',
        color: '#FFD700'
    },
    simBadge: {
        background: '#E91E63',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        animation: 'pulse 2s infinite'
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
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
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
