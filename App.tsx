
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ITEMS } from './constants';
import { GameItem, Page, User } from './types';
import Hexagon from './components/Hexagon';
import SpinControls from './components/SpinControls';
import WinnerModal from './components/WinnerModal';
import Navigation from './components/Navigation';
import Profile from './components/pages/Profile';
import Leaderboard from './components/pages/Leaderboard';
import Event from './components/pages/Event';
import Shop from './components/pages/Shop';
import LoginModal from './components/auth/LoginModal';
import UsernameModal from './components/auth/UsernameModal';
import ReferralInputModal from './components/auth/ReferralInputModal';
import WeeklyTimer from './components/WeeklyTimer';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminBadge from './components/admin/AdminBadge';
import AdminDashboard from './components/admin/AdminDashboard';
import KTMToken from './components/KTMToken';
import IPhoneToken from './components/iPhoneToken';
import EToken from './components/EToken';
import InfoModal from './components/InfoModal';
import { Volume2, VolumeX, Info } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { updateUserWeeklyCoins, syncUserToLeaderboard } from './services/leaderboardService';
import { calculateLevel } from './utils/levelUtils';

// --- WEB AUDIO API SYSTEM ---
// Synthesizing sounds guarantees playback without network issues, CORS errors, or loading delays.
// This creates a "Perfect" robust sound system.

// Initialize Audio Context safely
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
// We create the context lazily or globally. Ideally, it needs to be resumed on interaction.
const audioCtx = new AudioContextClass();

const playTickSound = (isFast: boolean) => {
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // "Triangle" wave gives a crisp 'mechanical' feel without the harshness of a square wave
  osc.type = 'triangle';

  if (isFast) {
    // FAST MODE (Skip): High pitch, extremely short, low volume "Zip"
    // Simulates a rapid-fire mechanical counter
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);

    // Volume envelope: Fast attack, fast decay
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.002); // Very quiet (5%)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.start(t);
    osc.stop(t + 0.03);
  } else {
    // NORMAL MODE: "Card Flick" / "Plastic Stopper" sound
    // Sweep from mid-high to low frequency creates the 'click' character
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

    // Volume envelope: Sharp snap
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005); // Moderate volume
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.1);
  }
};

const playWinSound = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }

  const t = audioCtx.currentTime;

  // Layer 1: The "Thud" (Kick Drum) - Heavy Low Frequency
  const oscLow = audioCtx.createOscillator();
  const gainLow = audioCtx.createGain();
  oscLow.connect(gainLow);
  gainLow.connect(audioCtx.destination);

  oscLow.frequency.setValueAtTime(150, t); // Start punch
  oscLow.frequency.exponentialRampToValueAtTime(40, t + 0.4); // Drop to sub-bass

  gainLow.gain.setValueAtTime(0.8, t); // High volume impact
  gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  oscLow.start(t);
  oscLow.stop(t + 0.4);

  // Layer 2: The "Clang" (Metallic Overtone) - High Frequency
  const oscHigh = audioCtx.createOscillator();
  const gainHigh = audioCtx.createGain();
  oscHigh.connect(gainHigh);
  gainHigh.connect(audioCtx.destination);

  oscHigh.type = 'triangle';
  oscHigh.frequency.setValueAtTime(600, t);
  gainHigh.gain.setValueAtTime(0.2, t);
  gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  oscHigh.start(t);
  oscHigh.stop(t + 0.3);
};

// --- GUEST DATA MANAGEMENT (localStorage) ---
const GUEST_BALANCE_KEY = 'guest_balance';
const GUEST_COINS_KEY = 'guest_coins';
const GUEST_ETOKENS_KEY = 'guest_etokens';

const getGuestBalance = (): number => {
  const saved = localStorage.getItem(GUEST_BALANCE_KEY);
  return saved ? parseInt(saved) : 5; // Default 5 free spins for guests
};

const getGuestCoins = (): number => {
  const saved = localStorage.getItem(GUEST_COINS_KEY);
  return saved ? parseInt(saved) : 0;
};

const getGuestETokens = (): number => {
  const saved = localStorage.getItem(GUEST_ETOKENS_KEY);
  return saved ? parseInt(saved) : 0;
};

