
import React, { useState, useEffect } from 'react';
import { Trophy, Users, Loader2 } from 'lucide-react';
import { auth } from '../../firebase';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardEntry } from '../../types';
import EToken from '../EToken';
import PrizeImage from '../PrizeImage';

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
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0">

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
                      <span className={`font-black text-sm md:text-base tracking-wider ${isCurrentUser ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : rankColor}`}>
                        {player.coins.toLocaleString()}
                      </span>
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
          <div className="text-xs text-white mb-3 uppercase tracking-wider font-bold flex items-center gap-2">
            <Users size={14} className="text-cyan-400" />
            Friends Rankings
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
            <p className="text-gray-500 text-[10px]">Friend request system coming soon...</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default Leaderboard;
