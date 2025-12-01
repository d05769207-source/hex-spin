import React, { useState, useEffect } from 'react';
import { Trophy, Users, Loader2, Plus, X, UserPlus, User as UserIcon, Bell, Search, Check, UserMinus, Copy } from 'lucide-react';
import { auth, db } from '../../firebase';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardEntry, User } from '../../types';
import EToken from '../EToken';
import PrizeImage from '../PrizeImage';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getLevelProgress } from '../../utils/levelUtils';

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRIZE' | 'WEEKLY' | 'FRIENDS'>('WEEKLY');
  const currentUser = auth.currentUser;

  // Use custom hook for leaderboard data
  const { leaderboard, loading, userRank, weekRange } = useLeaderboard(
    currentUser?.uid,
    100
  );

  // Get current user's data from leaderboard
  const [currentUserData, setCurrentUserData] = useState<LeaderboardEntry | null>(null);

  // New States for Menu and Profile View
  const [menuState, setMenuState] = useState<{ id: string; top: number; right: number } | null>(null);
  const [viewProfileUser, setViewProfileUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Friend System States
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false); // New state to control view

  // Mock Friend Requests (Replace with real data later)
  const [friendRequests, setFriendRequests] = useState([
    { id: 'req1', username: 'Crypto_King', photoURL: '', time: '2h ago' },
    { id: 'req2', username: 'Hex_Master', photoURL: '', time: '5h ago' },
    { id: 'req3', username: 'Lucky_Spinner', photoURL: '', time: '1d ago' }
  ]);

  useEffect(() => {
    if (currentUser && leaderboard.length > 0) {
      const userData = leaderboard.find(entry => entry.userId === currentUser.uid);
      if (userData) {
        setCurrentUserData(userData);
      } else if (userRank > 0) {
        // User not in top 100 but has a rank
        setCurrentUserData({
          userId: currentUser.uid,
          username: currentUser.displayName || 'You',
          coins: 0,
          rank: userRank,
          isMe: true
        });
      }
    }
  }, [currentUser, leaderboard, userRank]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuState && !(event.target as Element).closest('.menu-content') && !(event.target as Element).closest('.menu-trigger')) {
        setMenuState(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', () => setMenuState(null));

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', () => setMenuState(null));
    };
  }, [menuState]);

  // Manual Search Function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearchActive(false);
      setSearchResults([]);
      return;
    }

    setIsSearchActive(true);
    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      // Simple search by username (exact match or starts with could be implemented with more complex queries)
      // For now, we'll try to match username exactly or by ID

      const q = query(usersRef, where('username', '>=', searchQuery), where('username', '<=', searchQuery + '\uf8ff'), limit(5));
      const querySnapshot = await getDocs(q);

      const results: User[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) { // Don't show self
          results.push({ id: doc.id, ...doc.data() } as User);
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = async (userId: string) => {
    setMenuState(null);
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setViewProfileUser({ id: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAcceptRequest = (reqId: string) => {
    // Logic to accept request
    setFriendRequests(prev => prev.filter(req => req.id !== reqId));
    // Here you would also update Firestore
  };

  const handleRejectRequest = (reqId: string) => {
    // Logic to reject request
    setFriendRequests(prev => prev.filter(req => req.id !== reqId));
    // Here you would also update Firestore
  };

  const prizeTiers = [
    { ranks: '1', prize: 'KTM Token', value: '₹3,40,000', icon: <PrizeImage prize="KTM" size="sm" glow={false} />, color: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-400' },
    { ranks: '2', prize: 'iPhone Token', value: '₹1,49,000', icon: <PrizeImage prize="iPhone" size="sm" glow={false} />, color: 'from-blue-400 to-purple-500', textColor: 'text-blue-400' },
    { ranks: '3', prize: '200 E-Tokens', icon: null, color: 'from-green-400 to-emerald-500', textColor: 'text-green-400', showEToken: true },
    { ranks: '4-10', prize: '100 E-Tokens', icon: null, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-400', showEToken: true },
    { ranks: '11-20', prize: '50 E-Tokens', icon: null, color: 'from-indigo-400 to-purple-500', textColor: 'text-indigo-400', showEToken: true },
    { ranks: '21-50', prize: '25 E-Tokens', icon: null, color: 'from-pink-400 to-rose-500', textColor: 'text-pink-400', showEToken: true },
    { ranks: '51-100', prize: '10 E-Tokens', icon: null, color: 'from-orange-400 to-red-500', textColor: 'text-orange-400', showEToken: true }
  ];

  const friends = [
    { rank: 45, name: 'Rahul_99', score: 45200, isOnline: true, isMe: false },
    { rank: 128, name: 'Priya_Star', score: 32100, isOnline: false, isMe: false },
    { rank: 567, name: 'Lucky_Gamer', score: 18900, isOnline: true, isMe: false },
    { rank: 1245, name: 'You', score: 5420, isMe: true },
  ];

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 tracking-widest drop-shadow-sm">
          Leaderboard
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/20 mb-4">
        <button
          onClick={() => setActiveTab('PRIZE')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'PRIZE'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Prize Pool
        </button>
        <button
          onClick={() => setActiveTab('WEEKLY')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'WEEKLY'
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('FRIENDS')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'FRIENDS'
            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Friends
        </button>
      </div>

      {/* Prize Pool Section */}
      {activeTab === 'PRIZE' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-left duration-300">
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="text-xl drop-shadow-md">🏆</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-200">Prize Pool - Top 100</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {prizeTiers.map((tier, i) => (
              <div
                key={i}
                className={`bg-gradient-to-r ${tier.color} p-[1px] rounded-lg`}
              >
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between hover:bg-gray-800/90 transition-colors">
                  <div className="flex items-center gap-3">
                    {tier.showEToken ? (
                      <EToken size={24} />
                    ) : (
                      <span className="text-2xl">{tier.icon}</span>
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Rank {tier.ranks}</div>
                      <div className={`text-sm font-black ${tier.textColor}`}>{tier.prize}</div>
                      {/* @ts-ignore */}
                      {tier.value && (
                        /* @ts-ignore */
                        <div className="text-[10px] text-white/80 font-bold">Value: {tier.value}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Rankings Section */}
      {activeTab === 'WEEKLY' && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
          <div className="text-xs text-white mb-3 uppercase tracking-wider font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              This Week Rankings
            </div>
            <span className="text-[10px] text-gray-300 font-bold">{weekRange}</span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                <p className="text-gray-400 text-sm">Loading leaderboard...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && leaderboard.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6 bg-black/40 rounded-xl border border-yellow-500/20">
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3 opacity-50" />
                <p className="text-gray-300 font-bold mb-2">No rankings yet!</p>
                <p className="text-gray-500 text-xs">Be the first to earn coins this week</p>
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          {!loading && leaderboard.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">

              {/* LEADERBOARD LIST (All Ranks) */}
              <div className="space-y-2 pb-4 mt-4">
                {leaderboard.map((player, index) => {
                  const isCurrentUser = currentUser && player.userId === currentUser.uid;

                  // Rank Styles
                  let rankBg = 'bg-gradient-to-br from-gray-800 to-black text-gray-300 border-gray-600 shadow-black/50';
                  let rankColor = 'text-cyan-300';

                  if (player.rank === 1) {
                    rankBg = 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black border-yellow-200 shadow-yellow-500/50';
                    rankColor = 'text-yellow-400';
                  } else if (player.rank === 2) {
                    rankBg = 'bg-gradient-to-br from-gray-300 to-gray-500 text-black border-gray-200 shadow-gray-400/50';
                    rankColor = 'text-gray-300';
                  } else if (player.rank === 3) {
                    rankBg = 'bg-gradient-to-br from-orange-400 to-orange-600 text-black border-orange-200 shadow-orange-500/50';
                    rankColor = 'text-orange-400';
                  } else if (isCurrentUser) {
                    rankBg = 'bg-yellow-500 text-black border-yellow-300 shadow-yellow-900/50';
                    rankColor = 'text-yellow-400';
                  }

                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom ${isCurrentUser
                        ? 'bg-gradient-to-r from-yellow-900/60 to-yellow-800/40 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                        : 'bg-gradient-to-r from-white/10 to-transparent border-white/10 hover:border-white/30 hover:bg-white/15 backdrop-blur-md'
                        }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shadow-inner ${rankBg}`}>
                          {player.rank}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm md:text-base tracking-wide ${isCurrentUser ? 'text-yellow-300' : 'text-gray-100'}`}>
                            {player.username}
                            {isCurrentUser && <span className="text-[10px] ml-2 bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded uppercase">You</span>}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-black text-sm md:text-base tracking-wider ${isCurrentUser ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : rankColor}`}>
                          {player.coins.toLocaleString()}
                        </span>

                        {/* Add Friend / View Profile Menu Trigger */}
                        {!isCurrentUser && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (menuState?.id === player.userId) {
                                  setMenuState(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuState({
                                  id: player.userId,
                                  top: rect.bottom + 8,
                                  right: window.innerWidth - rect.right
                                });
                              }}
                              className="menu-trigger p-1.5 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current User Fixed Footer - ALWAYS VISIBLE */}
          {!loading && currentUserData && currentUserData.rank && (
            <div className="fixed bottom-16 md:bottom-4 left-0 right-0 mx-auto w-full max-w-md px-4 z-30">
              <div className="bg-gradient-to-r from-yellow-900/90 via-black/90 to-yellow-900/90 backdrop-blur-xl border border-yellow-500/60 rounded-xl p-3 flex items-center justify-between shadow-[0_0_25px_rgba(234,179,8,0.25)]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-black flex items-center justify-center text-sm shadow-lg border border-yellow-200">
                    {currentUserData.rank}
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 font-bold text-base">
                    {currentUserData.username}
                  </span>
                </div>
                <span className="text-yellow-400 font-black text-base drop-shadow-sm">{currentUserData.coins.toLocaleString()} 💰</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Friends Section */}
      {activeTab === 'FRIENDS' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="text-xs text-white mb-3 uppercase tracking-wider font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-400" />
              Friends Rankings
            </div>

            {/* Friend Request Trigger */}
            <button
              onClick={() => setShowFriendModal(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
            >
              <Bell size={12} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-300">
                {friendRequests.length > 0 ? `${friendRequests.length} New` : 'Requests'}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {friends.map((friend, idx) => {
              if (friend.isMe) {
                return (
                  <div key={idx} className="sticky bottom-0 mt-4 mb-2">
                    <div className="bg-cyan-900/40 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500 text-black font-black flex items-center justify-center text-xs">
                          {friend.rank}
                        </div>
                        <span className="text-cyan-300 font-bold">{friend.name}</span>
                      </div>
                      <span className="text-white font-bold">{friend.score.toLocaleString()} 💰</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-cyan-500/20 transition-transform hover:scale-[1.01] hover:border-cyan-500/40">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-cyan-800/50 text-cyan-200 font-black flex items-center justify-center text-sm border border-cyan-500/30">
                      {friend.rank}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-100">{friend.name}</span>
                        {friend.isOnline && (
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-cyan-300 font-bold">{friend.score.toLocaleString()} 💰</span>
                </div>
              );
            })}
          </div>

          {/* Add Friends Placeholder */}
          <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-cyan-400 text-xs font-bold mb-2">Add more friends to compete!</p>
            <p className="text-gray-500 text-[10px]">Invite your friends to join the leaderboard</p>
          </div>
        </div>
      )}

      {/* FIXED MENU - RENDERED OUTSIDE SCROLL CONTAINER */}
      {menuState && (
        <div
          className="fixed z-[100] w-36 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 menu-content"
          style={{ top: menuState.top, right: menuState.right }}
        >
          <div className="p-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Add friend logic here (placeholder)
                setMenuState(null);
              }}
            >
              <UserPlus size={14} className="text-cyan-400" />
              Add Friend
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleViewProfile(menuState.id);
              }}
            >
              <UserIcon size={14} className="text-yellow-400" />
              View Profile
            </button>
          </div>
        </div>
      )}

      {/* FRIEND ZONE MODAL */}
      {showFriendModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gray-900 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">

            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-900/95 sticky top-0 z-10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-cyan-400" />
                Friend Zone
              </h3>
              <button
                onClick={() => {
                  setShowFriendModal(false);
                  setSearchQuery('');
                  setIsSearchActive(false);
                }}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-4 pb-2 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search Username or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <button
                onClick={handleSearch}
                className="bg-cyan-500 hover:bg-cyan-400 text-black p-3 rounded-xl transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Search size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">

              {/* SEARCH RESULTS MODE */}
              {isSearchActive ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Search Results</p>
                    <button
                      onClick={() => {
                        setIsSearchActive(false);
                        setSearchQuery('');
                      }}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Clear Search
                    </button>
                  </div>

                  {isSearching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                            <img
                              src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{user.username}</span>
                            <span className="text-[10px] text-gray-500">Lvl {getLevelProgress(user.totalSpins || 0).currentLevel} • {user.coins?.toLocaleString() || 0} Coins</span>
                          </div>
                        </div>
                        <button className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors">
                          <UserPlus size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-xs">
                      No users found matching "{searchQuery}"
                    </div>
                  )}
                </>
              ) : (
                /* PENDING REQUESTS MODE */
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Requests</p>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">{friendRequests.length}</span>
                  </div>

                  {friendRequests.length > 0 ? (
                    friendRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                            <img
                              src={req.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                              alt={req.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{req.username}</span>
                            <span className="text-[10px] text-gray-500">{req.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                      <Bell size={32} className="text-gray-600 mb-3" />
                      <p className="text-gray-400 text-xs font-bold">No pending requests</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {(viewProfileUser || loadingProfile) && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !loadingProfile && setViewProfileUser(null)}>
          <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

            {loadingProfile ? (
              <div className="p-8 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                <p className="text-gray-400 text-sm font-bold">Loading Profile...</p>
              </div>
            ) : viewProfileUser && (
              <>
                {/* Close Button */}
                <button
                  onClick={() => setViewProfileUser(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-20"
                >
                  <X size={18} />
                </button>

                {/* Profile Content */}
                <div className="p-4 relative">
                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex items-center justify-between relative z-10 mb-6">
                    {/* Left: Photo & Level */}
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-sm opacity-50"></div>
                        <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                          <img
                            src={viewProfileUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                            alt="User"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-wider">
                          LVL {getLevelProgress(viewProfileUser.totalSpins || 0).currentLevel}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Name & UID */}
                    <div className="flex-1 flex flex-col justify-center px-4">
                      <h3 className="text-base font-bold text-white truncate max-w-[150px]">{viewProfileUser.username || 'Guest Player'}</h3>

                      {/* UID Display with Copy */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">UID:</span>
                        <span className="text-[10px] text-yellow-500 font-mono font-bold">
                          {viewProfileUser.displayId ? viewProfileUser.displayId : '---'}
                        </span>
                        {viewProfileUser.displayId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(viewProfileUser.displayId?.toString() || '');
                            }}
                            className="ml-1 p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Copy UID"
                          >
                            <Copy size={10} />
                          </button>
                        )}
                      </div>

                      {/* Level Progress Bar */}
                      <div className="w-full mt-2">
                        {(() => {
                          const levelData = getLevelProgress(viewProfileUser.totalSpins || 0);
                          return (
                            <>
                              <div className="flex justify-between text-[8px] text-gray-400 mb-0.5">
                                <span>Lvl {levelData.currentLevel}</span>
                                <span>{Math.floor(levelData.progress)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                <div
                                  className="h-full bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                  style={{ width: `${levelData.progress}%` }}
                                />
                              </div>
                              <p className="text-[8px] text-gray-500 mt-0.5 text-right">
                                {levelData.spinsInLevel} / {levelData.spinsNeededForLevel} to Lvl {levelData.nextLevel}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/60 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
                        <span className="text-yellow-400 font-bold text-lg drop-shadow-sm">{(viewProfileUser.coins || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                        <span className="text-lg">💰</span>
                      </div>
                    </div>
                    <div className="bg-gray-800/60 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Spins</span>
                        <span className="text-red-400 font-bold text-lg drop-shadow-sm">{(viewProfileUser.totalSpins || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <span className="text-lg">🎯</span>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Leaderboard;
