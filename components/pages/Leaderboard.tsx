
import React, { useState } from 'react';

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'ALL'>('WEEKLY');

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
      
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 tracking-widest drop-shadow-sm">Leaderboard</h2>
        <p className="text-gray-400 text-xs mt-1">Top Winners This Week</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-900 rounded-lg mb-6 border border-white/10">
        {(['DAILY', 'WEEKLY', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === tab ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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

      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg text-center">
         <p className="text-yellow-200/80 text-xs">Prize Pool: Top 10 get bonus spins every Sunday!</p>
      </div>

    </div>
  );
};

export default Leaderboard;
