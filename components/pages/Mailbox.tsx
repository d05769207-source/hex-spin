import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Bell, Clock, Gift, CheckCircle, Loader } from 'lucide-react';
import { User, MailboxMessage, MessageType, MessageStatus } from '../../types';
import { getUserMessages, claimMessage, markMessageAsRead } from '../../services/mailboxService';
import EToken from '../EToken';

interface MailboxProps {
    onBack: () => void;
    user: User | null;
    onRewardClaimed?: (amount: number, type: string) => void;
}

type TabType = 'INBOX' | 'NOTICE';

const Mailbox: React.FC<MailboxProps> = ({ onBack, user, onRewardClaimed }) => {
    const [activeTab, setActiveTab] = useState<TabType>('INBOX');
    const [messages, setMessages] = useState<MailboxMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load messages on mount and when user changes
    useEffect(() => {
        if (user && !user.isGuest) {
            loadMessages();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadMessages = async (silent = false) => {
        if (!user || user.isGuest) return;

        if (!silent) setLoading(true);
        try {
            const fetchedMessages = await getUserMessages(user.id);
            setMessages(fetchedMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleClaimReward = async (message: MailboxMessage) => {
        if (!user || claiming) return;

        setClaiming(message.id);
        try {
            const result = await claimMessage(message.id, user.id);

            if (result.success) {
                // Show success feedback via Toast
                showNotification(`🎉 Claimed ${result.rewardAmount} ${result.rewardType}!`, 'success');

                // Notify parent component to update balance
                if (onRewardClaimed) {
                    onRewardClaimed(result.rewardAmount, result.rewardType);
                }

                // OPTIMISTIC UPDATE: Remove message locally immediately
                setMessages(prev => prev.filter(m => m.id !== message.id));

                // Reload messages silently to sync state
                await loadMessages(true);
            }
        } catch (error: any) {
            showNotification(`Failed to claim: ${error.message}`, 'error');
        } finally {
            setClaiming(null);
        }
    };

    const handleMarkAsRead = async (message: MailboxMessage) => {
        if (message.status === MessageStatus.UNREAD) {
            await markMessageAsRead(message.id);
            // Update local state
            setMessages(prev => prev.map(m =>
                m.id === message.id ? { ...m, status: MessageStatus.READ } : m
            ));
        }
    };

    const getTimeRemaining = (expiresAt: Date): string => {
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
            return `${days}d ${hours}h left`;
        } else {
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m left`;
        }
    };

    const inboxMessages = messages.filter(m => m.type === MessageType.WEEKLY_REWARD && m.status !== MessageStatus.CLAIMED);
    const noticeMessages = messages.filter(m => m.type === MessageType.NOTICE || m.type === MessageType.SYSTEM);

    return (
        <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <h1 className="text-2xl font-black text-white uppercase tracking-wider">
                    Mailbox
                </h1>

                <div className="w-10" /> {/* Spacer for alignment */}
            </div>

            {/* Tabs */}
            <div className="flex bg-black/40 rounded-full p-1 border border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('INBOX')}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'INBOX'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Mail size={16} />
                    Inbox
                    {inboxMessages.length > 0 && (
                        <span className="bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                            {inboxMessages.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('NOTICE')}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'NOTICE'
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Bell size={16} />
                    Notice
                    {noticeMessages.length > 0 && (
                        <span className="bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                            {noticeMessages.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <Loader className="animate-spin text-yellow-500" size={32} />
                        <p className="text-gray-400 text-sm">Loading messages...</p>
                    </div>
                ) : (
                    <>
                        {/* Inbox Tab */}
                        {activeTab === 'INBOX' && (
                            <div className="space-y-3">
                                {inboxMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                            <Mail size={32} className="text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 text-sm">No rewards to claim</p>
                                        <p className="text-gray-600 text-xs text-center max-w-xs">
                                            Weekly rewards will appear here after the weekly reset
                                        </p>
                                    </div>
                                ) : (
                                    inboxMessages.map((message) => (
                                        <div
                                            key={message.id}
                                            onClick={() => handleMarkAsRead(message)}
                                            className={`bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-2 ${message.status === MessageStatus.UNREAD
                                                ? 'border-yellow-500/50'
                                                : 'border-white/10'
                                                } rounded-xl p-4 relative overflow-hidden cursor-pointer hover:border-yellow-500/70 transition-all`}
                                        >
                                            {/* Background glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                            {/* Unread indicator */}
                                            {message.status === MessageStatus.UNREAD && (
                                                <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            )}

                                            <div className="relative z-10">
                                                {/* Icon and Title */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                                                        <Gift size={24} className="text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-white font-black text-base mb-1">
                                                            {message.title}
                                                        </h3>
                                                        <p className="text-gray-300 text-xs leading-relaxed">
                                                            {message.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reward Display */}
                                                <div className="bg-black/30 rounded-lg p-3 mb-3 border border-white/10">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-400 text-xs uppercase tracking-wider">Reward</span>
                                                        <div className="flex items-center gap-2">
                                                            {message.rewardType === 'E_TOKEN' && <EToken size={20} />}
                                                            <span className="text-yellow-400 font-black text-lg">
                                                                {message.rewardAmount}
                                                            </span>
                                                            <span className="text-gray-400 text-xs">
                                                                {message.rewardType === 'E_TOKEN' ? 'E-Token' : message.rewardType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {message.sourceCoins && (
                                                        <p className="text-gray-500 text-xs mt-2">
                                                            Converted from {message.sourceCoins.toLocaleString()} coins
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Expiry Timer */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Clock size={14} className="text-orange-400" />
                                                    <span className="text-orange-400 text-xs font-bold">
                                                        {getTimeRemaining(message.expiresAt)}
                                                    </span>
                                                </div>

                                                {/* Claim Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClaimReward(message);
                                                    }}
                                                    disabled={claiming === message.id}
                                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 rounded-lg uppercase tracking-wider text-sm shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {claiming === message.id ? (
                                                        <>
                                                            <Loader className="animate-spin" size={16} />
                                                            Claiming...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={16} />
                                                            Claim Reward
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Notice Tab */}
                        {activeTab === 'NOTICE' && (
                            <div className="space-y-3">
                                {noticeMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                            <Bell size={32} className="text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 text-sm">No notices</p>
                                        <p className="text-gray-600 text-xs text-center max-w-xs">
                                            System notifications will appear here
                                        </p>
                                    </div>
                                ) : (
                                    noticeMessages.map((message) => (
                                        <div
                                            key={message.id}
                                            onClick={() => handleMarkAsRead(message)}
                                            className={`bg-gray-900/60 border ${message.status === MessageStatus.UNREAD
                                                ? 'border-cyan-500/50'
                                                : 'border-white/10'
                                                } rounded-xl p-4 relative cursor-pointer hover:bg-gray-900/80 transition-all`}
                                        >
                                            {/* Unread indicator */}
                                            {message.status === MessageStatus.UNREAD && (
                                                <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            )}

                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Bell size={20} className="text-cyan-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-bold text-sm mb-1">
                                                        {message.title}
                                                    </h3>
                                                    <p className="text-gray-400 text-xs leading-relaxed mb-2">
                                                        {message.description}
                                                    </p>
                                                    <span className="text-gray-600 text-xs">
                                                        {message.createdAt.toLocaleDateString()} • {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

            {/* Toast Notification */ }
    {
        toast && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-sm">
                <div className={`
                        px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-white/10
                        flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300
                        ${toast.type === 'success' ? 'bg-black/80 text-green-400' : 'bg-black/80 text-red-400'}
                    `}>
                    <div className={`p-1.5 rounded-full ${toast.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <ArrowLeft size={16} className="rotate-180" />}
                    </div>
                    <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                </div>
            </div>
        )
    }
        </div >
    );
};

export default Mailbox;
