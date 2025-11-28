
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
    { ranks: '1', prize: 'KTM Bike', icon: <PrizeImage prize="KTM" size="sm" glow={false} />, color: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-400' },
    { ranks: '2', prize: 'iPhone', icon: <PrizeImage prize="iPhone" size="sm" glow={false} />, color: 'from-blue-400 to-purple-500', textColor: 'text-blue-400' },
    { ranks: '3', prize: '₹50,000', icon: '💰', color: 'from-green-400 to-emerald-500', textColor: 'text-green-400' },
    { ranks: '4-10', prize: '₹10,000', icon: '💵', color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-400' },
    { ranks: '11-20', prize: '₹5,000', icon: '💵', color: 'from-indigo-400 to-purple-500', textColor: 'text-indigo-400' },
    { ranks: '21-40', prize: '₹2,000', icon: '💵', color: 'from-pink-400 to-rose-500', textColor: 'text-pink-400' },
    { ranks: '41-70', prize: '₹1,000', icon: '💵', color: 'from-orange-400 to-red-500', textColor: 'text-orange-400' },
    { ranks: '71-100', prize: '10 E-Tokens', icon: null, color: 'from-red-400 to-red-600', textColor: 'text-red-400', showEToken: true }
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
      <div className="flex bg-black/40 rounded-full p-1 border border-white/10 mb-4">
        <button
          onClick={() => setActiveTab('PRIZE')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'PRIZE'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Prize Pool
        </button>
        <button
          onClick={() => setActiveTab('WEEKLY')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'WEEKLY'
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('FRIENDS')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'FRIENDS'
            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Friends
        </button>
      </div>

      {/* Prize Pool Section */}
      {activeTab === 'PRIZE' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-left duration-300">
          <h3 className="text-sm font-bold text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="text-xl">🏆</span> Prize Pool - Top 100
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {prizeTiers.map((tier, i) => (
              <div
                key={i}
                className={`bg-gradient-to-r ${tier.color} p-[1px] rounded-lg`}
              >
                <div className="bg-black/95 rounded-lg p-3 flex items-center justify-between hover:bg-black/90 transition-colors">
                  <div className="flex items-center gap-3">
                    {tier.showEToken ? (
                      <EToken size={24} />
                    ) : (
                      <span className="text-2xl">{tier.icon}</span>
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Rank {tier.ranks}</div>
                      <div className={`text-sm font-black ${tier.textColor}`}>{tier.prize}</div>
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
          <div className="text-xs text-gray-300 mb-3 uppercase tracking-wider font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              This Week Rankings
            </div>
            <span className="text-[10px] text-gray-500">{weekRange}</span>
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
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {leaderboard.map((player) => {
                const isCurrentUser = currentUser && player.userId === currentUser.uid;
                let rankStyle = "bg-gray-700/50 text-gray-200";
                let borderStyle = "border-gray-700/30";

                if (player.rank === 1) {
                  rankStyle = "bg-gradient-to-br from-yellow-400 to-orange-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]";
                  borderStyle = "border-yellow-400/50";
                } else if (player.rank === 2) {
                  rankStyle = "bg-gradient-to-br from-gray-200 to-gray-400 text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]";
                  borderStyle = "border-gray-300/50";
                } else if (player.rank === 3) {
                  rankStyle = "bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-[0_0_10px_rgba(194,65,12,0.3)]";
                  borderStyle = "border-orange-700/50";
                }

                return (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-3 rounded-xl bg-black/60 border ${borderStyle} transition-all hover:scale-[1.01] hover:bg-black/70 ${isCurrentUser ? 'ring-2 ring-yellow-500/50 bg-yellow-900/20' : ''
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${rankStyle}`}>
                        {player.rank}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold ${player.rank && player.rank <= 3 ? 'text-white' : 'text-gray-100'
                          } ${isCurrentUser ? 'text-yellow-300' : ''}`}>
                          {player.username}
                          {isCurrentUser && ' (You)'}
                        </span>
                      </div>
                    </div>
                    <span className="text-yellow-300 font-bold text-sm drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">
                      {player.coins.toLocaleString()} 💰
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current User Sticky Footer (if not in top 100) */}
          {!loading && currentUserData && currentUserData.rank && currentUserData.rank > 100 && (
            <div className="sticky bottom-0 mt-4 mb-2">
              <div className="bg-yellow-900/50 backdrop-blur-md border border-yellow-500/50 rounded-xl p-3 flex items-center justify-between shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-500 text-black font-black flex items-center justify-center text-sm">
                    {currentUserData.rank}
                  </div>
                  <span className="text-yellow-200 font-bold">{currentUserData.username}</span>
                </div>
                <span className="text-white font-bold">{currentUserData.coins.toLocaleString()} 💰</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Friends Section */}
      {activeTab === 'FRIENDS' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="text-xs text-gray-300 mb-3 uppercase tracking-wider font-bold flex items-center gap-2">
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
