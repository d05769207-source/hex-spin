
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ITEMS } from './constants';
import { GameItem, Page, User } from './types';
import SpinWheel, { SpinWheelRef } from './components/SpinWheel';
import SpinControls from './components/SpinControls';
import WinnerModal from './components/WinnerModal';
import Navigation from './components/Navigation';
import Profile from './components/pages/Profile';
import Leaderboard from './components/pages/Leaderboard';
import Event from './components/pages/Event';
import Shop from './components/pages/Shop';
import Mailbox from './components/pages/Mailbox';
import LoginModal from './components/auth/LoginModal';
import UsernameModal from './components/auth/UsernameModal';
import WeeklyTimer from './components/WeeklyTimer';
import AdminLoginModal from './components/admin/AdminLoginModal';
import AdminBadge from './components/admin/AdminBadge';
import AdminDashboard from './components/admin/AdminDashboard';
import KTMToken from './components/KTMToken';
import IPhoneToken from './components/iPhoneToken';
import EToken from './components/EToken';
import InfoModal from './components/InfoModal';
import SuperModeTransition from './components/SuperModeTransition'; // NEW: Animation Component
import { Volume2, VolumeX, Info, Mail } from 'lucide-react';
import './index.css';
import { auth, db } from './firebase';
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, Timestamp, onSnapshot, increment } from 'firebase/firestore';
import { updateUserWeeklyCoins, syncUserToLeaderboard } from './services/leaderboardService';
import { ensureUserHasDisplayId, createUserProfile } from './services/userService';
import { attemptAutoBotUpdate } from './services/botService'; // NEW: Import Logic
import { calculateLevel } from './utils/levelUtils';
import ReferralModal from './components/ReferralModal';
import { processLevelUpReward, validateReferralCode, applyReferral } from './services/referralService';
import MaintenancePoster from './components/MaintenancePoster';
// NEW: Import Weekly Reset Hook
import { useWeeklyReset } from './hooks/useWeeklyReset';
import { soundManager } from './utils/SoundManager';
import { getUnreadCount, deleteExpiredMessages } from './services/mailboxService';

