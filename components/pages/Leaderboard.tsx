import React, { useState, useEffect } from 'react';
import { Trophy, Users, Loader2, Plus, X, UserPlus, User as UserIcon, Bell, Search, Check, UserMinus, Copy, Send } from 'lucide-react';
import { auth, db } from '../../firebase';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { LeaderboardEntry, User, FriendRequest, Friend } from '../../types';
import EToken from '../EToken';
import PrizeImage from '../PrizeImage';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  getCountFromServer
} from 'firebase/firestore';
import { getLevelProgress } from '../../utils/levelUtils';

// Local interfaces removed in favor of global types

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRIZE' | 'WEEKLY' | 'FRIENDS'>('WEEKLY');
  const currentUser = auth.currentUser;

  // Use custom hook for leaderboard data
  const { leaderboard, loading, userRank, weekRange } = useLeaderboard(
    currentUser?.uid,
    100
  );

  // Get current user's data from leaderboard
  const [currentUserData, setCurrentUserData] = useState<LeaderboardEntry | null>(null);

  // New States for Menu and Profile View
  const [menuState, setMenuState] = useState<{ id: string; top: number; right: number } | null>(null);
  const [viewProfileUser, setViewProfileUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Friend System States
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Real Data States
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Track IDs of users we sent requests to

  // Friends Leaderboard State
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingFriendsBoard, setLoadingFriendsBoard] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const userData = leaderboard.find(entry => entry.userId === currentUser.uid);
      if (userData) {
        setCurrentUserData(userData);
      } else if (userRank > 0) {
        // User not in top 100 but has a rank. Fetch their coins for display.
        const fetchUserCoins = async () => {
          if (!currentUser) return;
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              setCurrentUserData({
                userId: currentUser.uid,
                username: currentUser.displayName || 'You',
                coins: userDoc.data().coins || 0,
                rank: userRank,
                isMe: true
              });
            }
          } catch (e) {
            console.error("Error fetching user coins for footer:", e);
          }
        };
        fetchUserCoins();
      }
    }
  }, [currentUser, leaderboard, userRank]);

  // Real-time Listeners for Friends and Requests
  useEffect(() => {
    if (!currentUser) return;

    // Listen for Friend Requests
    const requestsRef = collection(db, 'users', currentUser.uid, 'friendRequests');
    const unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
      const reqs: FriendRequest[] = [];
      snapshot.forEach(doc => {
        reqs.push({ id: doc.id, ...doc.data() } as FriendRequest);
      });
      setFriendRequests(reqs);
    });

    // Listen for Friends
    const friendsRef = collection(db, 'users', currentUser.uid, 'friends');
    const unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
      const friendsList: Friend[] = [];
      snapshot.forEach(doc => {
        friendsList.push({ id: doc.id, ...doc.data() } as Friend);
      });
      setFriends(friendsList);
    });

    const sentRef = collection(db, 'users', currentUser.uid, 'sentFriendRequests');
    const unsubscribeSent = onSnapshot(sentRef, (snapshot) => {
      const sentIds = snapshot.docs.map(doc => doc.id);
      setSentRequests(sentIds);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeFriends();
      unsubscribeSent();
    };
  }, [currentUser]);

  // Fetch Friends Leaderboard Data
  useEffect(() => {
    if (activeTab === 'FRIENDS' && currentUser && friends.length > 0) {
      const fetchFriendsScores = async () => {
        setLoadingFriendsBoard(true);
        try {
          // Fetch current user's latest data
          const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const myData = myDoc.data();
          const me: LeaderboardEntry = {
            userId: currentUser.uid,
            username: myData?.username || currentUser.displayName || 'You',
            photoURL: myData?.photoURL || currentUser.photoURL || '',
            coins: myData?.coins || 0,
            totalSpins: myData?.totalSpins || 0,
            isMe: true,
            // @ts-ignore
            createdAt: myData?.createdAt?.toMillis ? myData.createdAt.toMillis() : (myData?.createdAt || Date.now())
          };

          // Fetch all friends' data
          const friendPromises = friends.map(async (friend) => {
            const userDoc = await getDoc(doc(db, 'users', friend.id));
            const userData = userDoc.data();
            return {
              userId: friend.id,
              username: userData?.username || friend.username,
              photoURL: userData?.photoURL || friend.photoURL,
              coins: userData?.coins || 0,
              totalSpins: userData?.totalSpins || 0,
              isMe: false,
              // @ts-ignore
              createdAt: userData?.createdAt?.toMillis ? userData.createdAt.toMillis() : (userData?.createdAt || Date.now())
            } as LeaderboardEntry;
          });

          const friendsData = await Promise.all(friendPromises);

          // Combine and Sort
          const allPlayers = [me, ...friendsData];
          allPlayers.sort((a, b) => {
            // 1. Sort by Total Spins (Highest First)
            const spinsA = a.totalSpins || 0;
            const spinsB = b.totalSpins || 0;
            if (spinsB !== spinsA) {
              return spinsB - spinsA;
            }

            // 2. Sort by Time (Oldest First / First Come First Serve)
            // @ts-ignore
            const timeA = a.createdAt || 0;
            // @ts-ignore
            const timeB = b.createdAt || 0;
            return timeA - timeB;
          });

          // Assign Ranks
          const rankedPlayers = allPlayers.map((player, index) => ({
            ...player,
            rank: index + 1
          }));

          setFriendsLeaderboard(rankedPlayers);
        } catch (error) {
          console.error("Error fetching friends leaderboard:", error);
        } finally {
          setLoadingFriendsBoard(false);
        }
      };

      fetchFriendsScores();
    } else if (activeTab === 'FRIENDS' && currentUser && friends.length === 0) {
      // If no friends, just show current user as rank 1? Or empty state?
      // Let's show just current user for now or keep empty logic but we need to handle the list.
      // Actually, if 0 friends, the JSX handles "No friends yet".
      setFriendsLeaderboard([]);
    }
  }, [activeTab, friends, currentUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuState && !(event.target as Element).closest('.menu-content') && !(event.target as Element).closest('.menu-trigger')) {
        setMenuState(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', () => setMenuState(null));

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', () => setMenuState(null));
    };
  }, [menuState]);

  // Manual Search Function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearchActive(false);
      setSearchResults([]);
      return;
    }

    setIsSearchActive(true);
    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const resultsMap = new Map<string, User>();

      // 1. Search by Username
      const usernameQuery = query(
        usersRef,
        where('username', '>=', searchQuery),
        where('username', '<=', searchQuery + '\uf8ff'),
        limit(5)
      );

      // 2. Search by Display ID (if query is numeric)
      let idQuery = null;
      if (!isNaN(Number(searchQuery))) {
        idQuery = query(usersRef, where('displayId', '==', Number(searchQuery)), limit(1));
      }

      // Execute queries
      const queries = [getDocs(usernameQuery)];
      if (idQuery) {
        queries.push(getDocs(idQuery));
      }

      const snapshots = await Promise.all(queries);

      const usernameSnapshot = snapshots[0];
      const idSnapshot = idQuery ? snapshots[1] : null;

      // Process Username Results
      usernameSnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) {
          resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
        }
      });

      // Process ID Results
      if (idSnapshot) {
        idSnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) {
            resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
          }
        });
      }

      setSearchResults(Array.from(resultsMap.values()));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewProfile = async (userId: string) => {
    setMenuState(null);
    setLoadingProfile(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setViewProfileUser({ id: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Send Friend Request
  const handleSendRequest = async (targetUser: { id: string; username: string; photoURL?: string }) => {
    if (!currentUser) return;
    setMenuState(null); // Close menu if open

    try {
      // 1. Check if already friends
      const friendDoc = await getDoc(doc(db, 'users', currentUser.uid, 'friends', targetUser.id));
      if (friendDoc.exists()) {
        showNotification("You are already friends!", 'error');
        return;
      }

      // 2. Check if request already sent (locally check first)
      if (sentRequests.includes(targetUser.id)) {
        showNotification("Request already sent!", 'error');
        return;
      }

      // 3. Check my friend limit (100)
      if (friends.length >= 100) {
        showNotification("You have reached the maximum limit of 100 friends.", 'error');
        return;
      }

      // 4. Check target's pending request limit (50)
      const targetRequestsRef = collection(db, 'users', targetUser.id, 'friendRequests');
      const targetRequestsSnapshot = await getCountFromServer(targetRequestsRef);
      if (targetRequestsSnapshot.data().count >= 50) {
        showNotification("This user has too many pending friend requests.", 'error');
        return;
      }

      // 5. Send Request (Write to target's friendRequests)
      await setDoc(doc(db, 'users', targetUser.id, 'friendRequests', currentUser.uid), {
        username: currentUser.displayName || 'Unknown',
        photoURL: currentUser.photoURL || '',
        timestamp: serverTimestamp()
      });

      // 6. Track Sent Request (Write to my sentFriendRequests)
      await setDoc(doc(db, 'users', currentUser.uid, 'sentFriendRequests', targetUser.id), {
        timestamp: serverTimestamp()
      });

      showNotification("Friend request sent!");

    } catch (error) {
      console.error("Error sending friend request:", error);
      showNotification("Failed to send request.", 'error');
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (!currentUser) {
      console.error("No current user");
      return;
    }

    if (!req || !req.id) {
      console.error("Invalid request object passed to handleAcceptRequest:", req);
      showNotification("Error: Invalid request data. Please try refreshing.", 'error');
      return;
    }

    console.log("Accepting request from:", req.id, req.username);

    try {
      // Check my friend limit again before accepting
      if (friends.length >= 100) {
        showNotification("You cannot accept more friends. Limit of 100 reached.", 'error');
        return;
      }

      await runTransaction(db, async (transaction) => {
        // 1. Remove from my friendRequests
        const reqRef = doc(db, 'users', currentUser.uid, 'friendRequests', req.id);
        transaction.delete(reqRef);

        // 2. Remove from sender's sentFriendRequests
        const senderSentRef = doc(db, 'users', req.id, 'sentFriendRequests', currentUser.uid);
        transaction.delete(senderSentRef);

        // 3. Add to my friends
        const myFriendRef = doc(db, 'users', currentUser.uid, 'friends', req.id);
        transaction.set(myFriendRef, {
          username: req.username,
          photoURL: req.photoURL || '',
          timestamp: serverTimestamp()
        });

        // 4. Add me to sender's friends
        const senderFriendRef = doc(db, 'users', req.id, 'friends', currentUser.uid);
        transaction.set(senderFriendRef, {
          username: currentUser.displayName || 'Unknown',
          photoURL: currentUser.photoURL || '',
          timestamp: serverTimestamp()
        });
      });

      showNotification(`You are now friends with ${req.username}!`);
      // UI update happens automatically via listeners
    } catch (error) {
      console.error("Error accepting friend request:", error);
      showNotification("Failed to accept request.", 'error');
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!currentUser) return;

    try {
      // 1. Remove from my friendRequests
      await deleteDoc(doc(db, 'users', currentUser.uid, 'friendRequests', reqId));

      // 2. Remove from sender's sentFriendRequests
      await deleteDoc(doc(db, 'users', reqId, 'sentFriendRequests', currentUser.uid)).catch(e => console.log("Could not clear sender's sent status", e));

    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const prizeTiers = [
    { ranks: '1', prize: 'KTM Token', value: '₹3,40,000', icon: <PrizeImage prize="KTM" size="sm" glow={false} />, color: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-400' },
    { ranks: '2', prize: 'iPhone Token', value: '₹1,49,000', icon: <PrizeImage prize="iPhone" size="sm" glow={false} />, color: 'from-blue-400 to-purple-500', textColor: 'text-blue-400' },
    { ranks: '3', prize: '200 E-Tokens', icon: null, color: 'from-green-400 to-emerald-500', textColor: 'text-green-400', showEToken: true },
    { ranks: '4-10', prize: '100 E-Tokens', icon: null, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-400', showEToken: true },
    { ranks: '11-20', prize: '50 E-Tokens', icon: null, color: 'from-indigo-400 to-purple-500', textColor: 'text-indigo-400', showEToken: true },
    { ranks: '21-50', prize: '25 E-Tokens', icon: null, color: 'from-pink-400 to-rose-500', textColor: 'text-pink-400', showEToken: true },
    { ranks: '51-100', prize: '10 E-Tokens', icon: null, color: 'from-orange-400 to-red-500', textColor: 'text-orange-400', showEToken: true }
  ];


  const formatRank = (rank: number) => {
    if (rank <= 0) return '-';
    if (rank < 1000) return rank.toString();
    return `${(rank / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  };

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 tracking-widest drop-shadow-sm">
          Leaderboard
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex w-fit mx-auto bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/20 mb-4">
        <button
          onClick={() => setActiveTab('PRIZE')}
          className={`w-24 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center ${activeTab === 'PRIZE'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Prize Pool
        </button>
        <button
          onClick={() => setActiveTab('WEEKLY')}
          className={`w-24 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center ${activeTab === 'WEEKLY'
            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('FRIENDS')}
          className={`w-24 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center ${activeTab === 'FRIENDS'
            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
            : 'text-gray-300 hover:text-white'
            }`}
        >
          Friends
        </button>
      </div>

      {/* Prize Pool Section */}
      {activeTab === 'PRIZE' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-left duration-300">
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="text-xl drop-shadow-md">🏆</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-200">Prize Pool - Top 100</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {prizeTiers.map((tier, i) => (
              <div
                key={i}
                className={`bg-gradient-to-r ${tier.color} p-[1px] rounded-lg`}
              >
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between hover:bg-gray-800/90 transition-colors">
                  <div className="flex items-center gap-3">
                    {tier.showEToken ? (
                      <EToken size={24} />
                    ) : (
                      <span className="text-2xl">{tier.icon}</span>
                    )}
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Rank {tier.ranks}</div>
                      <div className={`text-sm font-black ${tier.textColor}`}>{tier.prize}</div>
                      {/* @ts-ignore */}
                      {tier.value && (
                        /* @ts-ignore */
                        <div className="text-[10px] text-white/80 font-bold">Value: {tier.value}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Rankings Section */}
      {activeTab === 'WEEKLY' && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
          <div className="text-xs text-white mb-3 uppercase tracking-wider font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              This Week Rankings
            </div>
            <span className="text-[10px] text-gray-300 font-bold">{weekRange}</span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                <p className="text-gray-400 text-sm">Loading leaderboard...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && leaderboard.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6 bg-black/40 rounded-xl border border-yellow-500/20">
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3 opacity-50" />
                <p className="text-gray-300 font-bold mb-2">No rankings yet!</p>
                <p className="text-gray-500 text-xs">Be the first to earn coins this week</p>
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          {!loading && leaderboard.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">

              {/* LEADERBOARD LIST (All Ranks) */}
              <div className="space-y-2 pb-4 mt-4">
                {leaderboard.map((player, index) => {
                  const isCurrentUser = currentUser && player.userId === currentUser.uid;

                  // Rank Styles
                  let rankBg = 'bg-gradient-to-br from-gray-800 to-black text-gray-300 border-gray-600 shadow-black/50';
                  let rankColor = 'text-cyan-300';

                  if (player.rank === 1) {
                    rankBg = 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black border-yellow-200 shadow-yellow-500/50';
                    rankColor = 'text-yellow-400';
                  } else if (player.rank === 2) {
                    rankBg = 'bg-gradient-to-br from-gray-300 to-gray-500 text-black border-gray-200 shadow-gray-400/50';
                    rankColor = 'text-gray-300';
                  } else if (player.rank === 3) {
                    rankBg = 'bg-gradient-to-br from-orange-400 to-orange-600 text-black border-orange-200 shadow-orange-500/50';
                    rankColor = 'text-orange-400';
                  } else if (isCurrentUser) {
                    rankBg = 'bg-yellow-500 text-black border-yellow-300 shadow-yellow-900/50';
                    rankColor = 'text-yellow-400';
                  }

                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom ${isCurrentUser
                        ? 'bg-gradient-to-r from-yellow-900/60 to-yellow-800/40 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                        : 'bg-gradient-to-r from-white/10 to-transparent border-white/10 hover:border-white/30 hover:bg-white/15 backdrop-blur-md'
                        }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-2"> {/* Reduced gap */}
                        {/* Rank Number & Photo */}
                        <div className="flex items-center gap-1.5 mr-2">
                          {/* Styled Rank Text - Fixed Width (w-9) & Left Aligned - Smaller text */}
                          <div className="w-9 flex items-center justify-start gap-[1px]">
                            <span className={`text-base font-bold italic transform -rotate-2 tracking-normal ${rankColor} drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]`} style={{ fontFamily: 'sans-serif' }}>#</span>
                            <span className={`text-base font-bold italic transform -rotate-2 tracking-normal ${rankColor} drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]`} style={{ fontFamily: 'sans-serif' }}>{formatRank(player.rank)}</span>
                          </div>

                          {/* User Photo */}
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full p-[1px] ${rankBg} overflow-hidden shadow-lg flex-shrink-0`}>
                            <img
                              src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                              alt={player.username}
                              referrerPolicy="no-referrer"
                              className="w-full h-full rounded-full object-cover bg-gray-900"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm md:text-base tracking-wide ${isCurrentUser ? 'text-yellow-300' : 'text-gray-100'}`}>
                            {player.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 36 36" className="w-5 h-5 md:w-6 md:h-6 drop-shadow-sm filter brightness-110">
                            <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
                            <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2" />
                            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
                          </svg>
                          <span className={`font-black text-sm md:text-base tracking-wider ${isCurrentUser ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : rankColor}`}>
                            {player.coins.toLocaleString()}
                          </span>
                        </div>

                        {/* Add Friend / View Profile Menu Trigger OR 'You' Badge */}
                        {isCurrentUser ? (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded uppercase font-bold border border-yellow-500/30">You</span>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (menuState?.id === player.userId) {
                                  setMenuState(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuState({
                                  id: player.userId,
                                  top: rect.bottom + 8,
                                  right: window.innerWidth - rect.right
                                });
                              }}
                              className="menu-trigger p-1.5 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
          }
        </div>
      )
      }


      {
        activeTab === 'FRIENDS' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="text-xs text-white mb-3 uppercase tracking-wider font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-sky-400" />
                Friends Rankings
              </div>

              {/* Friend Request Trigger */}
              <button
                onClick={() => setShowFriendModal(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
              >
                <Bell size={12} className="text-sky-400" />
                <span className="text-[10px] font-bold text-sky-300">
                  {friendRequests.length > 0 ? `${friendRequests.length} New` : 'Requests'}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {loadingFriendsBoard ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-gray-400 text-xs mt-2">Updating ranks...</p>
                </div>
              ) : friends.length > 0 ? (
                // Use Friend Leaderboard Data (Sorted)
                friendsLeaderboard.map((player, index) => {
                  const isCurrentUser = player.isMe;

                  // Rank Styles (Same as Weekly)
                  let rankBg = 'bg-gradient-to-br from-gray-800 to-black text-gray-300 border-gray-600 shadow-black/50';
                  let rankColor = 'text-cyan-300'; // Default fallback, but usually overwritten

                  if (player.rank === 1) {
                    rankBg = 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black border-yellow-200 shadow-yellow-500/50';
                    rankColor = 'text-yellow-400';
                  } else if (player.rank === 2) {
                    rankBg = 'bg-gradient-to-br from-gray-300 to-gray-500 text-black border-gray-200 shadow-gray-400/50';
                    rankColor = 'text-gray-300';
                  } else if (player.rank === 3) {
                    rankBg = 'bg-gradient-to-br from-orange-400 to-orange-600 text-black border-orange-200 shadow-orange-500/50';
                    rankColor = 'text-orange-400';
                  } else if (isCurrentUser) {
                    rankBg = 'bg-sky-500 text-white border-sky-300 shadow-sky-900/50';
                    rankColor = 'text-sky-400';
                  } else {
                    rankColor = 'text-gray-300'; // Standard non-top-3 friend
                  }

                  return (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom ${isCurrentUser
                        ? 'bg-gradient-to-r from-sky-900/60 to-sky-800/40 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                        : 'bg-gradient-to-r from-white/10 to-transparent border-white/10 hover:border-white/30 hover:bg-white/15 backdrop-blur-md'
                        }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Rank Number & Photo */}
                        <div className="flex items-center gap-1.5 mr-2">
                          <div className="w-9 flex items-center justify-start gap-[1px]">
                            <span className={`text-base font-bold italic transform -rotate-2 tracking-normal ${rankColor} drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]`} style={{ fontFamily: 'sans-serif' }}>#</span>
                            <span className={`text-base font-bold italic transform -rotate-2 tracking-normal ${rankColor} drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)]`} style={{ fontFamily: 'sans-serif' }}>{formatRank(player.rank)}</span>
                          </div>

                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full p-[1px] ${rankBg} overflow-hidden shadow-lg flex-shrink-0`}>
                            <img
                              src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`}
                              alt={player.username}
                              referrerPolicy="no-referrer"
                              className="w-full h-full rounded-full object-cover bg-gray-900"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm md:text-base tracking-wide ${isCurrentUser ? 'text-sky-300' : 'text-gray-100'}`}>
                            {player.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {/* Total Spins Icon (Target) */}
                          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${isCurrentUser ? 'text-sky-300' : 'text-gray-400'}`}>
                            <span className="text-sm">🎯</span>
                          </div>

                          <span className={`font-black text-sm md:text-base tracking-wider ${isCurrentUser ? 'text-sky-400 drop-shadow-[0_0_5px_rgba(14,165,233,0.5)]' : rankColor}`}>
                            {(player.totalSpins || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Friend Action / 'You' Badge */}
                        {isCurrentUser ? (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded uppercase font-bold border border-sky-500/30">You</span>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (menuState?.id === player.userId) {
                                  setMenuState(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuState({
                                  id: player.userId,
                                  top: rect.bottom + 8,
                                  right: window.innerWidth - rect.right
                                });
                              }}
                              className="menu-trigger p-1.5 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 opacity-50">
                  <Users size={32} className="mx-auto text-sky-500 mb-2" />
                  <p className="text-gray-400 text-xs text-sky-200/70">No friends yet.</p>
                </div>
              )}
            </div>

            {/* Add Friends Placeholder - ONLY if no friends */}
            {friends.length === 0 && (
              <div className="mt-4 p-4 bg-sky-900/20 border border-sky-500/30 rounded-xl text-center">
                <p className="text-sky-400 text-xs font-bold mb-2">Add more friends to compete!</p>
                <p className="text-gray-500 text-[10px]">Invite your friends to join the leaderboard</p>
              </div>
            )}
          </div>
        )
      }

      {/* FIXED FOOTER LOGIC - Updated for both Weekly and Friends */}
      {
        !loading && (activeTab === 'WEEKLY' ? (currentUserData && currentUserData.rank) : (activeTab === 'FRIENDS' && friendsLeaderboard.find(p => p.isMe))) && (
          (() => {
            // Determined which data to show
            const footerUser = activeTab === 'WEEKLY' ? currentUserData : friendsLeaderboard.find(p => p.isMe);
            if (!footerUser || !footerUser.rank) return null;

            const isFriends = activeTab === 'FRIENDS';
            const gradientClass = isFriends
              ? 'bg-gradient-to-r from-sky-900/90 via-black/90 to-sky-900/90 border-sky-500/60 shadow-[0_0_25px_rgba(56,189,248,0.25)]'
              : 'bg-gradient-to-r from-yellow-900/90 via-black/90 to-yellow-900/90 border-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.25)]';

            const rankDisplay = (() => {
              const r = footerUser.rank;
              if (r <= 100) return `#${r}`;

              let gap = 50;
              if (r > 2000) gap = 400;
              else if (r > 1000) gap = 200;
              else if (r > 500) gap = 100;

              const lower = Math.floor((r - 1) / gap) * gap + 1;
              const upper = lower + gap - 1;
              return `Top ${formatRank(lower)}-${formatRank(upper)}`;
            })();

            const rankTextClass = isFriends ? 'text-sky-400' : 'text-yellow-400';

            const photoBorderClass = isFriends
              ? 'bg-gradient-to-br from-sky-400 to-sky-600 border-sky-200'
              : 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-200';

            const nameGradientClass = isFriends
              ? 'from-sky-200 to-sky-500'
              : 'from-yellow-200 to-yellow-500';

            return (
              <div className="fixed bottom-16 md:bottom-4 left-0 right-0 mx-auto w-full max-w-md pl-4 pr-6 z-30">
                <div className={`${gradientClass} backdrop-blur-xl border rounded-xl p-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
                      <div className="w-auto min-w-[36px] flex items-center justify-start gap-[1px]">
                        <span className={`text-sm md:text-base font-bold italic transform -rotate-2 tracking-normal ${rankTextClass} drop-shadow-[1px_1px_1px_rgba(0,0,0,0.8)] whitespace-nowrap`} style={{ fontFamily: 'sans-serif' }}>{rankDisplay}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-full p-[1px] ${photoBorderClass} overflow-hidden shadow-lg border`}>
                        <img
                          src={footerUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${footerUser.username}`}
                          alt={footerUser.username}
                          referrerPolicy="no-referrer"
                          className="w-full h-full rounded-full object-cover bg-gray-900"
                        />
                      </div>
                    </div>
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${nameGradientClass} font-bold text-base`}>
                      {footerUser.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isFriends ? (
                      <>
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center">
                          <span className="text-sm">🎯</span>
                        </div>
                        <span className={`${rankTextClass} font-black text-base drop-shadow-sm`}>{(footerUser.totalSpins || 0).toLocaleString()}</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 36 36" className="w-5 h-5 md:w-6 md:h-6 drop-shadow-sm filter brightness-110">
                          <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
                          <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2" />
                          <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
                        </svg>
                        <span className={`${rankTextClass} font-black text-base drop-shadow-sm`}>{footerUser.coins.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )
      }


      {/* FIXED MENU - RENDERED OUTSIDE SCROLL CONTAINER */}
      {menuState && (
        <div
          className="fixed z-[100] w-36 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 menu-content"
          style={{ top: menuState.top, right: menuState.right }}
        >
          <div className="p-1">
            {/* Check if already friends or request sent */}
            {/* Check if already friends or request sent */}
            {friends.some(f => f.id === menuState.id) ? (
              // If friends, show nothing here, just the actions below
              null
            ) : sentRequests.includes(menuState.id) ? (
              <div className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 bg-white/5 rounded-lg cursor-default mb-1">
                <Check size={14} />
                Request Sent
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors mb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  // Find user details from leaderboard to pass to handleSendRequest
                  const targetUser = leaderboard.find(u => u.userId === menuState.id) || friendsLeaderboard.find(u => u.userId === menuState.id);
                  if (targetUser) {
                    handleSendRequest({ id: targetUser.userId, username: targetUser.username });
                  }
                }}
              >
                <UserPlus size={14} className="text-cyan-400" />
                Add Friend
              </button>
            )}

            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                showNotification("Gift feature to be added soon!", 'success');
                setMenuState(null);
              }}
            >
              <Send size={14} className="text-pink-400" />
              Send Gift
            </button>

            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                console.log('View Profile clicked for:', menuState.id);
                // Explicitly set the user ID to view
                handleViewProfile(menuState.id);
                setMenuState(null); // Close menu
              }}
            >
              <UserIcon size={14} className="text-yellow-400" />
              View Profile
            </button>
          </div>
        </div>
      )}

      {/* FRIEND ZONE MODAL */}
      {
        showFriendModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-gray-900 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">

              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-900/95 sticky top-0 z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-cyan-400" />
                  Friend Zone
                </h3>
                <button
                  onClick={() => {
                    setShowFriendModal(false);
                    setSearchQuery('');
                    setIsSearchActive(false);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4 pb-2 flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search Username or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black p-3 rounded-xl transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Search size={20} />
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3">

                {/* SEARCH RESULTS MODE */}
                {isSearchActive ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Search Results</p>
                      <button
                        onClick={() => {
                          setIsSearchActive(false);
                          setSearchQuery('');
                        }}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Clear Search
                      </button>
                    </div>

                    {isSearching ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                              <img
                                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                                alt={user.username}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{user.username}</span>
                              <span className="text-[10px] text-gray-500">Lvl {getLevelProgress(user.totalSpins || 0).currentLevel} • {user.coins?.toLocaleString() || 0} Coins</span>
                            </div>
                          </div>
                          <button
                            className={`p-2 rounded-lg transition-colors ${friends.some(f => f.id === user.id)
                              ? 'bg-green-500/20 text-green-400 cursor-default'
                              : sentRequests.includes(user.id)
                                ? 'bg-gray-500/20 text-gray-400 cursor-default'
                                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
                              }`}
                            onClick={() => {
                              if (!friends.some(f => f.id === user.id) && !sentRequests.includes(user.id)) {
                                handleSendRequest({ id: user.id, username: user.username || 'User', photoURL: user.photoURL || '' });
                              }
                            }}
                          >
                            {friends.some(f => f.id === user.id) ? (
                              <Check size={18} />
                            ) : sentRequests.includes(user.id) ? (
                              <Check size={18} />
                            ) : (
                              <UserPlus size={18} />
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-xs">
                        No users found matching "{searchQuery}"
                      </div>
                    )}
                  </>
                ) : (
                  /* PENDING REQUESTS MODE */
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Requests</p>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">{friendRequests.length}</span>
                    </div>

                    {friendRequests.length > 0 ? (
                      friendRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-bottom duration-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                              <img
                                src={req.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                                alt={req.username}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{req.username}</span>
                              <span className="text-[10px] text-gray-500">{req.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                            <button
                              onClick={() => handleAcceptRequest(req)}
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <Bell size={32} className="text-gray-600 mb-3" />
                        <p className="text-gray-400 text-xs font-bold">No pending requests</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* PROFILE MODAL */}
      {
        (viewProfileUser || loadingProfile) && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !loadingProfile && setViewProfileUser(null)}>
            <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

              {loadingProfile ? (
                <div className="p-8 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                  <p className="text-gray-400 text-sm font-bold">Loading Profile...</p>
                </div>
              ) : viewProfileUser && (
                <>
                  {/* Close Button */}
                  <button
                    onClick={() => setViewProfileUser(null)}
                    className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-20"
                  >
                    <X size={18} />
                  </button>

                  {/* Profile Content */}
                  <div className="p-4 relative">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-center justify-between relative z-10 mb-6">
                      {/* Left: Photo & Level */}
                      <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-sm opacity-50"></div>
                          <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                            <img
                              src={viewProfileUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop'}
                              alt="User"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-wider">
                            LVL {getLevelProgress(viewProfileUser.totalSpins || 0).currentLevel}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Name & UID */}
                      <div className="flex-1 flex flex-col justify-center px-4">
                        <h3 className="text-base font-bold text-white truncate max-w-[150px]">{viewProfileUser.username || 'Guest Player'}</h3>

                        {/* UID Display with Copy */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">UID:</span>
                          <span className="text-[10px] text-yellow-500 font-mono font-bold">
                            {viewProfileUser.displayId ? viewProfileUser.displayId : '---'}
                          </span>
                          {viewProfileUser.displayId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(viewProfileUser.displayId?.toString() || '');
                              }}
                              className="ml-1 p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                              title="Copy UID"
                            >
                              <Copy size={10} />
                            </button>
                          )}
                        </div>

                        {/* Level Progress Bar */}
                        <div className="w-full mt-2">
                          {(() => {
                            const levelData = getLevelProgress(viewProfileUser.totalSpins || 0);
                            return (
                              <>
                                <div className="flex justify-between text-[8px] text-gray-400 mb-0.5">
                                  <span>Lvl {levelData.currentLevel}</span>
                                  <span>{Math.floor(levelData.progress)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                    style={{ width: `${levelData.progress}%` }}
                                  />
                                </div>
                                <p className="text-[8px] text-gray-500 mt-0.5 text-right">
                                  {levelData.spinsInLevel} / {levelData.spinsNeededForLevel} to Lvl {levelData.nextLevel}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/60 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
                          <span className="text-yellow-400 font-bold text-lg drop-shadow-sm">{(viewProfileUser.coins || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                          <span className="text-lg">💰</span>
                        </div>
                      </div>
                      <div className="bg-gray-800/60 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Spins</span>
                          <span className="text-red-400 font-bold text-lg drop-shadow-sm">{(viewProfileUser.totalSpins || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                          <span className="text-lg">🎯</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>
        )
      }

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom duration-300 fade-in">
          <div className={`px-4 py-2 rounded-full shadow-2xl border backdrop-blur-md flex items-center gap-2 ${toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/50 text-green-400'
            : 'bg-red-500/10 border-red-500/50 text-red-400'
            }`}>
            {toast.type === 'success' ? <Check size={14} /> : <X size={14} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
