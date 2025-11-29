
import React, { useState } from 'react';
import { X, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { auth, db } from '../../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

interface LoginModalProps {
  onLoginSuccess: () => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [view, setView] = useState<'SELECT' | 'EMAIL'>('SELECT');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      // If new user (first time sign in), create user document
      if (!userDoc.exists()) {
        // Check for referral code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        let referredBy = null;
        let initialTokens = 10; // Base welcome bonus

        if (refCode) {
          // Try to find referrer
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('referralCode', '==', refCode));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              referredBy = snapshot.docs[0].id;
              initialTokens += 5; // Bonus for being referred

              // Also reward the referrer immediately (or we can do it via cloud function, but client side for now as requested)
              const referrerRef = doc(db, 'users', referredBy);
              await updateDoc(referrerRef, {
                referralCount: increment(1),
                tokens: increment(5)
              });
            }
          } catch (err) {
            console.error("Error finding referrer:", err);
          }
        }

        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          username: user.displayName || user.email?.split('@')[0] || 'User',
          coins: 0,
          tokens: initialTokens,
          createdAt: serverTimestamp(),
          isGuest: false,
          referralCode: user.uid.substring(0, 6).toUpperCase(), // Generate default code
          referredBy: referredBy,
          hasSeenReferralPrompt: !!referredBy // If referred by link, don't show prompt
        });
        console.log('New Google user data saved to Firestore!');
      } else {
        console.log('Existing Google user, data already in Firestore.');
      }

      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`Domain Blocked: '${currentDomain}'. Add this domain to Firebase Console > Auth > Settings > Authorized Domains.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled by user.');
      } else {
        setError('Google Sign-In Failed. ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user data to Firestore
        try {
          // Check for referral code in URL
          const urlParams = new URLSearchParams(window.location.search);
          const refCode = urlParams.get('ref');
          let referredBy = null;
          let initialTokens = 10;

          if (refCode) {
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('referralCode', '==', refCode));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                referredBy = snapshot.docs[0].id;
                initialTokens += 5;

                // Reward referrer
                const referrerRef = doc(db, 'users', referredBy);
                await updateDoc(referrerRef, {
                  referralCount: increment(1),
                  tokens: increment(5)
                });
              }
            } catch (err) {
              console.error("Error finding referrer:", err);
            }
          }

          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            username: user.email?.split('@')[0] || 'User',
            coins: 0,
            tokens: initialTokens, // Welcome bonus
            createdAt: serverTimestamp(),
            isGuest: false,
            referralCode: user.uid.substring(0, 6).toUpperCase(),
            referredBy: referredBy,
            hasSeenReferralPrompt: !!referredBy
          });
          console.log('User data successfully written to Firestore!');
        } catch (firestoreErr: any) {
          console.error('Error writing user data to Firestore:', firestoreErr);
          // Don't block login if Firestore fails, but log the error
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error('Authentication Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already exists. Please login.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid Email or Password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Authentication failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-[#1a0505] border border-yellow-600/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/20 blur-[60px] rounded-full pointer-events-none"></div>

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
          <X size={20} />
        </button>

        {view === 'EMAIL' && (
          <button onClick={() => { setView('SELECT'); setError(''); }} className="absolute top-4 left-4 text-gray-500 hover:text-white transition-colors z-20">
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-6 mt-2 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center mb-4 shadow-lg transform -rotate-6">
            <span className="text-2xl font-black text-black">LK</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            {view === 'SELECT' ? 'Login Required' : (isSignUp ? 'Create Account' : 'Welcome Back')}
          </h2>
          {view === 'SELECT' && (
            <p className="text-gray-400 text-xs mt-2 px-4">
              Save progress & get <span className="text-cyan-400 font-bold">10 Free Spins</span>.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg mb-4 text-center break-words">
            {error}
          </div>
        )}

        {view === 'SELECT' ? (
          <div className="space-y-3 relative z-10">
            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            {/* Email Button */}
            <button
              onClick={() => setView('EMAIL')}
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-3 border border-white/10 hover:bg-gray-700 transition-colors"
            >
              <Mail size={20} className="text-gray-400" />
              Continue with Email
            </button>

            <p className="text-center text-[10px] text-gray-500 mt-4">
              By continuing, you agree to our Terms of Service.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 relative overflow-hidden group rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative text-white font-black text-lg tracking-wide uppercase flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-gray-400 hover:text-white underline decoration-dashed underline-offset-4"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default LoginModal;
