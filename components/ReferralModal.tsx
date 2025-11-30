import React, { useState } from 'react';
import { X, Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { validateReferralCode, applyReferral, dismissReferralPrompt } from '../services/referralService';

interface ReferralModalProps {
    currentUserId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ currentUserId, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!code || code.length < 6) {
            setError('Please enter a valid code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Validate Code
            const referrerId = await validateReferralCode(code, currentUserId);

            if (!referrerId) {
                setError('Invalid referral code');
                setLoading(false);
                return;
            }

            // 2. Apply Referral
            const result = await applyReferral(currentUserId, referrerId);

            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        // Close immediately for better UX
        onClose();
        // Permanently dismiss the prompt in background
        dismissReferralPrompt(currentUserId).catch(console.error);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-gray-900 border border-yellow-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 animate-bounce">
                        <Gift size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">
                        Got a <span className="text-yellow-500">Code?</span>
                    </h2>
                    <p className="text-gray-400 text-xs">
                        Enter a referral code to unlock rewards!
                    </p>
                </div>

                {success ? (
                    <div className="flex flex-col items-center py-4 animate-in fade-in slide-in-from-bottom-4">
                        <CheckCircle size={48} className="text-green-500 mb-2" />
                        <p className="text-green-400 font-bold text-lg">Referral Applied!</p>
                        <p className="text-gray-500 text-xs">Redirecting...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE HERE"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono font-bold tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !code}
                            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-black font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Checking...' : 'Claim Reward'}
                        </button>

                        <p className="text-[10px] text-gray-600 text-center mt-4">
                            Don't have a code? Just close this window.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralModal;
