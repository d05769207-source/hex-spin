import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Activity,
    Settings,
    LogOut,
    Search,
    Bell,
    ShieldCheck as Shield,
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
    Trophy,
    Download,
    Bot
} from 'lucide-react';
import { supabase, auth } from '../../supabaseClient';
import { setSimulatedTimeOffset, clearSimulatedTime, getWeekEndDate, getCurrentTime, getCurrentWeekId } from '../../utils/weekUtils';
import { forceClearMaintenanceMode } from '../../services/maintenanceService';
import { bulkResetAndPopulate, deleteAllTestData } from '../../services/bulkDataService';
import { getDashboardStats, getUsersList, AdminStats } from '../../services/adminService';
import { BotManagementPanel } from './BotManagementPanel';
import { User } from '../../types'; // Import real User type

interface AdminDashboardProps {
    onLogout: () => void;
    onBackToGame: () => void;
}

// Extend User for UI display if needed (e.g. status)
interface UIUser extends User {
    status: 'online' | 'offline';
    lastLogin: string; // Formatted string
    ip: string;
    balance: number; // For display compatibility
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToGame }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'settings' | 'bots' | 'bulkdata' | 'events'>('dashboard');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isSundayBypass, setIsSundayBypass] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Real Data States
    const [stats, setStats] = useState<AdminStats>({
        online_users: 0,
        total_registrations: 0,
        spins_today: 0,
        rewards_distributed: 0
    });
    const [users, setUsers] = useState<UIUser[]>([]);
    const [lastUserDoc, setLastUserDoc] = useState<any>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Bulk Data State
    const [bulkProgress, setBulkProgress] = useState({ step: '', current: 0, total: 100 });
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Broadcast Message State
    const [broadcastMsg, setBroadcastMsg] = useState('');

    // Sunday Lottery Real-time Data
    const [eventData, setEventData] = useState<any>(null);

    // Fetch Event Data for Admin Controls
    useEffect(() => {
        const channel = supabase
            .channel('sunday_lottery_events_admin')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'events',
                filter: 'id=eq.sunday_lottery'
            }, async (payload) => {
                if (payload.new) {
                    setEventData(payload.new);
                }
            })
            .subscribe();

        // Initial fetch
        const fetchInitialData = async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', 'sunday_lottery')
                .single();

            if (data && !error) {
                setEventData(data);
            }
        };

        fetchInitialData();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch Stats on Mount
    useEffect(() => {
        const fetchStats = async () => {
            const data = await getDashboardStats();
            setStats(data);
        };
        fetchStats();

        // Refresh stats every minute
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    // Fetch Users when tab changes
    useEffect(() => {
        if (activeTab === 'users' && users.length === 0) {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async (reset = false) => {
        setIsLoadingUsers(true);
        try {
            const result = await getUsersList(20, reset ? null : lastUserDoc, userSearch);

            const mappedUsers: UIUser[] = result.users.map((u: any) => ({
                ...u,
                status: u.status || 'offline',
                lastLogin: u.lastActive ? u.lastActive.toLocaleString() : 'Never',
                ip: u.ip || 'N/A',
                balance: u.coins || 0
            }));

            if (reset) {
                setUsers(mappedUsers);
            } else {
                setUsers(prev => {
                    const existingIds = new Set(prev.map(u => u.id));
                    const newUniqueUsers = mappedUsers.filter(u => !existingIds.has(u.id));
                    return [...prev, ...newUniqueUsers];
                });
            }
            setLastUserDoc(result.lastDoc);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleBroadcast = (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMsg) return;
        alert(`📢 Broadcast sent to all users: "${broadcastMsg}"`);
        setBroadcastMsg('');
    };

    const handleForceSuperMode = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Error: No user logged in.");
            return;
        }

        try {
            // 1 Hour fallback + 50 Spins logic
            const endTime = new Date(Date.now() + 60 * 60 * 1000);

            await supabase
                .from('users')
                .update({
                    spins_today: 100,
                    super_mode_spins_left: 50,
                    super_mode_end_time: endTime
                })
                .eq('uid', user.id);

            alert("⚡ Super Mode Activated: Given 50 Spins!");
        } catch (error) {
            console.error("Error activating Super Mode:", error);
            alert("Failed to activate Super Mode.");
        }
    };

    const handleDeactivateSuperMode = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            await supabase
                .from('users')
                .update({
                    super_mode_end_time: null,
                    super_mode_spins_left: 0
                })
                .eq('uid', user.id);
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

    const handleClearStuckMaintenance = async () => {
        if (confirm('⚠️ Force Clear Maintenance Mode?\n\nThis will clear all stuck countdowns and maintenance states from the database.\n\nProceed?')) {
            try {
                await forceClearMaintenanceMode();
                alert('✅ Maintenance mode cleared! The app should now work normally.');
            } catch (error) {
                console.error('Error clearing maintenance mode:', error);
                alert('❌ Failed to clear maintenance mode. Check console for details.');
            }
        }
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
                    <NavItem id="events" icon={Trophy} label="Event Control" />
                    <NavItem id="bulkdata" icon={Settings} label="Bulk Data" />
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
                        {activeTab === 'bots' && 'Bot Management System V2 (Global Check)'}
                        {activeTab === 'events' && 'Event Management'}
                        {activeTab === 'bulkdata' && 'Bulk Data Management'}
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
                                    value={stats.online_users}
                                    icon={<Users size={24} className="text-green-400" />}
                                    trend="+12%"
                                    color="green"
                                />
                                <StatCard
                                    title="Total Spins"
                                    value={stats.spins_today}
                                    icon={<RefreshCw size={24} className="text-blue-400" />}
                                    trend="+5%"
                                    color="blue"
                                />
                                <StatCard
                                    title="Registrations"
                                    value={stats.total_registrations}
                                    icon={<Activity size={24} className="text-yellow-400" />}
                                    trend="+24"
                                    color="yellow"
                                />
                                <StatCard
                                    title="Rewards Given"
                                    value={stats.rewards_distributed}
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

                            {/* Emergency Maintenance Clear */}
                            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 md:p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" size={20} /> Emergency Maintenance Clear
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    Use this if the app is stuck in "NEW WEEK STARTING!" or maintenance countdown mode.
                                </p>
                                <button
                                    onClick={handleClearStuckMaintenance}
                                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} /> FORCE CLEAR MAINTENANCE MODE
                                </button>
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
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            // You might want to debounce this in a real app
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                fetchUsers(true);
                                            }
                                        }}
                                        placeholder="Search username (Enter to search)..."
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
                            {lastUserDoc && (
                                <div className="p-4 border-t border-gray-800 flex justify-center">
                                    <button
                                        onClick={() => fetchUsers(false)}
                                        disabled={isLoadingUsers}
                                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold text-gray-300 disabled:opacity-50"
                                    >
                                        {isLoadingUsers ? 'Loading...' : 'Load More Users'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOTS TAB */}
                    {activeTab === 'bots' && (
                        <BotManagementPanel />
                    )}

                    {/* EVENTS TAB */}
                    {activeTab === 'events' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/50 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Trophy className="text-pink-400" size={28} />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Event Management</h3>
                                        <p className="text-sm text-gray-400">Control Lottery and Special Events</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Live Event Master Control</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    Single button control for the entire Sunday Lottery flow. Use this if automation fails.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    {/* Status Display */}
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Current Status</p>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-3 h-3 rounded-full ${eventData?.status?.includes('LIVE') ? 'bg-green-500 animate-pulse' :
                                                eventData?.status === 'ENDED' ? 'bg-red-500' : 'bg-yellow-500'
                                                }`} />
                                            <span className="text-xl font-black text-white">{eventData?.status || 'UNKNOWN'}</span>
                                        </div>

                                        <div className="space-y-2 text-xs font-mono text-gray-400">
                                            <div className="flex justify-between">
                                                <span>iPhone Start:</span>
                                                <span className="text-white">{eventData?.iphone_start ? new Date(eventData.iphone_start).toLocaleString() : '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>KTM Start:</span>
                                                <span className="text-white">{eventData?.ktm_start ? new Date(eventData.ktm_start).toLocaleString() : '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={async () => {
                                                const currentStatus = eventData?.status || 'WAITING';

                                                // Prevent action if already live
                                                if (currentStatus.includes('LIVE')) {
                                                    alert("Event is currently LIVE. Please wait for it to finish.");
                                                    return;
                                                }

                                                const now = getCurrentTime();
                                                const tenMinsLater = new Date(now.getTime() + 10 * 60 * 1000);

                                                let nextUpdate = {};
                                                let actionName = '';

                                                // LOGIC: Check which draw to start based on existing winners
                                                if (!eventData?.iphone_winner) {
                                                    // 1. Start iPhone Draw (Full 10 Min Auto)
                                                    const iphoneNum = Math.floor(Math.random() * 900000) + 100000;
                                                    nextUpdate = {
                                                        status: 'LIVE_IPHONE',
                                                        iphone_start: now,
                                                        iphone_end: tenMinsLater,
                                                        iphone_winner: { number: iphoneNum, name: 'Lucky Winner' }, // Set winner IMMEDIATELY for progressive reveal
                                                        last_updated: new Date()
                                                    };
                                                    actionName = `START iPHONE DRAW (Winner: ${iphoneNum})`;
                                                }
                                                else if (!eventData?.ktm_winner) {
                                                    // 2. Start KTM Draw (Full 10 Min Auto)
                                                    const ktmNum = Math.floor(Math.random() * 900000) + 100000;
                                                    nextUpdate = {
                                                        status: 'LIVE_KTM',
                                                        ktm_start: now,
                                                        ktm_end: tenMinsLater,
                                                        ktm_winner: { number: ktmNum, name: 'Lucky Winner' }, // Set winner IMMEDIATELY for progressive reveal
                                                        last_updated: new Date()
                                                    };
                                                    actionName = `START KTM DRAW (Winner: ${ktmNum})`;
                                                }
                                                else {
                                                    if (confirm("Event Ended. Reset for Next Sunday?")) {
                                                        alert("Use 'Initialize Database' below to reset for next week.");
                                                        return;
                                                    }
                                                    return;
                                                }

                                                if (confirm(`Action: ${actionName}\n\nThis will start the 10-minute progressive reveal animation. The winner is pre-selected but revealed slowly to users.\n\nProceed?`)) {
                                                    await supabase
                                                        .from('events')
                                                        .update(nextUpdate)
                                                        .eq('id', 'sunday_lottery');
                                                }
                                            }}
                                            disabled={eventData?.status?.includes('LIVE')}
                                            className={`
                                                w-full px-6 py-4 font-black text-xl rounded-xl transition-all shadow-lg flex flex-col items-center justify-center gap-1
                                                ${eventData?.status?.includes('LIVE')
                                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border border-green-400/50 shadow-green-900/40 hover:scale-[1.02] active:scale-[0.98]'
                                                }
                                            `}
                                        >
                                            {eventData?.status?.includes('LIVE') ? (
                                                <>
                                                    <span className="flex items-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> EVENT IN PROGRESS</span>
                                                    <span className="text-[10px] uppercase tracking-wider font-normal opacity-60">System is running automated show</span>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Dynamic Label based on state */}
                                                    <span>
                                                        {!eventData?.iphone_winner ? '▶ START iPHONE EVENT' :
                                                            !eventData?.ktm_winner ? '▶ START KTM EVENT' :
                                                                'EVENT COMPLETED'}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-wider font-normal opacity-80">
                                                        {!eventData?.iphone_winner || !eventData?.ktm_winner ? 'Click to Start 10-Min Auto Draw' : 'Reset Required'}
                                                    </span>
                                                </>
                                            )}
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    if (confirm("Force Stop & Reset to WAITING?")) {
                                                        await supabase
                                                            .from('events')
                                                            .update({ status: 'WAITING' })
                                                            .eq('id', 'sunday_lottery');
                                                    }
                                                }}
                                                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-bold rounded-lg border border-gray-700"
                                            >
                                                ⚠ FORCE STOP
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LOGIC TEST LAB */}
                            <div className="bg-gray-900/50 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden mb-6">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Bot size={100} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="text-2xl">🧪</span> Logic Test Lab (Time Travel)
                                </h3>
                                <p className="text-sm text-gray-400 mb-6 max-w-2xl">
                                    Simulate different times to verify event logic without waiting.
                                    <strong> Use "Reset to Real Time" when done!</strong>
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 relative z-10">
                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(18, 30, 0, 0);
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⏳ Time Travel: Sunday 6:30 PM (Entry Open)\nRefresh Event Page!");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        1. Pre-Event (6:30 PM)
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Entry Allowed</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(23, 59, 45, 0); // 15 seconds before midnight
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⚡ TEST MODE: Time jumps to Sunday 11:59:45 PM.\n\nWatch the console/status!\n1. Time hits 12:00 -> Week Changes.\n2. Auto-Pilot detects change.\n3. Maintenance starts automatically.\n4. Reset runs automatically.");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded-lg text-red-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        3. ⚡ Simulate Reset Event
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Jumps to Sun 11:59:45 PM</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(18, 55, 0, 0);
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⏳ Time Travel: Sunday 6:55 PM (Entry Closed)\nRefresh Event Page!");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        2. Locked (6:55 PM)
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Entry Blocked</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(19, 0, 5, 0); // 7:00:05 PM
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⏳ Time Travel: Sunday 7:00 PM (iPhone Start)\nRefresh Event Page to see Auto-Trigger!");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        3. iPhone Live (7:00 PM)
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Auto-Start Trigger</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(20, 0, 5, 0); // 8:00:05 PM
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⏳ Time Travel: Sunday 8:00 PM (KTM Start)\nRefresh Event Page!");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        4. KTM Live (8:00 PM)
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Auto-Start Trigger</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const daysUntilSunday = (7 - now.getDay()) % 7;
                                            const target = new Date(now);
                                            target.setDate(now.getDate() + daysUntilSunday);
                                            target.setHours(21, 5, 0, 0); // 9:05 PM
                                            const offset = target.getTime() - Date.now();
                                            setSimulatedTimeOffset(offset);
                                            alert("⏳ Time Travel: Sunday 9:05 PM\nCheck if User Data Resets!");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-indigo-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        5. Post-Event (9:05 PM)
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Weekly Reset Test</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            clearSimulatedTime();
                                            alert("✅ Time Reset to Real Time.");
                                            window.location.reload();
                                        }}
                                        className="p-3 bg-green-900/40 hover:bg-green-900/60 border border-green-500/30 rounded-lg text-green-200 text-xs font-bold text-left hover:scale-[1.02] transition-transform"
                                    >
                                        🔁 Reset to Real Time
                                        <div className="text-[10px] opacity-60 font-normal mt-1">Disable Simulation</div>
                                    </button>
                                </div>

                                <div className="border-t border-indigo-500/20 pt-4">
                                    <button
                                        onClick={async () => {
                                            if (confirm("💥 FORCE RESET EVENT DATA?\n\nThis will clear winners and set status to WAITING. Use this to re-run tests.")) {
                                                await supabase
                                                    .from('events')
                                                    .update({
                                                        status: 'WAITING',
                                                        iphone_winner: null,
                                                        ktm_winner: null
                                                    })
                                                    .eq('id', 'sunday_lottery');
                                                alert("💥 Event Data Reset!");
                                            }
                                        }}
                                        className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded hover:text-red-300 text-xs font-black tracking-widest transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} /> FORCE RESET DATA (CLEAR WINNERS)
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4">Sunday Lottery Setup</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    Initialize the database for Sunday Lottery. This sets the schedule for next Sunday.
                                </p>

                                <button
                                    onClick={async () => {
                                        if (!confirm('Initialize Sunday Lottery Database?')) return;
                                        try {
                                            // Get next Sunday's date for reference
                                            const now = new Date();
                                            let targetDate = new Date();

                                            // Check if today is Sunday
                                            if (now.getDay() === 0) {
                                                // If it's Sunday, check if we are past the event start time (e.g., 7 PM)
                                                // If it's before 7 PM (19:00), we can still schedule for today!
                                                if (now.getHours() < 19) {
                                                    targetDate = now; // Schedule for TODAY
                                                } else {
                                                    // Already started/past, schedule for NEXT Sunday
                                                    targetDate.setDate(now.getDate() + 7);
                                                }
                                            } else {
                                                // Not Sunday, calculate days until next Sunday
                                                const daysUntilSunday = (7 - now.getDay()) % 7;
                                                targetDate.setDate(now.getDate() + daysUntilSunday);
                                            }

                                            // Set basic time (just for initialization, real updates will happen via Admin panel or scheduled jobs)
                                            const iphoneStart = new Date(targetDate);
                                            iphoneStart.setHours(19, 0, 0, 0); // 7:00 PM

                                            const iphoneEnd = new Date(targetDate);
                                            iphoneEnd.setHours(19, 10, 0, 0); // 7:10 PM

                                            const ktmStart = new Date(targetDate);
                                            ktmStart.setHours(20, 0, 0, 0); // 8:00 PM

                                            const ktmEnd = new Date(targetDate);
                                            ktmEnd.setHours(20, 10, 0, 0); // 8:10 PM

                                            const eventData = {
                                                iphone_start: iphoneStart,
                                                iphone_end: iphoneEnd,
                                                ktm_start: ktmStart,
                                                ktm_end: ktmEnd,
                                                iphone_winner: null,
                                                ktm_winner: null,
                                                status: 'WAITING', // WAITING, LIVE_IPHONE, LIVE_KTM, ENDED
                                                last_updated: new Date()
                                            };

                                            await supabase
                                                .from('events')
                                                .upsert(eventData, { onConflict: 'id' });
                                            alert('✅ Sunday Lottery Initialized Successfully!');
                                        } catch (error) {
                                            console.error(error);
                                            alert('❌ Error: ' + error);
                                        }
                                    }}
                                    className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                                >
                                    <Zap size={20} />
                                    INITIALIZE DATABASE
                                </button>
                            </div>
                        </div>
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
                                                    await clearTestUsers((c, t) => console.log(`Deleting: ${c}/${t}`));
                                                    alert('✅ Test data cleared!');
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
                                        This will PERMANENTLY DELETE all users and leaderboard data from Supabase. This cannot be undone!
                                    </p>

                                    <button
                                        onClick={async () => {
                                            const confirm1 = confirm('⚠️ WARNING: This will DELETE ALL USERS from Supabase!\n\nAre you ABSOLUTELY sure?');
                                            if (!confirm1) return;

                                            const confirm2 = confirm('⚠️ FINAL WARNING: All user data and leaderboard will be PERMANENTLY DELETED!\n\nType YES in your mind and click OK to proceed.');
                                            if (!confirm2) return;

                                            setIsBulkProcessing(true);
                                            try {
                                                await deleteAllTestData((current, total) => {
                                                    const percent = Math.floor((current / total) * 100);
                                                    setBulkProgress({ step: 'Deleting all data...', current: percent, total: 100 });
                                                });
                                                alert('✅ All test data deleted from Supabase!');
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
                                                const { data: { user } } = await supabase.auth.getUser();
                                                if (!user) return;
                                                await supabase
                                                    .from('users')
                                                    .update({ spins_today: 95 })
                                                    .eq('uid', user.id);
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
            </div >
        </div >
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
