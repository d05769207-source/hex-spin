
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Edit, ExternalLink, Share2, LogOut, ArrowRight, Minus, Plus, X } from 'lucide-react';
import { User } from '../../types';
import EToken from '../EToken';

interface ProfileProps {
  onBack: () => void;
  coins: number;
  tokens: number;
  eTokens: number;
  user: User | null;
  onLogout: () => void;
  onExchange: (amount: number) => boolean;
}

const Profile: React.FC<ProfileProps> = ({ onBack, coins, tokens, eTokens, user, onLogout, onExchange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(1);
  const [exchangeError, setExchangeError] = useState('');
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'REDEEM'>('PROFILE');

  const MAX_EXCHANGE = Math.floor(coins / 1000);

  useEffect(() => {
    if (showExchangeModal) {
      setExchangeAmount(1);
      setExchangeError('');
    }
  }, [showExchangeModal]);

  const handleConfirmExchange = () => {
    if (exchangeAmount < 1) return;

    const success = onExchange(exchangeAmount);
    if (success) {
      setShowExchangeModal(false);
      // Optional: Show success toast
    } else {
      setExchangeError('Insufficient Coins');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-50">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition-colors">
          <ArrowLeft size={20} />
        </button>

        {/* Tabs in Header */}
        <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'PROFILE' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('REDEEM')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'REDEEM' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Redeem
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-yellow-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            <Settings size={20} />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Settings
                </div>
                {user && !user.isGuest ? (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors text-sm font-bold"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-bold"
                  >
                    <LogOut size={16} />
                    Reset Guest Data
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <>
          {/* User Card */}
          <div className="flex flex-col items-center mb-8" onClick={() => setShowSettings(false)}>
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-md opacity-50"></div>
              <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop" alt="User" className="w-full h-full object-cover" />
              </div>
              {user && !user.isGuest && (
                <div className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                  PRO
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">{user?.username || 'Guest Player'}</h3>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">
              {user?.email || 'Login to save progress'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6" onClick={() => setShowSettings(false)}>
            <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center">
              <span className="text-yellow-400 font-bold text-2xl drop-shadow-sm">{coins.toLocaleString()}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
            </div>
            <div className="bg-gray-900/60 border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center">
              <span className="text-cyan-400 font-bold text-2xl drop-shadow-sm">{tokens}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Spin Tokens</span>
            </div>
            <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center">
              <span className="text-white font-bold text-2xl">234</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Spins</span>
            </div>
            <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center">
              <span className="text-white font-bold text-2xl">#1,245</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Current Rank</span>
            </div>
          </div>

          {/* Recent Wins */}
          <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5 mb-6 overflow-y-auto" onClick={() => setShowSettings(false)}>
            <h4 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Recent Activity</h4>
            <div className="space-y-3">
              {[
                { name: '500 Coins', time: '2 hours ago', color: 'text-yellow-400' },
                { name: '100 Coins', time: '5 hours ago', color: 'text-yellow-200' },
                { name: '20 Coins', time: '1 day ago', color: 'text-gray-300' },
              ].map((win, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30">
                      <span className="text-lg">🏆</span>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${win.color}`}>{win.name}</p>
                      <p className="text-[10px] text-gray-500">Wheel Spin</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">{win.time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'REDEEM' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between md:justify-center md:gap-12 relative overflow-hidden shadow-lg shadow-cyan-900/20">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

            <div className="flex items-center gap-2 md:gap-8 z-10 w-full justify-between px-2">
              {/* Coin */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-base md:text-2xl">💰</span>
                </div>
                <span className="text-[8px] md:text-xs text-yellow-400 font-bold mt-1">Coins</span>
              </div>

              {/* Arrow & Rate */}
              <div className="flex flex-col items-center justify-center flex-1 px-2">
                <div className="w-full flex justify-center transform scale-x-150">
                  <ArrowRight className="text-cyan-400 animate-pulse" size={20} />
                </div>
                <span className="text-[8px] font-bold text-cyan-200/70 mt-1 whitespace-nowrap">1000 = 1</span>
              </div>

              {/* E-Token */}
              <div className="flex flex-col items-center">
                <div className="scale-75 md:scale-110 origin-center">
                  <EToken size={40} />
                </div>
                <span className="text-[8px] md:text-xs text-cyan-300 font-bold mt-1">E-Token</span>
              </div>
            </div>

            {/* Exchange Button */}
            <button
              onClick={() => setShowExchangeModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black py-1.5 px-3 md:py-2 md:px-8 rounded-lg shadow-lg shadow-cyan-500/20 transition-all active:scale-95 z-10 text-[10px] md:text-sm uppercase tracking-wider ml-2 whitespace-nowrap"
            >
              Exchange
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {activeTab === 'PROFILE' && (
        <div className="grid gap-2 mb-20 md:mb-0" onClick={() => setShowSettings(false)}>
          <button className="flex items-center justify-between p-4 bg-gray-800 rounded-lg text-white font-bold hover:bg-gray-700 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <Edit size={18} className="text-gray-400" />
              <span>Edit Profile</span>
            </div>
            <ExternalLink size={16} className="text-gray-500" />
          </button>
          <button className="flex items-center justify-between p-4 bg-gray-800 rounded-lg text-white font-bold hover:bg-gray-700 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <Share2 size={18} className="text-cyan-400" />
              <span>Refer & Earn</span>
            </div>
            <ExternalLink size={16} className="text-gray-500" />
          </button>
        </div>
      )}

      {showExchangeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-gray-900 border border-white/10 rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200">

            <button
              onClick={() => setShowExchangeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 text-center">
              Exchange <span className="text-red-500">Tokens</span>
            </h3>

            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-2xl">💰</span>
                </div>
                <span className="text-xs font-bold text-yellow-500">Coins</span>
              </div>

              <ArrowRight className="text-gray-500" />

              <div className="flex flex-col items-center gap-2">
                <EToken size={48} />
                <span className="text-xs font-bold text-red-500">E-Token</span>
              </div>
            </div>

            {/* Slider Control */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs uppercase font-bold">Quantity</span>
                <span className="text-white font-bold text-lg">{exchangeAmount}</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setExchangeAmount(Math.max(1, exchangeAmount - 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <Minus size={16} />
                </button>

                <div className="flex-1 relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="1"
                    max={Math.max(1, MAX_EXCHANGE)}
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-100"
                    style={{ width: `${(exchangeAmount / Math.max(1, MAX_EXCHANGE)) * 100}%` }}
                  ></div>
                </div>

                <button
                  onClick={() => setExchangeAmount(Math.min(MAX_EXCHANGE, exchangeAmount + 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-500">1</span>
                <span className="text-[10px] text-gray-500">{MAX_EXCHANGE}</span>
              </div>
            </div>

            {/* Cost Display */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-3 mb-6 border border-white/5">
              <span className="text-gray-400 text-sm font-bold">Total Cost</span>
              <span className="text-red-400 font-bold text-lg">
                -{(exchangeAmount * 1000).toLocaleString()} Coins
              </span>
            </div>

            {exchangeError && (
              <p className="text-red-500 text-xs font-bold text-center mb-4 animate-pulse">
                {exchangeError}
              </p>
            )}

            <button
              onClick={handleConfirmExchange}
              disabled={exchangeAmount > MAX_EXCHANGE || coins < 1000}
              className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Exchange
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
