
import React, { useState } from 'react';
import { PlayCircle, Gift, Copy, Share2, Users } from 'lucide-react';
import { User } from '../../types';

interface ShopProps {
   user: User | null;
   onWatchAd: () => void;
}

const Shop: React.FC<ShopProps> = ({ user, onWatchAd }) => {
   const [copied, setCopied] = useState(false);

   const referralCode = user?.referralCode || 'LOADING...';
   const referralCount = user?.referralCount || 0;

   const handleCopyCode = () => {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

   const handleShare = () => {
      if (navigator.share) {
         navigator.share({
            title: 'Lucky Chakra',
            text: `Use my code ${referralCode} to join Lucky Chakra and win prizes!`,
            url: window.location.href
         }).catch(console.error);
      } else {
         handleCopyCode();
      }
   };

   return (
      <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0">

         {/* Header */}
         <div className="mb-6">
            <h2 className="text-2xl font-black uppercase text-white tracking-widest">Earn Tokens</h2>
            <p className="text-gray-400 text-xs mt-1">Watch ads or refer friends to keep spinning!</p>
         </div>

         {/* 1. WATCH ADS SECTION (Simplified Row) */}
         <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-cyan-500/30 rounded-xl p-4 mb-6 relative overflow-hidden group">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>

            <div className="flex items-center justify-between relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                     <PlayCircle size={24} className="text-cyan-400" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-white uppercase italic">Watch Ad</h3>
                     <p className="text-xs text-cyan-400 font-bold">Get 5 Tokens Instantly</p>
                  </div>
               </div>

               <button
                  onClick={onWatchAd}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black py-2 px-6 rounded-lg shadow-lg shadow-cyan-500/20 transition-transform active:scale-95 uppercase tracking-wider text-sm"
               >
                  Watch
               </button>
            </div>
         </div>

         {/* 2. REFERRAL SECTION */}
         <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-4">
               <Users size={20} className="text-purple-400" />
               <h3 className="text-lg font-black text-white uppercase tracking-wider">Refer & Earn</h3>
            </div>

            <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5">
               <p className="text-gray-400 text-xs mb-2 uppercase font-bold">Your Referral Code</p>
               <div className="flex items-center justify-between bg-black/60 rounded p-3 border border-white/10">
                  <span className="text-xl font-mono font-bold text-white tracking-widest">{referralCode}</span>
                  <button
                     onClick={handleCopyCode}
                     className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                     {copied ? <span className="text-green-400 text-xs font-bold">Copied!</span> : <Copy size={18} className="text-gray-400" />}
                  </button>
               </div>
            </div>

            <div className="flex items-center justify-between mb-6">
               <div className="flex flex-col">
                  <span className="text-3xl font-black text-white">{referralCount}</span>
                  <span className="text-xs text-purple-300 font-bold uppercase">Friends Referred</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-xl font-bold text-yellow-400">+{referralCount * 5}</span>
                  <span className="text-xs text-gray-400 uppercase">Tokens Earned</span>
               </div>
            </div>

            <button
               onClick={handleShare}
               className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
               <Share2 size={18} />
               Share with Friends
            </button>

            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
               <h4 className="text-xs font-bold text-white uppercase mb-2">Rewards Breakdown:</h4>
               <ul className="space-y-1 text-[10px] text-gray-400">
                  <li className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                     <span><strong className="text-white">5 Tokens</strong> instantly when they join</span>
                  </li>
                  <li className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                     <span><strong className="text-white">1 Token</strong> for every level they gain (up to Lvl 100)</span>
                  </li>
               </ul>
            </div>
         </div>

      </div>
   );
};

export default Shop;
