
import React, { useState } from 'react';

interface UsernameModalProps {
  onSubmit: (username: string) => void;
}

const UsernameModal: React.FC<UsernameModalProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    onSubmit(username);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in duration-300"></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-[#1a0505] border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(34,211,238,0.1)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="flex flex-col items-center text-center mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">One Last Step!</h2>
            <p className="text-gray-400 text-sm mt-1">
                Choose a unique username to claim your <br/> <span className="text-cyan-400 font-bold">10 Free Spins</span>.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Username"
                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-center font-bold tracking-wide"
                    autoFocus
                />
                {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
            </div>

            <button 
                type="submit"
                className="w-full py-3 relative overflow-hidden group rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 shadow-lg active:scale-[0.98]"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                <span className="relative text-white font-black text-lg tracking-wide uppercase">COMPLETE PROFILE</span>
            </button>
        </form>

      </div>
    </div>
  );
};

export default UsernameModal;
