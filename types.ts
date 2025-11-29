
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
  photoURL?: string;
  weeklyCoins?: number;
  coins?: number; // Total coins for leaderboard sync
  createdAt?: Date;
  lastActive?: Date;
  weekStartDate?: Date;
  totalSpins?: number;
  level?: number;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string; // ID of the user who referred this user
  referralRewardsClaimed?: number[]; // List of levels for which the referrer has received rewards
  hasSeenReferralPrompt?: boolean; // Whether the user has seen/skipped the manual referral input modal
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