// --- AUDIO SYSTEM MOVED TO SpinWheel.tsx ---

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

  // GLOBAL SOUND CLEANUP
  // Ensure we stop all event sounds when leaving the Event page or Admin page
  useEffect(() => {
    if (currentPage !== 'EVENT') {
      soundManager.stopAll();
    }
  }, [currentPage]);

  // User & Auth State
  const [user, setUser] = useState<User | null>(null);

  // NEW: Initialize Weekly Reset Hook


  const [isLoading, setIsLoading] = useState<boolean>(true); // Add loading state
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);

  // Admin State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [longPressProgress, setLongPressProgress] = useState<number>(0);
  const [profileInitialTab, setProfileInitialTab] = useState<'PROFILE' | 'REDEEM' | 'LEVEL'>('PROFILE');

  // Game State
  const [wonItems, setWonItems] = useState<GameItem[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const wheelRef = useRef<SpinWheelRef>(null);

  const [balance, setBalance] = useState<number>(getGuestBalance()); // Load from localStorage for guests
  const [coins, setCoins] = useState<number>(getGuestCoins());       // Load from localStorage for guests
  const [eTokens, setETokens] = useState<number>(getGuestETokens()); // Load from localStorage for guests
  const [inrBalance, setInrBalance] = useState<number>(0);           // INR Balance
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const totalSpinsRef = useRef<number>(0);
  const [ktmTokens, setKtmTokens] = useState<number>(0); // Placeholder for now
  const [iphoneTokens, setIphoneTokens] = useState<number>(0); // Placeholder for now
  const [spinsToday, setSpinsToday] = useState<number>(0);
  const [superModeEndTime, setSuperModeEndTime] = useState<Date | null>(null);
  const [superModeSpinsLeft, setSuperModeSpinsLeft] = useState<number>(0);
  const isSuperMode = superModeSpinsLeft > 0;
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
  const [showSuperModeTransition, setShowSuperModeTransition] = useState<boolean>(false); // NEW: Transition State
  const [unreadMailCount, setUnreadMailCount] = useState<number>(0); // Mailbox unread count

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true); // Sync State
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(false);
  const lastLeaderboardSync = useRef<number>(0); // Track last sync time
  const lastSyncedCoins = useRef<number>(0);     // Track last synced coin value

  // Long press detection refs
  const pressStartTime = useRef<number | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent sync until data is loaded

  // NEW: Initialize Weekly Reset Hook with LIVE State (Coins, eTokens)
  // Prevent running hook with partial user data (missing lastWeekId) by waiting for isLoading
  useWeeklyReset(isLoading ? null : user, coins, setCoins, setETokens);

  // --- DAILY RESET LOGIC (Midnight Check) ---
  useEffect(() => {
    const checkMidnightReset = () => {
      // We only care if user is logged in for persistence, but state updates should happen anyway
      const now = new Date();
      const lastCheck = localStorage.getItem('last_midnight_check');
      const lastCheckDate = lastCheck ? new Date(parseInt(lastCheck)) : now;

      // Check if day has changed
      if (now.getDate() !== lastCheckDate.getDate() || now.getMonth() !== lastCheckDate.getMonth()) {
        console.log('🌑 Midnight Detected! Resetting Daily Stats...');

        // 1. Reset State Locally
        setSpinsToday(0);
        setSuperModeSpinsLeft(0); // User requirement: Super Mode expires at midnight
        setSuperModeEndTime(null);

        // 2. Update Firestore if User is logged in
        if (user && !user.isGuest) {
          const userDocRef = doc(db, 'users', user.id);
          updateDoc(userDocRef, {
            spinsToday: 0,
            superModeSpinsLeft: 0,
            superModeEndTime: null,
            lastSpinDate: Timestamp.now()
          }).then(() => console.log('✅ Daily stats reset in Firestore'));
        }

        // Update last check time
        localStorage.setItem('last_midnight_check', now.getTime().toString());
      }
    };

    // Run check immediately on mount
    checkMidnightReset();

    // Set interval to check every minute
    const intervalId = setInterval(checkMidnightReset, 60000);

    return () => clearInterval(intervalId);
  }, [user]);

  // --- AUTO BOT SYSTEM TRIGGER ---
  useEffect(() => {
    // Check immediately on load
    attemptAutoBotUpdate();

    // Then check every 2 minutes
    // (The function itself enforces the 10-minute cooldown, so checking often is cheap)
    const botInterval = setInterval(() => {
      attemptAutoBotUpdate();
    }, 2 * 60 * 1000);

    return () => clearInterval(botInterval);
  }, []);

  console.log('RENDER App: totalSpins =', totalSpins, 'isSyncEnabled =', isSyncEnabled);

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
              setInrBalance(userData.inrBalance || 0);

              // Daily Reset Logic
              const lastDate = userData.lastSpinDate ? userData.lastSpinDate.toDate() : new Date();
              const today = new Date();
              const isSameDay = lastDate.getDate() === today.getDate() &&
                lastDate.getMonth() === today.getMonth() &&
                lastDate.getFullYear() === today.getFullYear();

              setSpinsToday(isSameDay ? (userData.spinsToday || 0) : 0);
              setSuperModeEndTime(userData.superModeEndTime ? userData.superModeEndTime.toDate() : null);
              setSuperModeSpinsLeft(userData.superModeSpinsLeft || 0);

              const loadedSpins = userData.totalSpins || 0;
              setTotalSpins(loadedSpins);
              totalSpinsRef.current = loadedSpins; // SYNC REF WITH LOADED DATA

              // Update user object with photoURL and displayId from Firestore
              setUser(prev => prev ? {
                ...prev,
                photoURL: userData.photoURL || prev.photoURL,
                displayId: userData.displayId,
                referralCode: userData.referralCode,
                referralCount: userData.referralCount,
                referredBy: userData.referredBy,
                referralDismissed: userData.referralDismissed,
                lastWeekId: userData.lastWeekId // CRITICAL: Populate lastWeekId so useWeeklyReset knows the state
              } : null);

              console.log('✅ User data loaded successfully:', {
                tokens: userData.tokens || 10,
                coins: userData.coins || 0,
                eTokens: userData.eTokens || 0,
                ktmTokens: userData.ktmTokens || 0,
                iphoneTokens: userData.iphoneTokens || 0,
                inrBalance: userData.inrBalance || 0,
                totalSpins: userData.totalSpins || 0,
                photoURL: userData.photoURL,
                referralCode: userData.referralCode,
                referralCount: userData.referralCount || 0,
                referredBy: userData.referredBy,
                referralDismissed: userData.referralDismissed
              });

              // Check if we should show the referral modal
              console.log('Checking referral status:', {
                referredBy: userData.referredBy,
                referralDismissed: userData.referralDismissed
              });

              // Referral modal logic removed as it is now handled in UsernameModal


              // BACKFILL: Ensure user has a numeric ID and Referral Code
              if (!userData.displayId || !userData.referralCode) {
                // Pass both id and uid to be safe
                ensureUserHasDisplayId({ ...userData, uid: firebaseUser.uid, id: firebaseUser.uid } as any).then(updatedUser => {
                  if (updatedUser.displayId || updatedUser.referralCode) {
                    setUser(prev => prev ? {
                      ...prev,
                      displayId: updatedUser.displayId,
                      referralCode: updatedUser.referralCode
                    } : null);
                  }
                });
              }
            } else {
              console.log('⚠️ No user document found in Firestore, prompting for username...');
              // New User Flow: Show Username Modal to collect username & referral code
              // We DO NOT create the user document here anymore. It happens in handleUsernameSet.
              setShowUsernameModal(true);
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
            setInrBalance(0);
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
        setIsLoading(false); // Auth check complete
      } else {
        // User is signed out - Load guest data from localStorage
        setUser(null);
        setIsSyncEnabled(false); // Disable Firestore sync for guests
        setBalance(getGuestBalance()); // Load from localStorage
        setCoins(getGuestCoins());
        setETokens(getGuestETokens());
        setKtmTokens(0); // Guests don't get these for now
        setIphoneTokens(0); // Guests don't get these for now
        setInrBalance(0); // Guests don't get real money
        setTotalSpins(0); // Guests don't track spins for now or load from local if needed
        totalSpinsRef.current = 0; // SYNC REF
        setIsLoading(false); // Auth check complete (Guest mode)
      }
    });

    return () => unsubscribe();
  }, []);

  // Load unread count when user logs in and periodically refresh
  // Load unread count when user logs in and subscribe to changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user && !user.isGuest) {
      // Import dynamically to avoid circle, though we are in App.tsx so imports are already top-level usually.
      // But since we are using a service function we just imported...
      import('./services/mailboxService').then(({ subscribeToUnreadCount, deleteExpiredMessages }) => {
        // 1. Clean up expired messages once on load
        deleteExpiredMessages(user.id);

        // 2. Subscribe to real-time updates
        unsubscribe = subscribeToUnreadCount(user.id, (count) => {
          setUnreadMailCount(count);
        });
      });
    } else {
      setUnreadMailCount(0);
    }

    // Cleanup listener on unmount or user change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);

  // --- DIRECT SYNC HELPER (Replaces Debounced useEffect) ---
  const saveUserProgress = async (updates: Partial<User> & { [key: string]: any }) => {
    if (!user || user.isGuest) return;

    try {
      const userDocRef = doc(db, 'users', user.id);

      // Merge with timestamp
      const dataToSave = {
        ...updates,
        lastSpinDate: Timestamp.now()
      };

      await updateDoc(userDocRef, dataToSave);
      console.log('✅ Data Synced to Firestore:', dataToSave);

      // --- LEADERBOARD SYNC (Throttled) ---
      // We still check leaderboard update criteria here, but triggered by direct actions

      // Calculate current coins effectively
      const currentCoins = updates.coins !== undefined ? updates.coins : coins;

      const now = Date.now();
      const timeDiff = now - lastLeaderboardSync.current;
      const coinDiff = Math.abs(currentCoins - lastSyncedCoins.current);

      const currentTotalSpins = updates.totalSpins !== undefined ? updates.totalSpins : totalSpins;
      const currentLevel = updates.level !== undefined ? updates.level : calculateLevel(currentTotalSpins);

      // PATCH: Sync more frequently for realtime feel. 
      // Old: 60s or 5000 coins. New: 5s or > 100 coins change.
      // Since spin takes ~4s, this effectively syncs every spin if they win > 100.
      if (user.id && (timeDiff > 5000 || coinDiff > 100)) {
        syncUserToLeaderboard(
          user.id,
          user.username || 'Player',
          currentCoins,
          user.photoURL,
          currentTotalSpins,
          currentLevel
        ).then(() => {
          lastLeaderboardSync.current = now;
          lastSyncedCoins.current = currentCoins;
        });
      }

    } catch (error: any) {
      console.error('❌ Error saving user progress:', error);
    }
  };

  // REFS FOR LISTENER (Prevent stale closures without re-subscribing)
  const spinsTodayRef = useRef(spinsToday);
  const superModeEndTimeRef = useRef(superModeEndTime);
  const superModeSpinsLeftRef = useRef(superModeSpinsLeft);

  useEffect(() => {
    spinsTodayRef.current = spinsToday;
    superModeEndTimeRef.current = superModeEndTime;
    superModeSpinsLeftRef.current = superModeSpinsLeft;
  }, [spinsToday, superModeEndTime, superModeSpinsLeft]);

  // REAL-TIME LISTENER FOR EXTERNAL UPDATES (e.g. Admin Actions)
  useEffect(() => {
    if (!user || user.isGuest) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        // Update Spins Today if changed externally
        if (data.spinsToday !== undefined) {
          const serverSpins = data.spinsToday;
          const localSpins = spinsTodayRef.current;

          // Only update if server is AHEAD (greater) or RESET (0)
          // Ignore if server is BEHIND (less), which is likely a stale echo
          if (serverSpins > localSpins || serverSpins === 0) {
            console.log('🔄 External update accepted for spinsToday:', serverSpins);
            setSpinsToday(serverSpins);
          } else if (serverSpins < localSpins) {
            console.log(`⚠️ Ignoring stale spinsToday update. Server: ${serverSpins}, Local: ${localSpins}`);
          }
        }

        // Update Super Mode End Time if changed externally
        if (data.superModeEndTime) {
          const newEndTime = data.superModeEndTime.toDate();
          const currentEndTime = superModeEndTimeRef.current;
          if (!currentEndTime || newEndTime.getTime() !== currentEndTime.getTime()) {
            console.log('🔄 External update detected for superModeEndTime:', newEndTime);
            setSuperModeEndTime(newEndTime);
          }
        }

        // Update Super Mode Spins Left if changed externally
        if (data.superModeSpinsLeft !== undefined) {
          const serverSuper = data.superModeSpinsLeft;
          const localSuper = superModeSpinsLeftRef.current;

          // Only update if server is AHEAD (lower, because it counts down) 
          // OR if server is RESET/ACTIVATED (50 or 0)
          if (serverSuper < localSuper || serverSuper === 50 || serverSuper === 0) {
            // Edge case: If server says 0 but we are at 50 (just activated), we might ignore 0 if we assume it's stale.
            // But usually 0 means "expired". 
            // If local is 50 (just activated) and server says 0 (old state), we MUST ignore 0.
            if (localSuper === 50 && serverSuper === 0) {
              console.log(`⚠️ Ignoring stale superModeSpinsLeft (0) immediately after activation.`);
            } else {
              console.log('🔄 External update accepted for Super Mode:', serverSuper);
              setSuperModeSpinsLeft(serverSuper);
            }
          } else if (serverSuper > localSuper && serverSuper !== 50) {
            // Server says 45, Local says 40. Server is "behind" in consumption. Ignore.
            console.log(`⚠️ Ignoring stale superModeSpinsLeft update. Server: ${serverSuper}, Local: ${localSuper}`);
          }
        }

        // Update Photo URL if changed externally (e.g. from Profile page)
        if (data.photoURL) {
          setUser(prev => {
            if (prev && prev.photoURL !== data.photoURL) {
              console.log('🔄 Photo URL updated from Firestore:', data.photoURL);
              return { ...prev, photoURL: data.photoURL };
            }
            return prev;
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.isGuest]); // Stabilize dependency to PREVENT rapid re-subscription loops

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

  const handleSpin = useCallback(async (count: number) => {
    console.log('🚀 handleSpinRequest CALLED with count:', count);

    // TOKEN COST LOGIC: 1 Spin = 1 P-Token
    const cost = count;
    console.log('💰 Cost:', cost, 'Balance:', balance, 'SuperSpins:', superModeSpinsLeft);

    // AUTH LOGIC: If balance is low (Always check, Super Mode is NOT free)
    if (!isAdminMode && balance < cost) {
      console.log('❌ Insufficient balance, showing login/shop');
      if (!user) {
        setShowLoginModal(true);
      } else {
        setCurrentPage('SHOP');
      }
      return;
    }

    console.log('✅ Balance check passed, proceeding with spin');

    // Deduct Balance (if not admin) - ALWAYS DEDUCT & SAVE IMMEDIATELY
    if (!isAdminMode) {
      const newBalance = balance - cost;
      setBalance(newBalance);
      // 🔥 IMMEDIATE SAVE: Deduct tokens before spin starts
      saveUserProgress({ tokens: newBalance });
    }

    // Handle Super Mode Decrement
    // MOVED TO Post-Spin (handleSpinComplete) to fix sync issues

    // SYNC USAGE ONLY (Activation Logic moved to Complete)
    // REMOVED premature sync

    setShowWinnerModal(false);
    setWonItems([]);
    setIsSpinning(true);

    // 1. Decide Winners
    const winners: GameItem[] = [];
    const isSuperModeActive = superModeSpinsLeft > 0;

    // Helper: Weighted Random Selection
    const getWeightedRandomItem = () => {
      const weights = ITEMS.map(item => {
        const probStr = (isSuperMode ? item.superProbability : item.probability) || '0%';
        return parseFloat(probStr.replace('%', ''));
      });

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < ITEMS.length; i++) {
        if (random < weights[i]) {
          return ITEMS[i];
        }
        random -= weights[i];
      }
      return ITEMS[ITEMS.length - 1]; // Fallback
    };

    for (let i = 0; i < count; i++) {
      let item = getWeightedRandomItem();

      // SUPER MODE LUCK BOOST: Re-roll if Common (50% chance)
      // This effectively gives a second chance to get a better item based on the same weights
      if (isSuperMode && item.rarity === 'COMMON' && Math.random() > 0.5) {
        console.log('🔥 Super Mode Luck Boost! Re-rolling...');
        item = getWeightedRandomItem();
      }
      winners.push(item);
    }

    // Trigger Spin Animation
    if (wheelRef.current) {
      await wheelRef.current.spin(winners);
    }
  }, [balance, user, isAdminMode, spinsToday, superModeEndTime, isSpinning, superModeSpinsLeft]);

  const handleSpinComplete = useCallback((winners: GameItem[]) => {
    setIsSpinning(false);
    setWonItems(winners);

    // --- UPDATE STATS & CHECK GOALS (Post-Spin) ---
    const count = winners.length;

    // 1. Calculate New Stats
    // NOTE: We use the REF for totalSpins to be safe, but state for display
    const newTotalSpins = totalSpinsRef.current + count;
    totalSpinsRef.current = newTotalSpins;
    setTotalSpins(newTotalSpins);

    const newSpinsToday = spinsToday + count;
    setSpinsToday(newSpinsToday);

    console.log(`🏁 Spin Complete. Count: ${count}, New Total: ${newTotalSpins}, New Today: ${newSpinsToday}`);

    // 2. CHECK SUPER MODE ACTIVATION (Crossing 100)
    let activatedSuperMode = false;
    if (spinsToday < 100 && newSpinsToday >= 100) {
      console.log('🔥 SUPER MODE ACTIVATED! (50 Spins)');
      setSuperModeSpinsLeft(50);
      activatedSuperMode = true;
      setShowSuperModeTransition(true);
    }

    const finalWinningsUpdates: any = {};
    let earnedCoins = coins; // Start with current coins
    let earnedKtm = ktmTokens;
    let earnedIphone = iphoneTokens;

    winners.forEach(item => {
      if (item.name.includes('Coins') && item.amount) {
        let coinAmount = item.amount!;
        // User requested removal of 2x multiplier
        // if (isSuperMode) {
        //   coinsEarned *= 2;
        // }
        earnedCoins += coinAmount;
        // setCoins(prev => prev + coinsEarned); <-- Calculated locally
      } else if (item.name.includes('KTM')) {
        earnedKtm += 1;
        // setKtmTokens(prev => prev + 1);
      } else if (item.name.includes('iPhone')) {
        earnedIphone += 1;
        // setIphoneTokens(prev => prev + 1);
      }
    });

    // Update Local State for UI
    setCoins(earnedCoins);
    setKtmTokens(earnedKtm);
    setIphoneTokens(earnedIphone);

    // Prepare Final Object for Firestore
    finalWinningsUpdates.coins = earnedCoins;
    finalWinningsUpdates.ktmTokens = earnedKtm;
    finalWinningsUpdates.iphoneTokens = earnedIphone;
    finalWinningsUpdates.totalSpins = newTotalSpins;
    finalWinningsUpdates.level = calculateLevel(newTotalSpins);
    finalWinningsUpdates.spinsToday = newSpinsToday;

    // START Super Mode Handling
    if (activatedSuperMode) {
      finalWinningsUpdates.superModeSpinsLeft = 50;
    } else if (superModeSpinsLeft > 0) {
      const newLeft = Math.max(0, superModeSpinsLeft - count);
      finalWinningsUpdates.superModeSpinsLeft = newLeft;
      setSuperModeSpinsLeft(newLeft);
    }
    // END Super Mode Handling

    // CHECK LEVEL UP
    const oldLevel = calculateLevel(totalSpinsRef.current - count); // Estimate old level based on pre-spin count
    const newLevel = finalWinningsUpdates.level;

    if (newLevel > oldLevel) {
      console.log(`🎉 Level Up Detected: ${oldLevel} -> ${newLevel}. Sending Reward Mail...`);
      // Dynamic import to avoid cycles or ensure service availability
      import('./services/mailboxService').then(({ createLevelUpRewardMessage }) => {
        if (user?.id) {
          createLevelUpRewardMessage(user.id, newLevel);
        }
      });
      // TRIGGER REFERRAL REWARD (Referrer gets 20 tokens/level)
      import('./services/referralService').then(({ processLevelUpReward }) => {
        if (user?.id) {
          processLevelUpReward(user.id, newLevel);
        }
      });
    }

    // 🔥 IMMEDIATE SAVE: Save winnings and stats
    saveUserProgress(finalWinningsUpdates);

    setShowWinnerModal(true);
  }, [superModeEndTime, spinsToday, superModeSpinsLeft, user, coins, ktmTokens, iphoneTokens, totalSpins]);

  const handleExchange = (amount: number) => {
    // Exchange Rate: 1000 Coins = 1 E-Token
    const cost = amount * 1000;
    if (coins >= cost) {
      const newCoins = coins - cost;
      const newETokens = eTokens + amount;

      setCoins(newCoins);
      setETokens(newETokens);

      saveUserProgress({
        coins: newCoins,
        eTokens: newETokens
      });
      return true;
    }
    return false;
  };

  const handleETokenToSpin = (amount: number) => {
    // Exchange Rate: 1 E-Token = 1 Spin Token
    if (eTokens >= amount) {
      const newETokens = eTokens - amount;
      const newBalance = balance + amount;

      setETokens(newETokens);
      setBalance(newBalance);

      saveUserProgress({
        eTokens: newETokens,
        tokens: newBalance
      });
      return true;
    }
    return false;
  };

  const handleRedeemKTM = () => {
    // Redeem Rate: 1 KTM = ₹3,40,000
    if (ktmTokens >= 1) {
      const newKtm = ktmTokens - 1;
      const newInr = inrBalance + 340000;

      setKtmTokens(newKtm);
      setInrBalance(newInr);

      saveUserProgress({
        ktmTokens: newKtm,
        inrBalance: newInr
      });
      return true;
    }
    return false;
  };

  const handleRedeemIPhone = () => {
    // Redeem Rate: 1 iPhone = ₹1,49,000
    if (iphoneTokens >= 1) {
      const newIphone = iphoneTokens - 1;
      const newInr = inrBalance + 149000;

      setIphoneTokens(newIphone);
      setInrBalance(newInr);

      saveUserProgress({
        iphoneTokens: newIphone,
        inrBalance: newInr
      });
      return true;
    }
    return false;
  };

  const handleRedeemToken = (tokenAmount: number) => {
    // Redeem Rate: 1 E-Token = ₹1 INR
    // This can be adjusted later
    if (eTokens >= tokenAmount) {
      const newETokens = eTokens - tokenAmount;
      const newInr = inrBalance + tokenAmount;

      setETokens(newETokens);
      setInrBalance(newInr);

      saveUserProgress({
        eTokens: newETokens,
        inrBalance: newInr
      });
      return true;
    }
    return false;
  };

  const handleWatchAd = async () => {
    // Helper to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Mock Ad Logic
    console.log('📺 Watching Ad...');

    // Simulate Ad Duration
    await wait(2000);

    // Reward User
    const newBalance = balance + 5;
    setBalance(newBalance);
    saveUserProgress({ tokens: newBalance });

    // Optional: Show success toast/alert
    alert('Ad Watched! You earned 5 Tokens.');
  };

  const handleMailClick = () => {
    console.log("📩 Mailbox clicked! Unread count:", unreadMailCount);
    setCurrentPage('MAILBOX');
  };

  const handleRewardClaimed = (amount: number, type: string) => {
    // Update local state when reward is claimed from mailbox
    if (type === 'E_TOKEN') {
      setETokens(prev => prev + amount);
    } else if (type === 'COINS') {
      setCoins(prev => prev + amount);
    } else if (type === 'SPIN_TOKEN') {
      setBalance(prev => prev + amount);
    }
    // Reload unread count
    // loadUnreadCount(); <--- NO LONGER NEEDED (Handled by Real-time Listener)
  };

  const loadUnreadCount = async () => {
    if (user && !user.isGuest) {
      const count = await getUnreadCount(user.id);
      setUnreadMailCount(count);
    }
  };

  // --- AUTH HANDLERS ---
  const handleLoginSuccess = () => {
    // Logic handled in useEffect via onAuthStateChanged
    // If user has no username, useEffect will trigger UsernameModal
  };

  const handleUsernameSet = async (username: string, referralCode?: string) => {
    if (auth.currentUser) {
      try {
        // 1. Update Auth Profile
        await updateProfile(auth.currentUser, {
          displayName: username
        });

        // 2. Create User Profile in Firestore
        const newUser: User = {
          id: auth.currentUser.uid,
          uid: auth.currentUser.uid,
          username: username,
          email: auth.currentUser.email || undefined,
          isGuest: false,
          photoURL: auth.currentUser.photoURL || undefined,
          tokens: 10, // Welcome Bonus
          coins: 0,
          eTokens: 0,
          ktmTokens: 0,
          iphoneTokens: 0,
          inrBalance: 0,
          totalSpins: 0
        };

        const result = await createUserProfile(newUser);
        console.log('✅ User profile created via handleUsernameSet', result);

        // 3. Handle Referral Code (if provided)
        if (referralCode) {
          console.log('Processing referral code:', referralCode);
          const referrerId = await validateReferralCode(referralCode, auth.currentUser.uid);

          if (referrerId) {
            const referralResult = await applyReferral(auth.currentUser.uid, referrerId);
            if (referralResult.success) {
              console.log('✅ Referral applied successfully');
              // Optional: Show success toast
            } else {
              console.warn('❌ Failed to apply referral:', referralResult.message);
              throw new Error(referralResult.message || 'Referral failed');
            }
          } else {
            console.warn('❌ Invalid referral code');
            throw new Error('Invalid referral code');
          }
        }

        // 4. Force update local state
        setUser({
          ...newUser,
          displayId: result ? result.displayId : undefined,
          referralCode: result ? result.referralCode : undefined
        });

        // REWARD: Add 10 Free Spins (Already in createUserProfile, but update local state)
        setBalance(10);

        setShowUsernameModal(false);

        // Reload page to ensure everything syncs perfectly (optional but safer for initial load)
        // window.location.reload(); 
        // Better: Re-trigger auth check or just let the state update handle it. 
        // Since we set User state, the app should unlock.

      } catch (error) {
        console.error("Error setting username:", error);
        alert("Error creating account. Please try again.");
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

  // Gesture Recognition State
  const [gesturePoints, setGesturePoints] = useState<{ x: number; y: number }[]>([]);
  const isDrawing = useRef<boolean>(false);

  // 'P' Shape Detection Algorithm
  const detectPShape = (points: { x: number; y: number }[]) => {
    if (points.length < 20) return false; // Too short

    // 1. Normalize points to 0-1 range
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    if (width === 0 || height === 0) return false;

    const normalized = points.map(p => ({
      x: (p.x - minX) / width,
      y: (p.y - minY) / height
    }));

    // 2. Check for Vertical Stem (Start -> Up)
    // Points should start near bottom-left (0, 1) and go up to top-left (0, 0)
    // Let's check the first 20% of points
    const startSegment = normalized.slice(0, Math.floor(normalized.length * 0.25));
    const isVerticalStart = startSegment.every(p => p.x < 0.4); // Stays on left side
    const goesUp = startSegment[0].y > startSegment[startSegment.length - 1].y; // Moving Up

    // 3. Check for Loop (Right -> Down -> Left)
    // The rest of the points should curve right, then down, then left
    // We can check if the max X is in the top half
    const topHalf = normalized.filter(p => p.y < 0.5);
    const hasRightBulge = topHalf.some(p => p.x > 0.6);

    // 4. Check Loop Closure (Ends near middle-left)
    const endPoint = normalized[normalized.length - 1];
    const closesNearMiddle = endPoint.y > 0.3 && endPoint.y < 0.7 && endPoint.x < 0.5;

    // Loose P detection: Starts low-left, goes high, bulges right-top, ends mid-left
    return isVerticalStart && goesUp && hasRightBulge && closesNearMiddle;
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (currentPage !== 'HOME') return;
    isDrawing.current = true;
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    setGesturePoints([{ x: clientX, y: clientY }]);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current) return;
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    setGesturePoints(prev => [...prev, { x: clientX, y: clientY }]);
  };

  const handleTouchEnd = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Analyze Gesture
    const isPShape = detectPShape(gesturePoints);
    if (isPShape) {
      console.log("⚡ 'P' Gesture Detected! Opening Admin...");
      setShowAdminLogin(true);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(200);
    } else {
      console.log("Gesture rejected (Not a 'P')");
    }
    setGesturePoints([]);
  };

  const handleScreenTap = () => {
    if (wheelRef.current) {
      wheelRef.current.skip();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // --- RENDER CONTENT BASED ON PAGE ---
  const renderContent = () => {
    switch (currentPage) {
      case 'HOME':
        return (
          <>
            {/* Main Game Area */}
            <div className="flex-1 relative flex items-center justify-center z-10 mt-14 md:mt-10 pb-8 md:pb-0 md:pr-24">

              <SpinWheel
                ref={wheelRef}
                onSpinComplete={handleSpinComplete}
                soundEnabled={soundEnabled}
                isSuperMode={superModeSpinsLeft > 0}
              />
            </div>

            {/* Footer / Controls */}
            <div className="relative z-20 w-full pb-14 md:pb-12 mt-auto md:pr-24">
              <SpinControls
                onSpin={handleSpin}
                isSpinning={isSpinning}
                balance={balance}
                isAdminMode={isAdminMode}
                spinsToday={spinsToday}
                superModeEndTime={superModeEndTime}
                superModeSpinsLeft={superModeSpinsLeft}
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
            <Event
              isAdminMode={isAdminMode}
              onTriggerAdmin={() => setShowAdminLogin(true)}
            />
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
              inrBalance={inrBalance}
              user={{ ...user!, totalSpins }}
              onLogout={handleLogout}
              onExchange={handleExchange}
              onRedeemToken={handleRedeemToken}
              onETokenToSpin={handleETokenToSpin}
              onRedeemKTM={handleRedeemKTM}
              onRedeemIPhone={handleRedeemIPhone}
              ktmTokens={ktmTokens}
              iphoneTokens={iphoneTokens}
              initialTab={profileInitialTab}
            />
          </div>
        );
      case 'MAILBOX':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
            <Mailbox
              onBack={() => setCurrentPage('HOME')}
              user={user}
              onRewardClaimed={handleRewardClaimed}
            // onMessagesRead={loadUnreadCount} <-- REMOVED: Managed by Firestore Listener
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
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleScreenTap}
    >

      {/* Intense Background Image */}
      <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center ${isSuperMode ? 'opacity-60 mix-blend-overlay hue-rotate-180 saturate-200' : 'opacity-40 mix-blend-hard-light'} pointer-events-none transition duration-1000`}></div>

      {/* Streaks/Speed lines */}
      <div className={`absolute inset-0 bg-gradient-to-b ${isSuperMode ? 'from-transparent via-sky-900/50 to-slate-900' : 'from-transparent via-[#2a0505]/50 to-[#1a0505]'} pointer-events-none transition-colors duration-1000`}></div>

      {/* Header - Always Visible */}
      < div className="absolute top-0 left-0 w-full z-50 flex justify-between items-start p-4" >
        {/* Top Left Brand Badge */}
        < div className="flex items-center gap-2 md:gap-3" onClick={() => setCurrentPage('HOME')}>
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
        </div >

        {/* Weekly Timer - Below Logo (Only on Home Page) */}
        {
          currentPage === 'HOME' && (
            <div className="absolute top-16 md:top-20 left-4">
              <WeeklyTimer />
            </div>
          )
        }

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
            <div
              className="bg-black/60 px-2 py-0.5 md:px-3 md:py-1 rounded border border-yellow-500/30 flex items-center gap-1.5 md:gap-2 shadow-lg cursor-pointer hover:bg-black/80 transition-colors"
              onClick={() => {
                setProfileInitialTab('REDEEM');
                setCurrentPage('PROFILE');
              }}
            >
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
              <div className="flex items-center gap-4 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-black/60 transition-colors"
                onClick={() => {
                  setProfileInitialTab('REDEEM');
                  setCurrentPage('PROFILE');
                }}
              >
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
              <div className="flex items-center gap-2">
                {/* Mailbox Icon with Badge */}
                <button
                  onClick={handleMailClick}
                  className="relative p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Mail size={14} className="text-white" />
                  {unreadMailCount > 0 && (
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,1),0_0_20px_rgba(34,211,238,0.8)] animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setShowInfoModal(true)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Info size={14} className="text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div >

      {/* RENDER CURRENT PAGE */}
      {renderContent()}

      {/* NAVIGATION (Bottom on Mobile, Right on Desktop) - Hidden for guests */}
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} user={user} />

      {/* Winner Modal */}
      {
        showWinnerModal && (
          <WinnerModal
            items={wonItems}
            onClose={() => setShowWinnerModal(false)}
          />
        )
      }

      {/* AUTH MODALS */}
      {
        showLoginModal && (
          <LoginModal
            onLoginSuccess={handleLoginSuccess}
            onClose={() => setShowLoginModal(false)}
          />
        )
      }
      {
        showUsernameModal && (
          <UsernameModal
            onSubmit={handleUsernameSet}
          />
        )
      }

      {/* ADMIN COMPONENTS */}
      {isAdminMode && <AdminBadge onLogout={handleAdminLogout} />}

      {
        showAdminLogin && (
          <AdminLoginModal
            onLogin={handleAdminLogin}
            onClose={() => setShowAdminLogin(false)}
          />
        )
      }

      {/* INFO MODAL */}
      {
        showInfoModal && (
          <InfoModal onClose={() => setShowInfoModal(false)} />
        )
      }


      {/* Referral Modal */}
      {
        showReferralModal && user && (
          <ReferralModal
            currentUserId={user.id}
            onClose={() => setShowReferralModal(false)}
            onSuccess={() => {
              setBalance(prev => prev + 0); // No immediate reward for the referred user in this plan, but we could add one if needed.
              // Referrer gets 5 tokens.
            }}
          />
        )
      }

      {/* SUPER MODE TRANSITION LAYER */}
      {
        showSuperModeTransition && (
          <SuperModeTransition onComplete={() => setShowSuperModeTransition(false)} />
        )
      }

      {/* MAINTENANCE POSTER - Global Overlay */}
      <MaintenancePoster />
    </div >
  );
};

export default App;
