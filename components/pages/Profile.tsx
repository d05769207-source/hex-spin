
import React from 'react';
import { ArrowLeft, Settings, Edit, ExternalLink, Share2, LogOut } from 'lucide-react';
import { User } from '../../types';

interface ProfileProps {
  onBack: () => void;
  coins: number;
  tokens: number;
  user: User | null;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, coins, tokens, user, onLogout }) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-50">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black uppercase text-white tracking-widest">My Profile</h2>

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
                    onClick={onLogout} // In App.tsx, onLogout handles reset, but for guest we might want to trigger login. 
                    // Actually, for guest, "Logout" usually just resets state, but "Login" is better.
                    // However, keeping it simple as requested: "Logout" option.
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

      {/* Action Buttons */}
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

        {/* Removed old logout button from here as it is now in settings */}
      </div>

    </div>
  );
};

export default Profile;
