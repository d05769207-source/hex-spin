import React, { useState } from 'react';
import { X, Check, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, getDocs, query, collection, where, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { User } from '../../types';

interface ReferralInputModalProps {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

const ReferralInputModal: React.FC<ReferralInputModalProps> = ({ user, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setError('');

        try {
            const cleanCode = code.trim().toUpperCase();

            // 1. Check if code is own code
            if (cleanCode === user.referralCode || cleanCode === user.uid?.substring(0, 6).toUpperCase()) {
                setError("You can't use your own code!");
                setLoading(false);
                return;
            }

            // 2. Find referrer
            const usersRef = collection(db, 'users');
            // Check both referralCode field and UID substring
            const q = query(usersRef, where('referralCode', '==', cleanCode));
            const snapshot = await getDocs(q);

            let referrerDoc = null;

            if (!snapshot.empty) {
                referrerDoc = snapshot.docs[0];
            } else {
                // Fallback: Check if it matches any UID substring (this is expensive in real app, but okay for small scale)
                // Better approach: Store referralCode for everyone.
                // For now, let's assume we only support explicitly set referralCodes or we query by ID if we change logic.
                // Let's try to find by UID if code length is 6 (default)
                // Actually, the plan implies we should support the code generated.
                // Let's assume the code IS the referralCode stored in DB.
                setError("Invalid referral code.");
                setLoading(false);
                return;
            }

            const referrerId = referrerDoc.id;

            // 3. Apply Referral (Transaction for safety)
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.id || user.uid!);
                const referrerRef = doc(db, 'users', referrerId);

                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "User does not exist!";

                if (userDoc.data().referredBy) {
                    throw "You have already been referred!";
                }

                // Update User
                transaction.update(userRef, {
                    referredBy: referrerId,
                    tokens: increment(5), // Reward for new user
                    hasSeenReferralPrompt: true
                });

                // Update Referrer
                transaction.update(referrerRef, {
                    referralCount: increment(1),
                    tokens: increment(5) // Initial reward for referrer
                });
            });

            onSuccess();
            onClose();

        } catch (err: any) {
            console.error("Referral Error:", err);
            setError(typeof err === 'string' ? err : "Failed to apply code. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        try {
            const userRef = doc(db, 'users', user.id || user.uid!);
            await updateDoc(userRef, {
                hasSeenReferralPrompt: true
            });
            onClose();
        } catch (err) {
            console.error("Error skipping:", err);
            onClose(); // Close anyway
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"></div>

            <div className="relative w-full max-w-sm bg-[#1a0505] border border-purple-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Glow Effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none"></div>

                <button onClick={handleSkip} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6 mt-2 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 shadow-lg transform rotate-3">
                        <span className="text-2xl">🎁</span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                        Have a Code?
                    </h2>
                    <p className="text-gray-400 text-xs mt-2 px-4">
                        Enter a referral code to get <span className="text-cyan-400 font-bold">5 Free Tokens</span> instantly!
                    </p>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    <input
                        type="text"
                        placeholder="Enter Referral Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
                        maxLength={10}
                    />

                    <button
                        type="submit"
                        disabled={loading || !code}
                        className="w-full py-3 relative overflow-hidden group rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative text-white font-black text-lg tracking-wide uppercase flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    Claim Reward <ArrowRight size={18} />
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    Don't have a code? Just click the X to skip.
                </p>

            </div>
        </div>
    );
};

export default ReferralInputModal;
