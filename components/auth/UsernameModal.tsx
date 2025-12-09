import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { checkUsernameAvailability } from '../../services/userService';

interface UsernameModalProps {
  onSubmit: (username: string, referralCode?: string) => Promise<void>;
}

const UsernameModal: React.FC<UsernameModalProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (username.trim().length > 16) {
      setError('Username cannot exceed 16 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check availability
      const isAvailable = await checkUsernameAvailability(username.trim());
      if (!isAvailable) {
        setError('Username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      await onSubmit(username, referralCode);
      // If successful, the modal will be closed by the parent, so we don't need to set loading false
      // But if it fails/throws, we catch it below.
    } catch (err) {
      console.error("Error submitting username:", err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500"></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Decorative Elements */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex flex-col items-center text-center mb-6 md:mb-8 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-cyan-500/20 transform rotate-3 animate-pulse">
            <Sparkles className="text-white w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">One Last Step!</h2>
          <p className="text-gray-400 text-xs md:text-sm mt-2">
            Choose a unique username to claim your <br /> <span className="text-cyan-400 font-bold">10 Free Spins</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 relative z-10">
          <div className="space-y-3 md:space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Username"
              maxLength={16}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 md:py-4 text-white text-sm md:text-base focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-center font-bold tracking-wide placeholder:font-normal"
              autoFocus
              disabled={loading}
            />

            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Referral Code (Optional)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 md:py-4 text-white text-sm md:text-base focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all text-center font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
              disabled={loading}
            />

            {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 md:py-4 relative overflow-hidden group rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="relative text-white font-black text-base md:text-lg tracking-wide uppercase flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? 'Creating Profile...' : 'Complete Profile'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
};

export default UsernameModal;
