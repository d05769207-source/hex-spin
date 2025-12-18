
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

   // DEBUG: TEST BUTTON
   const handleTestReward = async () => {
      if (!user) return;
      try {
         const { createReferralRewardMessage } = await import('../../services/mailboxService');
         await createReferralRewardMessage(user.id, 50, 'Test Reward');
         alert('Test Message Sent! Check Mailbox.');
      } catch (e) {
         alert('Error: ' + e);
      }
   };


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
                     <p className="text-xs text-cyan-400 font-bold">Get 50 eTokens Instantly</p>
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

         {/* 2. REFERRAL SECTION - Redesigned */}
         <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-5 relative z-10">
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Users size={16} className="text-purple-300" />
               </div>
               <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider leading-none">Refer & Earn</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Invite friends, earn crypto</p>
               </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
               <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Friends</span>
                  <span className="text-2xl font-black text-white group-hover:scale-110 transition-transform duration-300">{referralCount}</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               </div>
               <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Earned</span>
                  <span className="text-2xl font-black text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                     {(user?.referralEarnings || (referralCount * 50)).toLocaleString()}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               </div>
            </div>

            {/* Code Box */}
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-xl p-1 mb-5 border border-white/10 shadow-inner">
               <div className="flex items-center justify-between pl-4 pr-1 py-1">
                  <div className="flex flex-col">
                     <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Your Code</span>
                     <span className="text-lg font-mono font-bold text-white tracking-widest">{referralCode}</span>
                  </div>
                  <button
                     onClick={handleCopyCode}
                     className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all duration-300 ${copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                        }`}
                  >
                     {copied ? 'Copied' : 'Copy'}
                  </button>
               </div>
            </div>

            {/* Share Button */}
            <button
               onClick={handleShare}
               className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 mb-5 relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
               <Share2 size={16} />
               <span className="text-xs uppercase tracking-widest relative z-10">Share Invite Link</span>
            </button>

            {/* Compact Breakdown */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
               <div className="flex items-center gap-2 mb-2 opacity-70">
                  <Gift size={12} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-gray-300 uppercase">Rewards Breakdown</span>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                     <p className="text-[10px] text-gray-400">
                        <span className="text-white font-bold">50 eTokens</span> instantly per invite
                     </p>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                     <p className="text-[10px] text-gray-400">
                        <span className="text-white font-bold">20 eTokens</span> per level up (Lvl 1-100)
                     </p>
                  </div>
               </div>
            </div>
         </div>

      </div>
   );
};

export default Shop;
