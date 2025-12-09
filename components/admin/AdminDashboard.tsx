import React, { useState, useEffect } from 'react';
import {
    Users,
    Activity,
    Settings,
    LogOut,
    Search,
    Bell,
    Shield,
    Power,
    RefreshCw,
    AlertTriangle,
    PlayCircle,
    PauseCircle,
    DollarSign,
    Gift,
    Zap,
    Menu,
    X,
    Wrench,
    Trophy,
    Download,
    Bot
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { setSimulatedTimeOffset, clearSimulatedTime, getWeekEndDate } from '../../utils/weekUtils';
import {
    startMaintenanceMode,
    endMaintenanceMode,
    getTopWinners,
    distributeRewards,
    resetAllUsersData,
    WinnerData,
    subscribeToGameStatus,
    GameStatus
} from '../../services/maintenanceService';
import { bulkResetAndPopulate, deleteAllTestData } from '../../services/bulkDataService';
import { BotManagementPanel } from './BotManagementPanel';

interface AdminDashboardProps {
    onLogout: () => void;
    onBackToGame: () => void;
}

// Mock Data Types
interface User {
    id: string;
    username: string;
    balance: number;
    status: 'online' | 'offline';
    lastLogin: string;
    ip: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToGame }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'settings' | 'maintenance' | 'bots' | 'bulkdata'>('dashboard');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isSundayBypass, setIsSundayBypass] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Maintenance Control State
    const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
    const [winners, setWinners] = useState<WinnerData[]>([]);
    const [isLoadingWinners, setIsLoadingWinners] = useState(false);
    const [resetProgress, setResetProgress] = useState({ current: 0, total: 0 });
    const [rewardProgress, setRewardProgress] = useState({ current: 0, total: 0 });
    const [isResetting, setIsResetting] = useState(false);
    const [isDistributing, setIsDistributing] = useState(false);

    // Bulk Data State
    const [bulkProgress, setBulkProgress] = useState({ step: '', current: 0, total: 100 });
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Mock Stats
    const stats = {
        onlineUsers: 128,
        totalRegistrations: 1450,
        spinsToday: 3420,
        rewardsDistributed: 8500
    };

    // Mock Users Data
    const [users] = useState<User[]>([
        { id: '1', username: 'CoolGamer99', balance: 500, status: 'online', lastLogin: 'Just now', ip: '192.168.1.45' },
        { id: '2', username: 'LuckyWinner', balance: 1200, status: 'online', lastLogin: '2 mins ago', ip: '10.0.0.12' },
        { id: '3', username: 'SniperKing', balance: 50, status: 'offline', lastLogin: '1 hour ago', ip: '172.16.0.5' },
        { id: '4', username: 'HexMaster', balance: 3000, status: 'online', lastLogin: '5 mins ago', ip: '192.168.1.88' },
        { id: '5', username: 'NoobPlayer', balance: 0, status: 'offline', lastLogin: '1 day ago', ip: '10.0.0.99' },
    ]);

    // Broadcast Message State
    const [broadcastMsg, setBroadcastMsg] = useState('');

    // Subscribe to game status
    useEffect(() => {
        const unsubscribe = subscribeToGameStatus((status) => {
            setGameStatus(status);
        });
        return () => unsubscribe();
    }, []);

    const handleBroadcast = (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMsg) return;
        alert(`📢 Broadcast sent to all users: "${broadcastMsg}"`);
        setBroadcastMsg('');
    };

    const handleForceSuperMode = async () => {
        if (!auth.currentUser) {
            alert("Error: No user logged in.");
            return;
        }

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            // 1 Hour fallback + 50 Spins logic
            const endTime = new Date(Date.now() + 60 * 60 * 1000);

            await updateDoc(userRef, {
                spinsToday: 100,
                superModeSpinsLeft: 50,
                superModeEndTime: Timestamp.fromDate(endTime)
            });

            alert("⚡ Super Mode Activated: Given 50 Spins!");
        } catch (error) {
            console.error("Error activating Super Mode:", error);
            alert("Failed to activate Super Mode.");
        }
    };

    const handleDeactivateSuperMode = async () => {
        if (!auth.currentUser) return;

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                superModeEndTime: null,
                superModeSpinsLeft: 0
            });
            alert("⚡ Super Mode DEACTIVATED.");
        } catch (error) {
            console.error("Error deactivating Super Mode:", error);
            alert("Failed to deactivate.");
        }
    };


    const handleTestWeeklyReset = () => {
        // Jump to 30 seconds before the next reset
        const nextReset = getWeekEndDate(); // Returns Sunday 23:59:59 based on CURRENT time (if no offset)
        // We know getWeekEndDate uses getNow(), so first clear any offset to get REAL next reset
        clearSimulatedTime();

        const realNextReset = getWeekEndDate();
        const targetTime = realNextReset.getTime() - 15000; // 15 seconds before reset (safer than 30 for witnessing)
        const now = Date.now();
        const offset = targetTime - now;

        setSimulatedTimeOffset(offset);
        alert(`🕒 Validating Time Jump...\n\nSystem will now think it is: ${new Date(targetTime).toLocaleString()}\n\nWait 15 seconds for reset!`);

        // Force reload to ensure Hooks pick up the new "Now"
        window.location.reload();
    };

    const handleClearTimeSimulation = () => {
        clearSimulatedTime();
        alert("🕒 Time Simulation Cleared. Back to Real Time.");
        window.location.reload();
    };

    const NavItem = ({ id, icon: Icon, label }: any) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === id ? 'bg-red-600/20 text-red-400 border border-red-600/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
            <Icon size={20} />
            <span className="font-bold">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden">
            {/* ... other parts of the component remain same ... */}
            {/* MOBILE HEADER */}
            <div className="md:hidden p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Shield className="text-red-500" size={20} />
                    <span className="font-black text-lg tracking-wider">HEX ADMIN</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* SIDEBAR */}
            <div className={`
                fixed inset-0 z-40 bg-black/95 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 md:relative md:w-64 md:bg-gray-900 md:border-r md:border-gray-800 flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="hidden md:flex p-6 border-b border-gray-800 items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Shield className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">HEX ADMIN</h1>
                        <p className="text-xs text-green-500 font-mono">● System Online</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-16 md:mt-0">
                    <NavItem id="dashboard" icon={Activity} label="Live Overview" />
                    <NavItem id="users" icon={Users} label="User Monitor" />
                    <NavItem id="bots" icon={Bot} label="Bot Management" />
                    <NavItem id="bulkdata" icon={Settings} label="Bulk Data" />
                    <NavItem id="maintenance" icon={Wrench} label="Maintenance Control" />
                    <NavItem id="settings" icon={Settings} label="Master Controls" />
                </nav>

                <div className="p-4 border-t border-gray-800 space-y-2 mb-8 md:mb-0">
                    <button
                        onClick={onBackToGame}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                    >
                        <PlayCircle size={20} />
                        <span className="font-medium">Back to Game</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-900/20 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto bg-black relative h-[calc(100vh-60px)] md:h-screen">
                {/* Background Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 pointer-events-none"></div>

                <header className="hidden md:flex p-6 border-b border-gray-800 justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                        {activeTab === 'dashboard' && 'Mission Control'}
                        {activeTab === 'users' && 'User Database'}
                        {activeTab === 'bots' && 'Bot Management System'}
                        {activeTab === 'bulkdata' && 'Bulk Data Management'}
                        {activeTab === 'maintenance' && 'Weekly Reset Control'}
                        {activeTab === 'settings' && 'System Config'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-full border border-gray-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-mono text-gray-400">Server: US-East-1</span>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-white relative">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full"></div>
                    </div>
                </header>

                <main className="p-4 md:p-8 relative z-0 pb-24 md:pb-8">

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 md:space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <StatCard
                                    title="Live Users"
                                    value={stats.onlineUsers}
                                    icon={<Users size={24} className="text-green-400" />}
                                    trend="+12%"
                                    color="green"
                                />
                                <StatCard
                                    title="Total Spins"
                                    value={stats.spinsToday}
                                    icon={<RefreshCw size={24} className="text-blue-400" />}
                                    trend="+5%"
                                    color="blue"
                                />
                                <StatCard
                                    title="Registrations"
                                    value={stats.totalRegistrations}
                                    icon={<Activity size={24} className="text-yellow-400" />}
                                    trend="+24"
                                    color="yellow"
                                />
                                <StatCard
                                    title="Rewards Given"
                                    value={stats.rewardsDistributed}
                                    icon={<Gift size={24} className="text-red-400" />}
                                    trend="-2%"
                                    color="red"
                                />
                            </div>

                            {/* Broadcast Section */}
                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Bell className="text-yellow-500" size={20} /> Global Broadcast
                                </h3>
                                <form onSubmit={handleBroadcast} className="flex flex-col md:flex-row gap-4">
                                    <input
                                        type="text"
                                        value={broadcastMsg}
                                        onChange={(e) => setBroadcastMsg(e.target.value)}
                                        placeholder="Type announcement message..."
                                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        SEND <PlayCircle size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="relative w-full md:w-auto">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none w-full md:w-64"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs font-mono text-gray-300">Export CSV</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Balance</th>
                                            <th className="px-6 py-4">IP Address</th>
                                            <th className="px-6 py-4">Last Login</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${user.status === 'online' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-gray-800 text-gray-500 border border-gray-700'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                                                        {user.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-yellow-400">{user.balance} P</td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{user.ip}</td>
                                                <td className="px-6 py-4 text-gray-400 text-sm">{user.lastLogin}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-red-500 hover:text-red-400 text-xs font-bold border border-red-900 bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 transition-all">
                                                        KICK
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* MAINTENANCE TAB */}
                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">
                            {/* Current Status */}
                            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Wrench className="text-purple-400" size={28} />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Weekly Reset Maintenance Control</h3>
                                        <p className="text-sm text-gray-400">Manual control of weekly data reset and rewards</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="bg-black/30 p-4 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Current Status</p>
                                        <p className={`text-lg font-bold ${gameStatus?.maintenanceMode ? 'text-red-400' :
                                            gameStatus?.warningActive ? 'text-yellow-400' :
                                                gameStatus?.readyCountdown > 0 ? 'text-green-400' :
                                                    'text-green-500'
                                            }`}>
                                            {gameStatus?.maintenanceMode ? '🔴 MAINTENANCE' :
                                                gameStatus?.warningActive ? '⚠️ WARNING' :
                                                    gameStatus?.readyCountdown > 0 ? '🟢 READY COUNTDOWN' :
                                                        '🟢 GAME ACTIVE'}
                                        </p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Spin Status</p>
                                        <p className={`text-lg font-bold ${gameStatus?.spinEnabled ? 'text-green-500' : 'text-red-400'
                                            }`}>
                                            {gameStatus?.spinEnabled ? '✅ ENABLED' : '❌ DISABLED'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 1: Start Maintenance */}
                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">1</div>
                                    <h3 className="text-lg font-bold text-white">Enable Maintenance Mode</h3>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">
                                    Start 15s warning countdown, then disable spin globally
                                </p>
                                {gameStatus?.warningActive && (
                                    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                                        <p className="text-yellow-400 font-bold text-center text-xl">
                                            ⚠️ WARNING IN PROGRESS: {gameStatus.warningCountdown}s
                                        </p>
                                    </div>
                                )}
                                <button
                                    onClick={async () => {
                                        if (confirm('Start maintenance mode? Users will get 15s warning.')) {
                                            await startMaintenanceMode();
                                        }
                                    }}
                                    disabled={gameStatus?.maintenanceMode || gameStatus?.warningActive}
                                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all"
                                >
                                    {gameStatus?.warningActive ? `WARNING (${gameStatus.warningCountdown}s)` :
                                        gameStatus?.maintenanceMode ? 'MAINTENANCE ACTIVE' :
                                            '🔴 START MAINTENANCE MODE'}
                                </button>
                            </div>

                            {/* Step 2: Process Data */}
                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold">2</div>
                                    <h3 className="text-lg font-bold text-white">Process Weekly Data</h3>
                                </div>

                                {/* View Winners */}
                                <div className="mb-6 space-y-4">
                                    <button
                                        onClick={async () => {
                                            setIsLoadingWinners(true);
                                            const topWinners = await getTopWinners(100);
                                            setWinners(topWinners);
                                            setIsLoadingWinners(false);
                                        }}
                                        disabled={!gameStatus?.maintenanceMode || isLoadingWinners}
                                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trophy size={20} />
                                        {isLoadingWinners ? 'Loading...' : `📊 VIEW TOP 100 WINNERS`}
                                    </button>

                                    {winners.length > 0 && (
                                        <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-white">Top {winners.length} Winners</h4>
                                                <button className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1">
                                                    <Download size={14} /> Export CSV
                                                </button>
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="text-gray-400 text-xs uppercase">
                                                    <tr className="border-b border-gray-800">
                                                        <th className="text-left py-2">Rank</th>
                                                        <th className="text-left py-2">Username</th>
                                                        <th className="text-right py-2">Coins</th>
                                                        <th className="text-right py-2">Reward (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-white">
                                                    {winners.slice(0, 100).map((winner) => (
                                                        <tr key={winner.userId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                                            <td className="py-2">
                                                                <span className={`font-bold ${winner.rank === 1 ? 'text-yellow-400' :
                                                                    winner.rank === 2 ? 'text-gray-400' :
                                                                        winner.rank === 3 ? 'text-orange-400' :
                                                                            'text-gray-500'
                                                                    }`}>
                                                                    #{winner.rank}
                                                                </span>
                                                            </td>
                                                            <td className="py-2">{winner.username}</td>
                                                            <td className="py-2 text-right font-mono text-yellow-400">{winner.coins}</td>
                                                            <td className="py-2 text-right font-mono text-green-400">₹{winner.rewardAmount.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Distribute Rewards */}
                                <div className="mb-6">
                                    <button
                                        onClick={async () => {
                                            if (!winners.length) {
                                                alert('Please load winners first!');
                                                return;
                                            }
                                            if (confirm(`Distribute rewards to ${winners.length} winners?`)) {
                                                setIsDistributing(true);
                                                await distributeRewards(winners, (current, total) => {
                                                    setRewardProgress({ current, total });
                                                });
                                                setIsDistributing(false);
                                                alert('✅ All rewards distributed!');
                                            }
                                        }}
                                        disabled={!gameStatus?.maintenanceMode || isDistributing || winners.length === 0}
                                        className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Gift size={20} />
                                        {isDistributing ? `DISTRIBUTING... (${rewardProgress.current}/${rewardProgress.total})` : '💰 DISTRIBUTE REWARDS'}
                                    </button>
                                    {isDistributing && (
                                        <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-300"
                                                style={{ width: `${(rewardProgress.current / rewardProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Reset All Data */}
                                <div>
                                    <button
                                        onClick={async () => {
                                            if (confirm('Reset ALL user data? This will:\n- Set coins to 0\n- Convert coins to E-tokens\n- Update leaderboard\n\nThis cannot be undone!')) {
                                                setIsResetting(true);
                                                await resetAllUsersData((current, total) => {
                                                    setResetProgress({ current, total });
                                                });
                                                setIsResetting(false);
                                                alert('✅ All data reset complete!');
                                            }
                                        }}
                                        disabled={!gameStatus?.maintenanceMode || isResetting}
                                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={20} className={isResetting ? 'animate-spin' : ''} />
                                        {isResetting ? `RESETTING... (${resetProgress.current}/${resetProgress.total})` : '🔄 RESET ALL USER DATA'}
                                    </button>
                                    {isResetting && (
                                        <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all duration-300"
                                                style={{ width: `${(resetProgress.current / resetProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: End Maintenance */}
                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">3</div>
                                    <h3 className="text-lg font-bold text-white">Resume Game</h3>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">
                                    Start 15s ready countdown, then enable spin globally
                                </p>
                                {gameStatus?.readyCountdown > 0 && (
                                    <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                                        <p className="text-green-400 font-bold text-center text-xl">
                                            🎊 READY COUNTDOWN: {gameStatus.readyCountdown}s
                                        </p>
                                    </div>
                                )}
                                <button
                                    onClick={async () => {
                                        if (confirm('End maintenance mode? Users will get 15s ready countdown.')) {
                                            await endMaintenanceMode();
                                        }
                                    }}
                                    disabled={!gameStatus?.maintenanceMode || gameStatus?.readyCountdown > 0}
                                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all"
                                >
                                    {gameStatus?.readyCountdown > 0 ? `COUNTDOWN (${gameStatus.readyCountdown}s)` : '🟢 END MAINTENANCE MODE'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* BOTS TAB */}
                    {activeTab === 'bots' && (
                        <BotManagementPanel />
                    )}

                    {/* BULK DATA TAB */}
                    {activeTab === 'bulkdata' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/50 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Settings className="text-orange-400" size={28} />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Bulk Data Management</h3>
                                        <p className="text-sm text-gray-400">Reset all users and populate test data</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bulk Reset & Populate */}
                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">🎲 Quick Test Data Setup</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    This will: Reset ALL users to 0 → Add random coins (4k-5k) → Add tokens & spins → Sync to leaderboard
                                </p>

                                <button
                                    onClick={async () => {
                                        if (!confirm('This will RESET ALL USER DATA and populate test data!\n\nAre you sure?')) return;

                                        setIsBulkProcessing(true);
                                        try {
                                            await bulkResetAndPopulate(
                                                {
                                                    minCoins: 4000,
                                                    maxCoins: 5000,
                                                    tokens: 10,
                                                    spins: 50,
                                                    level: 5
                                                },
                                                (step, current, total) => {
                                                    setBulkProgress({ step, current, total });
                                                }
                                            );
                                            alert('✅ Bulk operation complete!');
                                        } catch (error) {
                                            console.error(error);
                                            alert('❌ Error: ' + error);
                                        } finally {
                                            setIsBulkProcessing(false);
                                        }
                                    }}
                                    disabled={isBulkProcessing}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all text-lg"
                                >
                                    {isBulkProcessing ? `⏳ ${bulkProgress.step} (${bulkProgress.current}%)` : '🚀 RESET & POPULATE ALL USERS'}
                                </button>

                                {isBulkProcessing && (
                                    <div className="mt-4 bg-gray-800 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                                            style={{ width: `${bulkProgress.current}%` }}
                                        />
                                    </div>
                                )}

                                <div className="mt-6 bg-black/50 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-white mb-2">Configuration:</h4>
                                    <ul className="text-xs text-gray-400 space-y-1">
                                        <li>• Coins: Random 4,000 - 5,000</li>
                                        <li>• Tokens: 10</li>
                                        <li>• Total Spins: 50</li>
                                        <li>• Level: 5</li>
                                        <li>• Syncs all users to current week leaderboard</li>
                                    </ul>
                                </div>

                                {/* Clear Test Data Option */}
                                <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-4">🧹 Clear Test Data</h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Reset all user values to 0 (coins, tokens, spins, level). Users won't be deleted, just their data will be cleared.
                                    </p>

                                    <button
                                        onClick={async () => {
                                            if (!confirm('This will set all users data to 0!\\n\\nAre you sure?')) return;

                                            setIsBulkProcessing(true);
                                            try {
                                                const { resetAllUsersToZero } = await import('../../services/bulkDataService');
                                                await resetAllUsersToZero((current, total) => {
                                                    const percent = Math.floor((current / total) * 100);
                                                    setBulkProgress({ step: 'Clearing test data...', current: percent, total: 100 });
                                                });
                                                alert('✅ All test data cleared!');
                                            } catch (error) {
                                                console.error(error);
                                                alert('❌ Error: ' + error);
                                            } finally {
                                                setIsBulkProcessing(false);
                                            }
                                        }}
                                        disabled={isBulkProcessing}
                                        className="w-full px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-bold rounded-lg transition-all"
                                    >
                                        {isBulkProcessing ? `⏳ ${bulkProgress.step} (${bulkProgress.current}%)` : '🧹 CLEAR TEST DATA (Set to 0)'}
                                    </button>

                                    <div className="mt-4 bg-black/50 rounded-lg p-3">
                                        <p className="text-xs text-gray-400">
                                            Sets: Coins=0, Tokens=0, E-Tokens=0, Spins=0, Level=1
                                        </p>
                                    </div>
                                </div>

                                {/* Tie-Breaker Verification (Temporary) */}
                                <div className="mt-8 bg-blue-900/20 border border-blue-500/50 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-blue-400 mb-2">🧪 Verify Tie-Breaker Logic</h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Creates User A (Early) and User B (Late) with same score, then checks who is ranked higher.
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={async () => {
                                                setIsBulkProcessing(true);
                                                try {
                                                    const { verifyTieBreaker } = await import('../../services/bulkDataService');
                                                    const result = await verifyTieBreaker();
                                                    alert(result);
                                                } catch (error) {
                                                    alert('Error: ' + error);
                                                } finally {
                                                    setIsBulkProcessing(false);
                                                }
                                            }}
                                            disabled={isBulkProcessing}
                                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
                                        >
                                            RUN TEST
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsBulkProcessing(true);
                                                try {
                                                    const { clearTestUsers } = await import('../../services/bulkDataService');
                                                    const result = await clearTestUsers();
                                                    alert(result);
                                                } catch (error) {
                                                    alert('Error: ' + error);
                                                } finally {
                                                    setIsBulkProcessing(false);
                                                }
                                            }}
                                            disabled={isBulkProcessing}
                                            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
                                        >
                                            🧹 CLEAR TEST DATA
                                        </button>
                                    </div>
                                </div>

                                {/* DANGER ZONE - Delete All */}
                                <div className="mt-8 bg-red-950/30 border-2 border-red-600 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ DANGER ZONE</h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        This will PERMANENTLY DELETE all users and leaderboard data from Firebase. This cannot be undone!
                                    </p>

                                    <button
                                        onClick={async () => {
                                            const confirm1 = confirm('⚠️ WARNING: This will DELETE ALL USERS from Firebase!\n\nAre you ABSOLUTELY sure?');
                                            if (!confirm1) return;

                                            const confirm2 = confirm('⚠️ FINAL WARNING: All user data and leaderboard will be PERMANENTLY DELETED!\n\nType YES in your mind and click OK to proceed.');
                                            if (!confirm2) return;

                                            setIsBulkProcessing(true);
                                            try {
                                                await deleteAllTestData((current, total) => {
                                                    const percent = Math.floor((current / total) * 100);
                                                    setBulkProgress({ step: 'Deleting all data...', current: percent, total: 100 });
                                                });
                                                alert('✅ All test data deleted from Firebase!');
                                            } catch (error) {
                                                console.error(error);
                                                alert('❌ Error: ' + error);
                                            } finally {
                                                setIsBulkProcessing(false);
                                            }
                                        }}
                                        disabled={isBulkProcessing}
                                        className="w-full px-6 py-4 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all text-lg border-2 border-red-500"
                                    >
                                        {isBulkProcessing ? `⏳ ${bulkProgress.step} (${bulkProgress.current}%)` : '🗑️ DELETE ALL TEST DATA'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                            {/* FORCE SUPER MODE (NEW) */}
                            <div className="p-6 rounded-xl border-2 bg-purple-900/20 border-purple-500/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-lg bg-purple-600 text-white">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Force Super Mode</h3>
                                            <p className="text-sm text-gray-400">Activate 1h Boost for Self</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleForceSuperMode}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-900/50 active:scale-95 transition-all w-full"
                                        >
                                            ACTIVATE
                                        </button>
                                        <button
                                            onClick={handleDeactivateSuperMode}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-900/50 active:scale-95 transition-all w-full"
                                        >
                                            DEACTIVATE
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Instantly sets 100 spins (Activate) or clears timer (Deactivate).
                                </p>
                            </div>

                            {/* DAILY GOAL TEST TOOLS */}
                            <div className="p-6 rounded-xl border-2 bg-blue-900/20 border-blue-500/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-lg bg-blue-600 text-white">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Test Daily Goal</h3>
                                            <p className="text-sm text-gray-400">Jump to 95 Spins</p>
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={async () => {
                                                if (!auth.currentUser) return;
                                                const userRef = doc(db, 'users', auth.currentUser.uid);
                                                await updateDoc(userRef, { spinsToday: 95 });
                                                alert("⚡ Spins set to 95! Spin 5 more times to test Super Mode.");
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/50 active:scale-95 transition-all w-full"
                                        >
                                            SET 95 SPINS
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Sets 'spinsToday' to 95. Spin 5 times manually to verify the 100-spin trigger.
                                </p>
                            </div>

                            {/* Maintenance Mode */}
                            <div className={`p-6 rounded-xl border-2 transition-all ${isMaintenanceMode ? 'bg-red-900/20 border-red-500' : 'bg-gray-900/50 border-gray-800'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-lg ${isMaintenanceMode ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Maintenance Mode</h3>
                                            <p className="text-sm text-gray-400">Lock site for all users</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${isMaintenanceMode ? 'bg-red-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isMaintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    When active, users will see a "Under Maintenance" screen. Admins can still access the site.
                                </p>
                            </div>

                            {/* Sunday Bypass */}
                            <div className={`p-6 rounded-xl border-2 transition-all ${isSundayBypass ? 'bg-green-900/20 border-green-500' : 'bg-gray-900/50 border-gray-800'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-lg ${isSundayBypass ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                            <Power size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Force Event Mode</h3>
                                            <p className="text-sm text-gray-400">Bypass Sunday restriction</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsSundayBypass(!isSundayBypass)}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${isSundayBypass ? 'bg-green-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isSundayBypass ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Forces the Event page to be accessible to everyone, ignoring the Sunday 7PM rule.
                                </p>
                            </div>

                            {/* Server Reset */}
                            <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800 md:col-span-2">
                                <h3 className="text-lg font-bold text-white mb-4">Danger Zone</h3>
                                <div className="flex items-center justify-between p-4 border border-red-900/30 bg-red-900/10 rounded-lg">
                                    <div>
                                        <h4 className="font-bold text-red-400">Restart Server</h4>
                                        <p className="text-xs text-red-300/70">Clears all temporary sessions and caches.</p>
                                    </div>
                                    <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">
                                        RESTART NOW
                                    </button>
                                </div>

                                {/* Time Simulation (Testing Tools) */}
                                <div className="p-6 rounded-xl bg-blue-900/20 border border-blue-500/50 md:col-span-2">
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 rounded-lg bg-blue-600 text-white">
                                                <RefreshCw size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Weekly Reset Test</h3>
                                                <p className="text-sm text-gray-400">Jump to 15s before Reset</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                                            <button
                                                onClick={handleTestWeeklyReset}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors w-full md:w-auto text-center"
                                            >
                                                JUMP TO SUNDAY 11:59:45 PM
                                            </button>
                                            <button
                                                onClick={handleClearTimeSimulation}
                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors w-full md:w-auto text-center"
                                            >
                                                RESET TO REAL TIME
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-300/70">
                                        Use this to verify the automatic coin conversion and leaderboard reset logic. The app will reload and the Timer will show ~15 seconds left.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

// Helper Component for Stats
const StatCard = ({ title, value, icon, trend, color }: any) => (
    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl hover:border-gray-700 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-black text-white mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-${color}-900/20`}>
                {icon}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {trend}
            </span>
            <span className="text-xs text-gray-500">vs yesterday</span>
        </div>
    </div>
);

export default AdminDashboard;
