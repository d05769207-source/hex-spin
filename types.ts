
export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export interface GameItem {
  id: string;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  amount?: number;
  isInner: boolean; // True for the 4 central items
  position: { x: number; y: number }; // Mobile coordinates (Compact)
  desktopPosition?: { x: number; y: number }; // Desktop coordinates (Spacious)
}

export interface SpinCost {
  single: number;
  five: number;
}

export type Page = 'HOME' | 'EVENT' | 'RANK' | 'SHOP' | 'PROFILE' | 'ADMIN_DASHBOARD';

export interface User {
  id: string;
  uid?: string;
  email?: string;
  username?: string;
  isGuest: boolean;
  eTokens?: number;
  tokens?: number; // Spin tokens
  ktmTokens?: number;
  iphoneTokens?: number;
  photoURL?: string;
  weeklyCoins?: number;
  coins?: number; // Total coins for leaderboard sync
  displayId?: number; // Numeric ID for display (e.g., 100000)
  createdAt?: Date;
  lastActive?: Date;
  weekStartDate?: Date;
  totalSpins?: number;
  level?: number;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string; // UID of the user who referred this user
  referralDismissed?: boolean; // Has user permanently dismissed the referral prompt?
  lastLevelRewardTriggered?: number; // The last level for which the referrer received a reward
  inrBalance?: number; // Real money balance in Rupees (INR)
  spinsToday?: number; // Spins performed today (resets daily)
  lastSpinDate?: Date; // Date of the last spin (for daily reset)
  superModeEndTime?: Date; // When the Super Mode expires
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  coins: number;
  photoURL?: string;
  rank?: number;
  isMe?: boolean;
}

export interface WeeklyStats {
  weekId: string;
  startDate: Date;
  endDate: Date;
  totalPlayers: number;
}
