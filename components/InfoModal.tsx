import React from 'react';
import { X, Info, Shield, Zap, Heart, Gift, Coins } from 'lucide-react';
import KTMToken from './KTMToken';
import IPhoneToken from './iPhoneToken';
import EToken from './EToken';

interface InfoModalProps {
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-gray-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-2">
                        <Info className="text-cyan-400" size={24} />
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">Game Guide & Mission</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">

                    {/* SECTION 1: ALL TOKENS */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2 border-b border-yellow-500/30 pb-2">
                            <Coins size={20} /> All Tokens Explained
                        </h3>

                        {/* Coins */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-yellow-500/20 rounded-lg">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">Coins (Temporary Currency)</h4>
                                    <p className="text-sm text-gray-300 mb-2">
                                        Coins are valid for <strong>7 days only</strong>. They determine your weekly rank. Once the leaderboard resets, your coins are converted into E-Tokens (if you are eligible).
                                    </p>
                                    <p className="text-xs text-gray-400 italic border-l-2 border-yellow-500/50 pl-2">
                                        "Bhai dekho, ye coins bas 7 dino ke liye hote hain kyunki isse hi rank update hoti rehti hai taaki aur logon ko bhi mauka mile. Rank update hote hi coins ki jagah aapko E-Token mil jayega."
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* E-Tokens */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-start gap-3">
                                <div className="pt-1">
                                    <EToken size={32} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1">E-Tokens (Exchangeable)</h4>
                                    <p className="text-sm text-gray-300 mb-2">
                                        Permanent currency. You can exchange these for Spin Tokens or send them to friends (Requires Level 20).
                                    </p>
                                    <p className="text-xs text-gray-400 italic border-l-2 border-red-500/50 pl-2">
                                        "Ye aapka permanent balance hai. Isse aap spin token me change kar sakte ho aur friends ko bhej bhi sakte ho (Lekin aapka level 20 hona chahiye)."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: RARE TOKENS */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2 border-b border-purple-500/30 pb-2">
                            <Gift size={20} /> Rare Tokens & Super Mode
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* KTM Token */}
                            <div className="bg-gradient-to-br from-orange-900/40 to-black p-4 rounded-xl border border-orange-500/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <KTMToken size={80} />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <KTMToken size={24} />
                                    <span className="font-bold text-orange-400">KTM Token</span>
                                </div>
                                <div className="text-2xl font-black text-white mb-1">₹3,40,000</div>
                                <p className="text-xs text-gray-400">Value in INR</p>
                            </div>

                            {/* iPhone Token */}
                            <div className="bg-gradient-to-br from-slate-800/40 to-black p-4 rounded-xl border border-slate-400/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <IPhoneToken size={80} />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <IPhoneToken size={24} />
                                    <span className="font-bold text-slate-300">iPhone Token</span>
                                </div>
                                <div className="text-2xl font-black text-white mb-1">₹1,49,000</div>
                                <p className="text-xs text-gray-400">Value in INR</p>
                            </div>
                        </div>

                        <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                            <div className="flex items-start gap-3">
                                <Zap className="text-purple-400 shrink-0" size={24} />
                                <div>
                                    <h4 className="font-bold text-white mb-1">Rarity & Super Mode</h4>
                                    <p className="text-sm text-gray-300 mb-2">
                                        These tokens are extremely rare. You might need 20,000+ spins. However, we have added a <strong>Super Mode</strong>.
                                    </p>
                                    <p className="text-xs text-gray-400 italic border-l-2 border-purple-500/50 pl-2">
                                        "KTM aur iPhone token bahut rare hain. Inke nikalne ka chance bahut kam hai. Lekin agar aap din me 100 spin karte ho, to 'Super Mod' active ho jata hai jisse inke nikalne ka chance badh jata hai."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: OUR MISSION */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-500/30 pb-2">
                            <Heart size={20} /> How We Work & Our Mission
                        </h3>

                        <div className="bg-cyan-900/10 p-5 rounded-xl border border-cyan-500/20">
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                <strong>How it works:</strong> Our motive is to help dreamers who want a KTM or iPhone but can't afford it. You can win by spinning, topping the leaderboard, or participating in the Sunday Lottery.
                            </p>

                            <div className="bg-black/40 p-4 rounded-lg mb-4">
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <Shield size={16} className="text-green-400" /> Transparent Revenue Model
                                </h4>
                                <p className="text-xs text-gray-400 italic leading-relaxed">
                                    "Bhai dekho, main akela hun. Maine akele ke dam pe ye site khadi ki hai. Mere paas itne paise nahi hain ki main apni jeb se de sakun. Ye sach hai.
                                    <br /><br />
                                    Lekin ab aisa nahi hoga. Jaise hi aap ads dekhoge, mere paas paise aayenge.
                                    <span className="text-green-400 font-bold"> Jo bhi revenue aayega, uska 90% main winners ko dunga.</span>
                                    5% site ke kharche me jayega aur 5% mere paas."
                                </p>
                            </div>

                            <p className="text-gray-400 text-xs text-center">
                                "Dekho bhai, ye game luck pe hai. Luck hua to milega, main iski guarantee nahi le sakta. To luck azmao aur khelte raho Lucky Chakra!"
                            </p>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default InfoModal;
