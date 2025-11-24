
import React from 'react';
import { PlayCircle, Gift } from 'lucide-react';

const Shop: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black uppercase text-white tracking-widest">Earn Tokens</h2>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mt-1">
           <PlayCircle size={14} />
           <span>Watch Ads Only - No Money Required</span>
        </div>
      </div>

      {/* Ad Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { tokens: 5, ads: 1, label: 'QUICK' },
          { tokens: 10, ads: 2, label: 'POPULAR' },
          { tokens: 25, ads: 4, label: 'BEST VALUE', highlight: true },
          { tokens: 50, ads: 6, label: 'MEGA PACK' },
        ].map((pack, i) => (
          <button 
            key={i} 
            className={`relative flex flex-col items-center p-4 rounded-xl border transition-all active:scale-95 group overflow-hidden ${
              pack.highlight 
                ? 'bg-gradient-to-br from-cyan-900/80 to-blue-900/80 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                : 'bg-gray-800/50 border-white/10 hover:bg-gray-800'
            }`}
          >
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             {pack.highlight && (
                <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[8px] font-black px-2 py-1 rounded-bl-lg">
                   {pack.label}
                </div>
             )}
             
             <div className="relative z-10 text-center">
                <span className={`text-2xl font-black ${pack.highlight ? 'text-cyan-300' : 'text-white'}`}>{pack.tokens}</span>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">Tokens</p>
                
                <div className="flex flex-col items-center gap-1">
                   {/* Visual Chips */}
                   <div className="flex -space-x-1 mb-2">
                       {[...Array(Math.min(3, Math.ceil(pack.tokens / 10)))].map((_, idx) => (
                           <div key={idx} className="w-4 h-4 rounded-full bg-cyan-500 border border-black"></div>
                       ))}
                   </div>
                   
                   <div className="bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                      <PlayCircle size={12} className="text-green-400" />
                      <span className="text-[10px] font-bold text-gray-300">Watch {pack.ads} Ads</span>
                   </div>
                </div>
             </div>
          </button>
        ))}
      </div>

      {/* Other Ways */}
      <div className="bg-gray-900/50 border border-white/5 rounded-xl p-4">
         <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Gift size={16} className="text-yellow-500" />
            Other Ways to Earn
         </h3>
         <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                <span className="text-xs text-gray-300">Daily Login</span>
                <span className="text-xs font-bold text-cyan-400">+1 Spin</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                <span className="text-xs text-gray-300">Refer a Friend</span>
                <span className="text-xs font-bold text-cyan-400">+5 Spins</span>
            </div>
         </div>
      </div>

    </div>
  );
};

export default Shop;
