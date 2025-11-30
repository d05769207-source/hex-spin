import React, { useEffect, useState } from 'react';
import { X, Trophy, CheckCircle, Lock } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { getLevelProgress } from '../utils/levelUtils';
import EToken from './EToken';
import KTMToken from './KTMToken';
import IPhoneToken from './iPhoneToken';

interface UserProfileModalProps {
    userId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, isOpen, onClose }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            const fetchUser = async () => {
                setLoading(true);
                try {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        setUser(userDoc.data() as User);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchUser();
        } else {
            setUser(null);
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    // Calculate Level Data (Default to 0 if user not loaded yet)
    const levelData = getLevelProgress(user?.totalSpins || 0);
    const currentLevel = levelData.currentLevel;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Loading Profile...</p>
                    </div>
                ) : user ? (
                    <div className="p-6">
                        {/* Header Section (Copied & Adapted from Profile.tsx) */}
                        <div className="bg-gray-800/50 border border-white/5 rounded-2xl p-4 mb-6 relative overflow-hidden">
                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="flex items-center justify-between relative z-10">
                                {/* Left: Photo & Level */}
                                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-sm opacity-50"></div>
                                        <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                                            <img
                                                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-wider">
                                            LVL {currentLevel}
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Name & Progress */}
                                <div className="flex-1 flex flex-col justify-center px-4">
                                    <h3 className="text-lg font-bold text-white truncate">{user.username || 'Unknown User'}</h3>

                                    {/* Level Progress Bar */}
                                    <div className="w-full mt-2">
                                        <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                                            <span>Lvl {currentLevel}</span>
                                            <span>{Math.floor(levelData.progress)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                style={{ width: `${levelData.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-gray-800/50 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
                                    <span className="text-yellow-400 font-bold text-xl drop-shadow-sm">{(user.coins || 0).toLocaleString()}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                                    <span className="text-lg">💰</span>
                                </div>
                            </div>
                            <div className="bg-gray-800/50 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Spins</span>
                                    <span className="text-blue-400 font-bold text-xl drop-shadow-sm">{user.totalSpins || 0}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <span className="text-lg">🎰</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Wins Placeholder (Static for now as we don't track per-user history publicly yet) */}
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <h4 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Recent Activity</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30">
                                            <span className="text-lg">🏆</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-yellow-400">Played Hex Spin</p>
                                            <p className="text-[10px] text-gray-500">Active Player</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500">Recently</span>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400">
                        User not found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;