const saveGuestBalance = (balance: number) => {
  localStorage.setItem(GUEST_BALANCE_KEY, balance.toString());
};

const saveGuestCoins = (coins: number) => {
  localStorage.setItem(GUEST_COINS_KEY, coins.toString());
};

const saveGuestETokens = (eTokens: number) => {
  localStorage.setItem(GUEST_ETOKENS_KEY, eTokens.toString());
};

const clearGuestData = () => {
  localStorage.removeItem(GUEST_BALANCE_KEY);
  localStorage.removeItem(GUEST_COINS_KEY);
  localStorage.removeItem(GUEST_ETOKENS_KEY);
};

const App: React.FC = () => {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('HOME');

  // User & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);

  // Admin State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [longPressProgress, setLongPressProgress] = useState<number>(0);

  // Game State
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonItems, setWonItems] = useState<GameItem[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);

  const [balance, setBalance] = useState<number>(getGuestBalance()); // Load from localStorage for guests
  const [coins, setCoins] = useState<number>(getGuestCoins());       // Load from localStorage for guests
  const [eTokens, setETokens] = useState<number>(getGuestETokens()); // Load from localStorage for guests
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const totalSpinsRef = useRef<number>(0);
  const [ktmTokens, setKtmTokens] = useState<number>(0); // Placeholder for now
  const [iphoneTokens, setIphoneTokens] = useState<number>(0); // Placeholder for now
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(false); // Prevent sync until data is loaded

  console.log('RENDER App: totalSpins =', totalSpins, 'isSyncEnabled =', isSyncEnabled);

  // Use refs for values that change rapidly inside the spin loop without triggering re-renders
  const currentIndexRef = useRef<number>(0);
  const isSkippingRef = useRef<boolean>(false);

  // Long press detection refs
  const pressStartTime = useRef<number | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        if (firebaseUser.displayName) {
          // Setup complete - Clear guest data and load user data
          clearGuestData(); // Remove guest data from localStorage

          setUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            username: firebaseUser.displayName,
            email: firebaseUser.email || undefined,
            isGuest: false,
            photoURL: firebaseUser.photoURL || undefined
          });

          // Load user data from Firestore
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            console.log('Loading user data for UID:', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('✅ User data found in Firestore:', userData);

              setBalance(userData.tokens !== undefined ? userData.tokens : 10);
              setCoins(userData.coins || 0);
              setETokens(userData.eTokens || 0);
              setKtmTokens(userData.ktmTokens || 0);
              setIphoneTokens(userData.iphoneTokens || 0);
              const loadedSpins = userData.totalSpins || 0;
              setTotalSpins(loadedSpins);
              totalSpinsRef.current = loadedSpins; // SYNC REF WITH LOADED DATA

              // Update user object with photoURL from Firestore
              if (userData.photoURL) {
                setUser(prev => prev ? { ...prev, photoURL: userData.photoURL } : null);
              }

              console.log('✅ User data loaded successfully:', {
                tokens: userData.tokens || 10,
                coins: userData.coins || 0,
                eTokens: userData.eTokens || 0,
                ktmTokens: userData.ktmTokens || 0,
                iphoneTokens: userData.iphoneTokens || 0,
                totalSpins: userData.totalSpins || 0,
                photoURL: userData.photoURL,
                referralCode: userData.referralCode,
                referralCount: userData.referralCount || 0,
                referredBy: userData.referredBy,
                hasSeenReferralPrompt: userData.hasSeenReferralPrompt
              });

              // Check if we need to show referral input modal
              if (!userData.referredBy && !userData.hasSeenReferralPrompt) {
                setShowReferralModal(true);
              }

            } else {
              console.log('⚠️ No user document found in Firestore, creating default data...');

              // Create user document if it doesn't exist
              const defaultUserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                coins: 0,
                tokens: 10,
                eTokens: 0,
                ktmTokens: 0,
                iphoneTokens: 0,
                totalSpins: 0,
                createdAt: new Date(),
                isGuest: false
              };

              try {
                await setDoc(userDocRef, defaultUserData);
                console.log('✅ Default user data created in Firestore');
              } catch (createError) {
                console.error('❌ Failed to create user document:', createError);
              }

              setBalance(10);
              setCoins(0);
              setETokens(0);
              setKtmTokens(0);
              setIphoneTokens(0);
              setTotalSpins(0);
              totalSpinsRef.current = 0; // SYNC REF
            }

            // Enable sync AFTER data is loaded with a small delay
            setTimeout(() => {
              setIsSyncEnabled(true);
              console.log('✅ Firestore sync enabled');
            }, 1000);
          } catch (error) {
            console.error('❌ Error loading user data from Firestore:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            // Fallback to defaults on error
            setBalance(10);
            setCoins(0);
            setETokens(0);
            setKtmTokens(0);
            setIphoneTokens(0);
            setTotalSpins(0);
            totalSpinsRef.current = 0; // SYNC REF

            // Still enable sync after delay
            setTimeout(() => {
              setIsSyncEnabled(true);
            }, 1000);
          }
        } else {
          // Signed in but no username -> Show Username Modal
          setShowUsernameModal(true);
        }
        setShowLoginModal(false);
      } else {
        // User is signed out - Load guest data from localStorage
        setUser(null);
        setIsSyncEnabled(false); // Disable Firestore sync for guests
        setBalance(getGuestBalance()); // Load from localStorage
        setCoins(getGuestCoins());
        setETokens(getGuestETokens());
        setKtmTokens(0); // Guests don't get these for now
        setIphoneTokens(0); // Guests don't get these for now
        setTotalSpins(0); // Guests don't track spins for now or load from local if needed
        totalSpinsRef.current = 0; // SYNC REF
      }
    });

    return () => unsubscribe();
  }, []);

  // SYNC BALANCE TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest || !isSyncEnabled) return;

    const syncBalance = async () => {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { tokens: balance });
        console.log('Balance synced to Firestore:', balance);
      } catch (error) {
        console.error('Error syncing balance to Firestore:', error);
      }
    };

    // Debounce to avoid too many writes (wait 500ms after last change)
    const timeoutId = setTimeout(syncBalance, 500);
    return () => clearTimeout(timeoutId);
  }, [balance, user, isSyncEnabled]);

  // SYNC COINS TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest || !isSyncEnabled) return;

    const syncCoins = async () => {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { coins: coins });

        // Also sync to weekly leaderboard with absolute value
        await syncUserToLeaderboard(
          user.id,
          user.username || 'Player',
          coins,
          user.photoURL
        );

        console.log('Coins synced to Firestore & Leaderboard:', coins);
      } catch (error) {
        console.error('Error syncing coins to Firestore:', error);
      }
    };

    // Debounce to avoid too many writes (wait 500ms after last change)
    const timeoutId = setTimeout(syncCoins, 500);
    return () => clearTimeout(timeoutId);
  }, [coins, user, isSyncEnabled]);

  // SYNC E-TOKENS TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest || !isSyncEnabled) return;

    const syncETokens = async () => {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { eTokens: eTokens });
        console.log('E-Tokens synced to Firestore:', eTokens);
      } catch (error) {
        console.error('Error syncing eTokens to Firestore:', error);
      }
    };

    const timeoutId = setTimeout(syncETokens, 500);
    return () => clearTimeout(timeoutId);
  }, [eTokens, user, isSyncEnabled]);

  // SYNC KTM TOKENS TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest || !isSyncEnabled) return;

    const syncKtmTokens = async () => {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { ktmTokens: ktmTokens });
        console.log('KTM Tokens synced to Firestore:', ktmTokens);
      } catch (error) {
        console.error('Error syncing KTM Tokens to Firestore:', error);
      }
    };

    const timeoutId = setTimeout(syncKtmTokens, 500);
    return () => clearTimeout(timeoutId);
  }, [ktmTokens, user, isSyncEnabled]);

  // SYNC IPHONE TOKENS TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest || !isSyncEnabled) return;

    const syncIphoneTokens = async () => {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { iphoneTokens: iphoneTokens });
        console.log('iPhone Tokens synced to Firestore:', iphoneTokens);
      } catch (error) {
        console.error('Error syncing iPhone Tokens to Firestore:', error);
      }
    };

    const timeoutId = setTimeout(syncIphoneTokens, 500);
    return () => clearTimeout(timeoutId);
  }, [iphoneTokens, user, isSyncEnabled]);

  // SYNC TOTAL SPINS TO FIRESTORE (Logged-in users only)
  useEffect(() => {
    if (!user || user.isGuest) return;

    if (!isSyncEnabled) {
      console.log('Sync skipped: Sync not enabled yet');
      return;
    }

    const syncTotalSpins = async () => {
      try {
        console.log('Attempting to sync spins...', { totalSpins, userId: user.id });
        const currentLevel = calculateLevel(totalSpins);

        // Check for Level Up
        const previousLevel = user.level || 1;

        if (currentLevel > previousLevel) {
          console.log(`🎉 LEVEL UP! ${previousLevel} -> ${currentLevel}`);

          // If user was referred, reward the referrer
          if (user.referredBy) {
            try {
              const levelsGained = currentLevel - previousLevel;
              const rewardAmount = levelsGained * 1; // 1 Token per level

              const referrerRef = doc(db, 'users', user.referredBy);
              await updateDoc(referrerRef, {
                tokens: increment(rewardAmount),
                referralCount: increment(0) // No change to count, just tokens
              });
              console.log(`🎁 Sent ${rewardAmount} tokens to referrer ${user.referredBy}`);
            } catch (err) {
              console.error("Error rewarding referrer:", err);
            }
          }
        }

        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          totalSpins: totalSpins,
          level: currentLevel
        });

        // Update local user state to reflect new level immediately so we don't trigger again
        setUser(prev => prev ? { ...prev, level: currentLevel } : null);

        console.log('✅ Total Spins & Level synced to Firestore:', totalSpins, 'Lvl:', currentLevel);
      } catch (error) {
        console.error('❌ Error syncing totalSpins to Firestore:', error);
      }
    };

    const timeoutId = setTimeout(syncTotalSpins, 500);
    return () => clearTimeout(timeoutId);
  }, [totalSpins, user, isSyncEnabled]);

  // SYNC GUEST DATA TO LOCALSTORAGE (Guest users only)
  useEffect(() => {
    if (user) return; // Only for guests
    saveGuestBalance(balance);
  }, [balance, user]);

  useEffect(() => {
    if (user) return; // Only for guests
    saveGuestCoins(coins);
  }, [coins, user]);

  useEffect(() => {
    if (user) return; // Only for guests
    saveGuestETokens(eTokens);
  }, [eTokens, user]);

  // Helper to wait for a specific amount of time
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to perform a single spin segment (from current position to target)
  const spinToTarget = async (targetItem: GameItem, isFirst: boolean) => {
    return new Promise<void>((resolve) => {
      const targetIndex = ITEMS.findIndex(i => i.id === targetItem.id);
      let steps = 0;

      // BASE SPEED:
      // If isFirst (Item 1): 50ms start (Normal Physics)
      // If !isFirst (Items 2-5): 15ms start (Auto Fast / 10x feeling)
      let speed = isFirst ? 50 : 15;

      const current = currentIndexRef.current;
      const distance = (targetIndex - current + ITEMS.length) % ITEMS.length;

      // Steps Calculation:
      const totalStepsNeeded = isFirst ? (30 + distance) : (distance + 14);

      const tick = () => {
        // Skip Logic: If user tapped, make it instant (10ms) regardless of phase
        if (isSkippingRef.current) {
          speed = 10; // Ultra fast
        } else if (isFirst) {
          // Normal deceleration only for the first item
          if (steps > totalStepsNeeded - 10) {
            speed += 20;
          }
        }

        // Move to next index
        currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;
        setActiveIndex(currentIndexRef.current);

        // Play sound
        if (soundEnabled) {
          playTickSound(isSkippingRef.current || (!isFirst)); // Use fast sound for skip OR auto-fast phases
        }

        steps++;

        // Check if done
        if ((steps >= totalStepsNeeded && currentIndexRef.current === targetIndex)) {
          resolve();
        } else {
          setTimeout(tick, speed);
        }
      };

      tick();
    });
  };

  const handleSpin = useCallback(async (count: number) => {
    console.log('🚀 handleSpin CALLED with count:', count);

    if (isSpinning) {
      console.log('⏸️ Already spinning, returning early');
      return;
    }

    // Resume Audio Context on user interaction to ensure sounds play
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }

    // RESET SKIP STATE at the start of every new spin action
    isSkippingRef.current = false;

    // TOKEN COST LOGIC: 1 Spin = 1 P-Token
    const cost = count;
    console.log('💰 Cost:', cost, 'Balance:', balance, 'isAdminMode:', isAdminMode);

    // AUTH LOGIC: If balance is low (skip check if admin mode)
    if (!isAdminMode && balance < cost) {
      console.log('❌ Insufficient balance, showing login/shop');
      if (!user) {
        // If Guest -> Trigger Login Flow
        setShowLoginModal(true);
      } else {
        // If Logged In -> Go to Shop
        setCurrentPage('SHOP');
      }
      return;
    }

    console.log('✅ Balance check passed, proceeding with spin');

    // Deduct balance only if not in admin mode
    if (!isAdminMode) {
      setBalance(prev => prev - cost);
    }

    // Increment Total Spins
    console.log('🎯 Calling setTotalSpins with count:', count, 'current totalSpinsRef:', totalSpinsRef.current);
    const newTotalSpins = totalSpinsRef.current + count;
    totalSpinsRef.current = newTotalSpins;
    setTotalSpins(newTotalSpins);

    // DIRECT SYNC TO FIRESTORE (Bypass useEffect for critical update)
    if (user && !user.isGuest) {
      console.log('🔄 Starting direct sync for user:', user.id);
      const currentLevel = calculateLevel(newTotalSpins);
      const userDocRef = doc(db, 'users', user.id);
      updateDoc(userDocRef, {
        totalSpins: newTotalSpins,
        level: currentLevel
      }).then(() => {
        console.log('✅ DIRECT SYNC SUCCESS: Spins:', newTotalSpins, 'Level:', currentLevel);
      }).catch(err => {
        console.error('❌ DIRECT SYNC FAILED:', err);
      });
    }

    setShowWinnerModal(false);

    setShowWinnerModal(false);
    setWonItems([]);

    // 1. Decide Winners
    const winners: GameItem[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * ITEMS.length);
      winners.push(ITEMS[randomIndex]);
    }
    setWonItems(winners);

    // 2. Execute Sequence
    for (let i = 0; i < winners.length; i++) {
      // Start spinning phase
      setIsSpinning(true);

      // Run the animation to this target
      // i === 0 (First Spin): Uses Normal Physics
      // i > 0 (Next Spins): Uses Auto-Fast Logic (15ms speed)
      await spinToTarget(winners[i], i === 0);

      // Stop spinning phase -> Triggers "Takda Glow" via isWon prop
      setIsSpinning(false);

      // VIBRATION LOGIC (Haptic Feedback)
      if (winners[i].isInner && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100, 50, 100]);
      }

      // Calculate Reward
      if (winners[i].name.includes('Coins') && winners[i].amount) {
        const coinsEarned = winners[i].amount!;
        setCoins(prev => prev + coinsEarned);

        // Update leaderboard for logged-in users (not guests)
        // Note: Leaderboard sync is now handled by the useEffect hook in App.tsx
        // watching the 'coins' state change.
      } else if (winners[i].name.includes('KTM')) {
        setKtmTokens(prev => prev + 1);
      } else if (winners[i].name.includes('iPhone')) {
        setIphoneTokens(prev => prev + 1);
      }

      if (soundEnabled) playWinSound(); // Hard Impact Sound

      // Capture skip state to determine pause time
      const wasSkipped = isSkippingRef.current;

      // RESET SKIP immediately after a reward is found
      // This ensures manual skip only applies to the current item.
      isSkippingRef.current = false;

      // Pause Logic:
      // Shorter pause if we just skipped OR if it's part of the auto-fast sequence (i>0)
      const pauseTime = (wasSkipped || i > 0) ? 200 : 500;
      await wait(pauseTime);
    }

    // 3. All done, show modal
    setActiveIndex(-1);
    setShowWinnerModal(true);

  }, [balance, isSpinning, soundEnabled, user, isAdminMode]);

  const handleScreenTap = () => {
    // Resume audio context on tap as well
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }

    if (isSpinning) {
      isSkippingRef.current = true;
    }
    if (isSpinning) {
      isSkippingRef.current = true;
    }
  };

  const handleExchange = (amount: number) => {
    // Exchange Rate: 1000 Coins = 1 E-Token
    const cost = amount * 1000;
    if (coins >= cost) {
      setCoins(prev => prev - cost);
      setETokens(prev => prev + amount);
      return true;
    }
    return false;
  };

  const handleWatchAd = async () => {
    // Mock Ad Logic
    console.log('📺 Watching Ad...');

    // Simulate Ad Duration
    await wait(2000);

    // Reward User
    setBalance(prev => prev + 5);

    // Optional: Show success toast/alert
    alert('Ad Watched! You earned 5 Tokens.');
  };

  // --- AUTH HANDLERS ---
  const handleLoginSuccess = () => {
    // Logic handled in useEffect via onAuthStateChanged
    // If user has no username, useEffect will trigger UsernameModal
  };

  const handleUsernameSet = async (username: string) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: username
        });

        // Force update local state
        setUser({
          id: auth.currentUser.uid,
          uid: auth.currentUser.uid,
          username: username,
          email: auth.currentUser.email || undefined,
          isGuest: false,
          photoURL: auth.currentUser.photoURL || undefined
        });

        // REWARD: Add 10 Free Spins
        setBalance(prev => prev + 10);

        setShowUsernameModal(false);
      } catch (error) {
        console.error("Error setting username:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Disable sync before logout
      setIsSyncEnabled(false);

      await signOut(auth);

      // Auth listener will handle loading guest data from localStorage
      // Just reset page to HOME
      setCurrentPage('HOME');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // --- ADMIN HANDLERS ---
  const handleAdminLogin = (password: string) => {
    // Hardcoded password with env fallback
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'pj.pj';

    if (password === correctPassword) {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      sessionStorage.setItem('isAdmin', 'true');
      setCurrentPage('ADMIN_DASHBOARD');
    }
  };

  const handleAdminLogout = () => {
    try {
      setIsAdminMode(false);
      sessionStorage.removeItem('isAdmin');
      setCurrentPage('HOME');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Long Press Detection
  const handlePressStart = () => {
    if (currentPage !== 'HOME' || isSpinning) return;

    pressStartTime.current = Date.now();

    const interval = setInterval(() => {
      if (!pressStartTime.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - pressStartTime.current;
      const progress = Math.min((elapsed / 10000) * 100, 100);

      setLongPressProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setShowAdminLogin(true);
        setLongPressProgress(0);
        pressStartTime.current = null;
      }
    }, 50);

    pressTimerRef.current = interval;
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setLongPressProgress(0);
    pressStartTime.current = null;
  };

  // --- RENDER CONTENT BASED ON PAGE ---
  const renderContent = () => {
    switch (currentPage) {
      case 'HOME':
        return (
          <>
            {/* Main Game Area */}
            <div className="flex-1 relative flex items-center justify-center z-10 mt-14 md:mt-10 pb-8 md:pb-0 md:pr-24">

              {/* Responsive Container */}
              <div className="relative w-[95vw] max-w-[380px] aspect-square md:w-[420px] md:max-w-none md:h-[420px]">

                {/* CENTRAL GLOW (BACKLIGHT) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-radial-gradient from-orange-500/20 via-transparent to-transparent z-0 pointer-events-none mix-blend-screen"></div>

                {/* THE GOLDEN FIRE RING */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] md:w-[125%] md:h-[125%] z-0 pointer-events-none select-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
                  <div className="absolute inset-0 animate-[spin_25s_linear_infinite]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="fireRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
                          <stop offset="25%" stopColor="#fbbf24" stopOpacity="1" />
                          <stop offset="50%" stopColor="#ea580c" stopOpacity="0.8" />
                          <stop offset="75%" stopColor="#fbbf24" stopOpacity="1" />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                        </linearGradient>
                        <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      <circle cx="200" cy="200" r="190" fill="none" stroke="url(#fireRingGradient)" strokeWidth="3" strokeDasharray="150 80" strokeLinecap="round" filter="url(#fireGlow)" />
                      <circle cx="200" cy="200" r="180" fill="none" stroke="#fcd34d" strokeWidth="1" strokeDasharray="4 30" opacity="0.6" />
                    </svg>
                  </div>
                  <div className="absolute inset-[5%] animate-[spin_18s_linear_infinite_reverse]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                      <circle cx="200" cy="200" r="185" fill="none" stroke="url(#fireRingGradient)" strokeWidth="2" strokeDasharray="60 100" opacity="0.7" filter="url(#fireGlow)" />
                    </svg>
                  </div>
                  <div className="absolute inset-[10%] rounded-full border-[1px] border-orange-500/30 shadow-[0_0_60px_rgba(234,88,12,0.2)] opacity-50"></div>
                </div>

                {/* HEXAGON GRID */}
                {ITEMS.map((item, index) => (
                  <Hexagon
                    key={item.id}
                    item={item}
                    isActive={index === activeIndex}
                    isWon={!isSpinning && index === activeIndex && !showWinnerModal}
                  />
                ))}

              </div>
            </div>

            {/* Footer / Controls */}
            <div className="relative z-20 w-full pb-14 md:pb-12 mt-auto md:pr-24">
              <SpinControls
                onSpin={handleSpin}
                isSpinning={isSpinning}
                balance={balance}
                isAdminMode={isAdminMode}
              />
            </div>
          </>
        );
      case 'RANK':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
            <Leaderboard />
          </div>
        );
      case 'EVENT':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
            <Event isAdminMode={isAdminMode} />
          </div>
        );
      case 'SHOP':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
            <Shop user={user} onWatchAd={handleWatchAd} />
          </div>
        );
      case 'PROFILE':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
            <Profile
              onBack={() => setCurrentPage('HOME')}
              coins={coins}
              tokens={balance}
              eTokens={eTokens}
              user={{ ...user!, totalSpins }}
              onLogout={handleLogout}
              onExchange={handleExchange}
            />
          </div>
        );
      default:
        return null;
    }
  }

  // If in Admin Dashboard mode, render only the dashboard
  if (currentPage === 'ADMIN_DASHBOARD') {
    return (
      <AdminDashboard
        onLogout={handleAdminLogout}
        onBackToGame={() => setCurrentPage('HOME')}
      />
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-gray-900 text-white font-sans pb-20 md:pb-0 md:pl-20 relative overflow-x-hidden flex flex-col"
      onClick={handleScreenTap}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >

      {/* Intense Background Image */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-hard-light pointer-events-none"></div>

      {/* Streaks/Speed lines */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2a0505]/50 to-[#1a0505] pointer-events-none"></div>

      {/* Header - Always Visible */}
      <div className="absolute top-0 left-0 w-full z-50 flex justify-between items-start p-4">
        {/* Top Left Brand Badge */}
        <div className="flex items-center gap-2 md:gap-3" onClick={() => setCurrentPage('HOME')}>
          <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-sm border border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.6)] skew-x-[-10deg]">
            <div className="absolute inset-0.5 bg-black skew-x-0 flex items-center justify-center">
              <span className="text-yellow-500 font-black text-sm md:text-base tracking-tighter leading-none skew-x-[10deg]">LK</span>
            </div>
          </div>

          <div className="flex flex-col items-start bg-gradient-to-r from-red-900/90 to-red-800/0 pl-3 pr-8 py-1 -ml-4 skew-x-[-10deg] border-l-2 border-red-500">
            <div className="skew-x-[10deg]">
              <h1 className="text-base md:text-xl font-black text-white tracking-wide uppercase drop-shadow-md leading-none">
                LUCKY <span className="text-red-400">CHAKRA</span>
              </h1>
              <span className="text-[8px] md:text-[10px] font-medium text-gray-400 tracking-widest uppercase block -mt-0.5">
                by deadend
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Timer - Below Logo (Only on Home Page) */}
        {currentPage === 'HOME' && (
          <div className="absolute top-16 md:top-20 left-4">
            <WeeklyTimer />
          </div>
        )}

        {/* Top Right Menu */}
        <div className="flex flex-col items-end gap-1 md:pr-24">
          {/* Top Row: Main Tokens */}
          <div className="flex gap-2">
            {/* Token Balance */}
            <div className="bg-black/60 px-2 py-0.5 md:px-3 md:py-1 rounded border border-cyan-500/30 flex items-center gap-1.5 md:gap-2 shadow-lg cursor-pointer hover:bg-black/80 transition-colors" onClick={() => setCurrentPage('SHOP')}>
              <div className="relative w-4 h-4 md:w-5 md:h-5 flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-700" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />
                <div className="absolute inset-[1.5px] bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} >
                  <span className="text-[8px] md:text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500" style={{ fontFamily: 'sans-serif' }}>P</span>
                </div>
              </div>
              <span className="text-cyan-400 font-bold text-sm md:text-base drop-shadow-sm">{balance}</span>
            </div>

            {/* Coin Balance */}
            <div className="bg-black/60 px-2 py-0.5 md:px-3 md:py-1 rounded border border-yellow-500/30 flex items-center gap-1.5 md:gap-2 shadow-lg">
              <svg viewBox="0 0 36 36" className="w-4 h-4 md:w-5 md:h-5 flex shrink-0 drop-shadow-md filter brightness-110">
                <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
                <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
              </svg>
              <span className="text-yellow-400 font-bold text-sm md:text-base drop-shadow-sm">{coins}</span>
            </div>

            {/* Sound Toggle */}
            <div
              className="bg-black/50 p-1 rounded border border-white/20 cursor-pointer hover:bg-white/10 ml-1"
              onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
            >
              {soundEnabled ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-white" />}
            </div>
          </div>

          {/* Bottom Row: Special Tokens (Larger & Balanced) - Only on Home Page */}
          {currentPage === 'HOME' && (
            <div className="flex flex-col items-end gap-1 mt-1">
              <div className="flex items-center gap-4 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                {/* KTM Token */}
                <div className="flex items-center gap-1.5">
                  <KTMToken size={18} />
                  <span className="text-xs font-bold text-orange-400">{ktmTokens}</span>
                </div>

                {/* iPhone Token */}
                <div className="flex items-center gap-1.5">
                  <IPhoneToken size={18} />
                  <span className="text-xs font-bold text-slate-300">{iphoneTokens}</span>
                </div>

                {/* E-Token */}
                <div className="flex items-center gap-1.5">
                  <EToken size={18} />
                  <span className="text-xs font-bold text-red-400">{eTokens}</span>
                </div>
              </div>

              {/* Info Icon - Below tokens on right */}
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
              >
                <Info size={14} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER CURRENT PAGE */}
      {renderContent()}

      {/* NAVIGATION (Bottom on Mobile, Right on Desktop) - Hidden for guests */}
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} user={user} />

      {/* Winner Modal */}
      {showWinnerModal && (
        <WinnerModal
          items={wonItems}
          onClose={() => setShowWinnerModal(false)}
        />
      )}

      {/* AUTH MODALS */}
      {showLoginModal && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}
      {showUsernameModal && (
        <UsernameModal
          onSubmit={handleUsernameSet}
        />
      )}

      {showReferralModal && user && (
        <ReferralInputModal
          user={user}
          onClose={() => setShowReferralModal(false)}
          onSuccess={() => {
            // Refresh user data or update local state
            setBalance(prev => prev + 5); // Immediate reward update
            setUser(prev => prev ? { ...prev, referredBy: 'PENDING', hasSeenReferralPrompt: true } : null);
          }}
        />
      )}

      {/* ADMIN COMPONENTS */}
      {isAdminMode && <AdminBadge onLogout={handleAdminLogout} />}

      {showAdminLogin && (
        <AdminLoginModal
          onLogin={handleAdminLogin}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* INFO MODAL */}
      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} />
      )}

    </div>
  );
};

export default App;
