import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Bell, Clock, CheckCircle, Loader } from 'lucide-react';
import { User, MailboxMessage, MessageType, MessageStatus } from '../../types';
import { getUserMessages, claimMessage, markMessageAsRead, markMessagesAsReadBatch } from '../../services/mailboxService';
import EToken from '../EToken';

interface MailboxProps {
    onBack: () => void;
    user: User | null;
    onRewardClaimed?: (amount: number, type: string) => void;
    onMessagesRead?: () => void;
}

type TabType = 'INBOX' | 'NOTICE';

const Mailbox: React.FC<MailboxProps> = ({ onBack, user, onRewardClaimed, onMessagesRead }) => {
    const [activeTab, setActiveTab] = useState<TabType>('INBOX');
    const [messages, setMessages] = useState<MailboxMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Load messages on mount and when user changes
    useEffect(() => {
        if (user && !user.isGuest) {
            loadMessages();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadMessages = async () => {
        if (!user || user.isGuest) return;

        setLoading(true);
        try {
            const fetchedMessages = await getUserMessages(user.id);
            setMessages(fetchedMessages);
        } catch (error) {
            // Error silently handled
        } finally {
            setLoading(false);
        }
    };

    // Auto-cleanup expired messages every second
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMessages(prevMessages => {
                const validMessages = prevMessages.filter(msg => {
                    const expiryTime = new Date(msg.expiresAt).getTime();
                    return expiryTime > now;
                });

                // Only update state if messages were actually removed to prevent unnecessary re-renders
                if (validMessages.length !== prevMessages.length) {
                    return validMessages;
                }
                return prevMessages;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Auto-mark messages as read when viewing tab
    useEffect(() => {
        if (!user || messages.length === 0) return;

        const unreadIds = messages
            .filter(m => {
                if (activeTab === 'INBOX') {
                    // Filter logic for Inbox
                    return (m.type === MessageType.WEEKLY_REWARD || m.type === MessageType.LEVEL_REWARD || m.type === MessageType.REFERRAL_REWARD)
                        && m.status === MessageStatus.UNREAD;
                } else {
                    // Filter logic for Notice
                    return (m.type === MessageType.NOTICE || m.type === MessageType.SYSTEM)
                        && m.status === MessageStatus.UNREAD;
                }
            })
            .map(m => m.id);

        if (unreadIds.length > 0) {
            // Mark as read immediately in UI
            setMessages(prev => prev.map(m =>
                unreadIds.includes(m.id) ? { ...m, status: MessageStatus.READ } : m
            ));

            // Sync with Server (Batch)
            markMessagesAsReadBatch(unreadIds);

            // Notify parent to update global unread count
            if (onMessagesRead) {
                onMessagesRead();
            }
        }
    }, [activeTab, messages, user, onMessagesRead]);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };



    const handleClaimReward = async (message: MailboxMessage) => {
        if (!user || claiming) return;

        setClaiming(message.id);
        try {
            const result = await claimMessage(message.id, user.id);

            if (result.success) {
                // Show success feedback via Toast
                showNotification(`Reward Claimed`, 'success');

                // Notify parent component to update balance
                if (onRewardClaimed) {
                    onRewardClaimed(result.rewardAmount, result.rewardType);
                }

                // Optimistic Update: Update local state immediately to remove item seamlessly
                setMessages(prev => prev.map(m =>
                    m.id === message.id ? { ...m, status: MessageStatus.CLAIMED } : m
                ));
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

    const inboxMessages = messages.filter(m => (m.type === MessageType.WEEKLY_REWARD || m.type === MessageType.LEVEL_REWARD || m.type === MessageType.REFERRAL_REWARD) && m.status !== MessageStatus.CLAIMED);
    const noticeMessages = messages.filter(m => m.type === MessageType.NOTICE || m.type === MessageType.SYSTEM);

    return (
        <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 relative">

            {/* Header with Tabs - Compact */}
            < div className="flex items-center justify-between mb-4" >
                <button
                    onClick={onBack}
                    className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-white transition-colors flex-shrink-0"
                >
                    <ArrowLeft size={18} />
                </button>

                {/* Tabs moved to Header */}
                <div className="flex bg-black/40 rounded-full p-0.5 border border-white/10 mx-auto">
                    <button
                        onClick={() => setActiveTab('INBOX')}
                        className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'INBOX'
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Mail size={16} />
                        <span className="relative">
                            Inbox
                            {inboxMessages.some(m => m.status === MessageStatus.UNREAD) && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,1),0_0_20px_rgba(34,211,238,0.8)] animate-pulse" />
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('NOTICE')}
                        className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'NOTICE'
                            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Bell size={16} />
                        <span className="relative">
                            Notice
                            {noticeMessages.some(m => m.status === MessageStatus.UNREAD) && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,1),0_0_20px_rgba(253,224,71,0.8)] animate-pulse" />
                            )}
                        </span>
                    </button>
                </div>

                <div className="w-8" /> {/* Small spacer balance */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
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
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in duration-500">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                            <Mail size={32} className="text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 text-sm">No rewards to claim</p>
                                        <p className="text-gray-600 text-xs text-center max-w-xs">
                                            Rewards will appear here
                                        </p>
                                    </div>
                                ) : (
                                    inboxMessages.map((message) => (
                                        <div
                                            key={message.id}
                                            onClick={() => handleMarkAsRead(message)}
                                            className={`bg-gradient-to-r from-gray-900/90 to-black/90 border border-white/10 rounded-xl p-3 relative overflow-hidden flex items-center gap-3 animate-in slide-in-from-bottom duration-300`}
                                        >
                                            {/* Unread indicator */}
                                            {message.status === MessageStatus.UNREAD && (
                                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse z-20" />
                                            )}

                                            {/* Left: Icon */}
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0 p-1">
                                                <EToken size={24} />
                                            </div>

                                            {/* Middle: Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-white font-bold text-sm truncate">
                                                        {message.title}
                                                    </h3>
                                                    {/* Timer Badge */}
                                                    <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                                                        <Clock size={10} />
                                                        <span>{getTimeRemaining(message.expiresAt)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    {message.sourceCoins && (
                                                        <>
                                                            <span>{Math.floor(message.sourceCoins / 1000)}k Coins</span>
                                                            <ArrowLeft size={10} className="text-gray-600 rotate-180" />
                                                        </>
                                                    )}
                                                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                                                        {message.rewardAmount} {message.rewardType === 'E_TOKEN' ? 'E-Token' : message.rewardType}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Claim Button */}
                                            <div className="flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClaimReward(message);
                                                    }}
                                                    disabled={claiming === message.id}
                                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs px-4 py-2 rounded-lg uppercase tracking-wider shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-1"
                                                >
                                                    {claiming === message.id ? (
                                                        <Loader size={14} className="animate-spin" />
                                                    ) : (
                                                        'Claim'
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
                                    <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in fade-in duration-500">
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
                                                } rounded-xl p-4 relative cursor-pointer hover:bg-gray-900/80 transition-all animate-in slide-in-from-bottom duration-300`}
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

            {/* Toast Notification - Compact & Centered */}
            {toast && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in w-auto">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-md ${toast.type === 'success'
                        ? 'bg-black/80 border-green-500/30 text-green-400'
                        : 'bg-black/80 border-red-500/30 text-red-400'
                        }`}>
                        {toast.type === 'success' ? (
                            <CheckCircle size={14} className="flex-shrink-0" />
                        ) : (
                            <ArrowLeft size={14} className="rotate-180 flex-shrink-0" />
                        )}
                        <span className="text-xs font-bold whitespace-nowrap">{toast.message}</span>
                    </div>
                </div>
            )}



        </div>
    );
};

export default Mailbox;
