
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ITEMS } from './constants';
import { GameItem, Page, User } from './types';
import Hexagon from './components/Hexagon';
import SpinControls from './components/SpinControls';
import WinnerModal from './components/WinnerModal';
import Navigation from './components/Navigation';
import Profile from './components/pages/Profile';
import Leaderboard from './components/pages/Leaderboard';
import Shop from './components/pages/Shop';
import LoginModal from './components/auth/LoginModal';
import UsernameModal from './components/auth/UsernameModal';
import { Volume2, VolumeX } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';

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
      audioCtx.resume().catch(() => {});
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
      audioCtx.resume().catch(() => {});
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

const App: React.FC = () => {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>('HOME');

  // User & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  
  // Game State
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wonItems, setWonItems] = useState<GameItem[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  
  const [balance, setBalance] = useState<number>(5); // START WITH 5 FREE SPINS (Guest Bonus)
  const [coins, setCoins] = useState<number>(0);     // Gold Coins (Rewards)
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Use refs for values that change rapidly inside the spin loop without triggering re-renders
  const currentIndexRef = useRef<number>(0);
  const isSkippingRef = useRef<boolean>(false);

  // AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        if (firebaseUser.displayName) {
          // Setup complete
          setUser({
            id: firebaseUser.uid,
            username: firebaseUser.displayName,
            email: firebaseUser.email || undefined,
            isGuest: false
          });
          // NOTE: In a real app, you would fetch the user's balance from Firestore here.
          // For now, we simulate a logged-in balance if it's their first time in session.
        } else {
          // Signed in but no username -> Show Username Modal
          setShowUsernameModal(true);
        }
        setShowLoginModal(false);
      } else {
        // User is signed out
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

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
    if (isSpinning) return;

    // Resume Audio Context on user interaction to ensure sounds play
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    // RESET SKIP STATE at the start of every new spin action
    isSkippingRef.current = false;

    // TOKEN COST LOGIC: 1 Spin = 1 P-Token
    const cost = count; 
    
    // AUTH LOGIC: If balance is low
    if (balance < cost) {
       if (!user) {
           // If Guest -> Trigger Login Flow
           setShowLoginModal(true);
       } else {
           // If Logged In -> Go to Shop
           setCurrentPage('SHOP');
       }
       return;
    }

    setBalance(prev => prev - cost);
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
             setCoins(prev => prev + winners[i].amount!);
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

  }, [balance, isSpinning, soundEnabled, user]);

  const handleScreenTap = () => {
    // Resume audio context on tap as well
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    if (isSpinning) {
      isSkippingRef.current = true;
    }
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
            username: username,
            email: auth.currentUser.email || undefined,
            isGuest: false
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
      await signOut(auth);
      // Reset to guest defaults
      setBalance(0); 
      setCoins(0);
      setCurrentPage('HOME');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // --- RENDER CONTENT BASED ON PAGE ---
  const renderContent = () => {
    switch (currentPage) {
      case 'HOME':
        return (
          <>
             {/* Main Game Area */}
            <div className="flex-1 relative flex items-center justify-center z-10 mt-4 md:mt-10 pb-12 md:pb-0 md:pr-24">
                
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
            <div className="relative z-20 w-full pb-24 md:pb-12 mt-auto md:pr-24">
                <SpinControls 
                    onSpin={handleSpin} 
                    isSpinning={isSpinning} 
                    balance={balance}
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
      case 'SHOP':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
             <Shop />
          </div>
        );
      case 'PROFILE':
        return (
          <div className="flex-1 pt-24 md:pt-20 overflow-hidden md:pr-24">
             <Profile 
                onBack={() => setCurrentPage('HOME')} 
                coins={coins} 
                tokens={balance} 
                user={user}
                onLogout={handleLogout}
             />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div 
      className="h-[100dvh] w-full bg-[#1a0505] relative overflow-hidden font-sans select-none flex flex-col"
      onClick={handleScreenTap}
    >
      
      {/* Intense Background Image */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-hard-light pointer-events-none"></div>
      
      {/* Streaks/Speed lines */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2a0505]/50 to-[#1a0505] pointer-events-none"></div>

      {/* Header - Always Visible */}
      <div className="absolute top-0 left-0 w-full z-50 flex justify-between items-center p-4">
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

        {/* Top Right Menu */}
        <div className="flex gap-2 md:pr-24">
            {/* Token Balance */}
            <div className="bg-black/60 px-3 py-1 rounded border border-cyan-500/30 flex items-center gap-2 shadow-lg cursor-pointer hover:bg-black/80 transition-colors" onClick={() => setCurrentPage('SHOP')}>
                <div className="relative w-5 h-5 flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-700" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />
                    <div className="absolute inset-[1.5px] bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} >
                        <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500" style={{ fontFamily: 'sans-serif' }}>P</span>
                    </div>
                </div>
                <span className="text-cyan-400 font-bold drop-shadow-sm">{balance}</span>
            </div>

            {/* Coin Balance */}
            <div className="bg-black/60 px-3 py-1 rounded border border-yellow-500/30 flex items-center gap-2 shadow-lg">
                <svg viewBox="0 0 36 36" className="w-5 h-5 flex shrink-0 drop-shadow-md filter brightness-110">
                    <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2"/>
                    <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2"/>
                    <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
                </svg>
                <span className="text-yellow-400 font-bold drop-shadow-sm">{coins}</span>
            </div>

            {/* Sound Toggle */}
            <div 
                className="bg-black/50 p-1 rounded border border-white/20 cursor-pointer hover:bg-white/10 ml-1"
                onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
            >
                {soundEnabled ? <Volume2 size={20} className="text-white"/> : <VolumeX size={20} className="text-white"/>}
            </div>
        </div>
      </div>

      {/* RENDER CURRENT PAGE */}
      {renderContent()}

      {/* NAVIGATION (Bottom on Mobile, Right on Desktop) */}
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />

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

    </div>
  );
};

export default App;
