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
    X
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'settings'>('dashboard');
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isSundayBypass, setIsSundayBypass] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
