
import React, { useState } from 'react';
import { Calendar, Trophy } from 'lucide-react';
import EToken from '../EToken';
import PrizeImage from '../PrizeImage';

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'ALL'>('WEEKLY');

  const tabs = [
    { id: 'WEEKLY' as const, label: 'Weekly', icon: Calendar },
    { id: 'ALL' as const, label: 'All Time', icon: Trophy }
  ];

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

  const players = [
    { rank: 1, name: 'RajKumar', score: 125000, isMe: false },
    { rank: 2, name: 'Priya_23', score: 98500, isMe: false },
    { rank: 3, name: 'Lucky_Boy', score: 87200, isMe: false },
    { rank: 4, name: 'Spinner99', score: 76800, isMe: false },
    { rank: 5, name: 'WinnerGirl', score: 65400, isMe: false },
    { rank: 6, name: 'ProGamer', score: 54000, isMe: false },
    { rank: 1245, name: 'You', score: 5420, isMe: true },
  ];

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0">

      {/* Header with E-Token Balance */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 tracking-widest drop-shadow-sm">
          Leaderboard
        </h2>
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-red-500/30 shadow-lg">
          <EToken size={20} />
          <span className="text-red-400 font-bold">0</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
          >
            <tab.icon size={16} />
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Prize Pool (Weekly tab only) */}
      {activeTab === 'WEEKLY' && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="text-xl">🏆</span> Prize Pool - Top 100
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
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

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
          {activeTab === 'WEEKLY' ? 'This Week' : 'All Time'} Rankings
        </div>
        {players.map((player) => {
          let rankStyle = "bg-gray-800 text-gray-400";
          let borderStyle = "border-transparent";

          if (player.rank === 1) {
            rankStyle = "bg-gradient-to-br from-yellow-400 to-orange-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]";
            borderStyle = "border-yellow-400";
          } else if (player.rank === 2) {
            rankStyle = "bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]";
            borderStyle = "border-gray-400";
          } else if (player.rank === 3) {
            rankStyle = "bg-gradient-to-br from-orange-700 to-orange-900 text-white shadow-[0_0_10px_rgba(194,65,12,0.3)]";
            borderStyle = "border-orange-800";
          }

          if (player.isMe) {
            return (
              <div key={player.rank} className="sticky bottom-0 mt-4 mb-2">
                <div className="bg-cyan-900/40 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-black font-black flex items-center justify-center text-xs">
                      {player.rank}
                    </div>
                    <span className="text-cyan-300 font-bold">{player.name}</span>
                  </div>
                  <span className="text-white font-bold">{player.score.toLocaleString()} 💰</span>
                </div>
              </div>
            );
          }

          return (
            <div key={player.rank} className={`flex items-center justify-between p-3 rounded-xl bg-black/40 border ${borderStyle} transition-transform hover:scale-[1.01]`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${rankStyle}`}>
                  {player.rank}
                </div>
                <span className={`font-bold ${player.rank <= 3 ? 'text-white' : 'text-gray-400'}`}>{player.name}</span>
              </div>
              <span className="text-yellow-500 font-bold">{player.score.toLocaleString()} 💰</span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Leaderboard;
