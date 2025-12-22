
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
  probability?: string; // e.g. "0.5%"
  superProbability?: string; // e.g. "5%" (For Super Mode)
}

export interface SpinCost {
  single: number;
  five: number;
}

export type Page = 'HOME' | 'EVENT' | 'RANK' | 'SHOP' | 'PROFILE' | 'MAILBOX' | 'ADMIN_DASHBOARD';

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
  lastWeekId?: string; // Tracks the last week the user was active/reset
  totalSpins?: number;
  level?: number;
  referralCode?: string;
  referralCount?: number;
  referredBy?: string; // UID of the user who referred this user
  referralDismissed?: boolean; // Has user permanently dismissed the referral prompt?
  lastLevelRewardTriggered?: number; // The last level for which the referrer received a reward
  referralEarnings?: number; // Total eTokens earned from referrals (Signups + Level Ups)
  inrBalance?: number; // Real money balance in Rupees (INR)
  spinsToday?: number; // Spins performed today (resets daily)
  lastSpinDate?: Date; // Date of the last spin (for daily reset)
  superModeEndTime?: Date; // When the Super Mode expires
  superModeSpinsLeft?: number; // New: 50 spin limit
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  coins: number;
  photoURL?: string;
  rank?: number;
  totalSpins?: number;
  level?: number;
  isMe?: boolean;
}

export interface WeeklyStats {
  weekId: string;
  startDate: Date;
  endDate: Date;
  totalPlayers: number;
}

// Bot System Types
export enum BotTier {
  ELITE = 'ELITE',           // Deprecated
  COMPETITIVE = 'COMPETITIVE', // Deprecated
  ACTIVE = 'ACTIVE',         // Deprecated
  CASUAL = 'CASUAL',          // Deprecated

  // NEW SMART TIERS
  SMART_LEADER = 'SMART_LEADER', // Bots that chase top ranks
  SMART_LOTTERY = 'SMART_LOTTERY' // Bot rigged to win lottery
}

export interface BotConfig {
  tier: BotTier;
  minCoins: number;
  maxCoins: number;
  activationHoursBeforeReset: number;
  spinPatternType: 'fast' | 'steady' | 'slow';
}

export interface BotUser extends User {
  isBot: true;
  botTier: BotTier; // Usage: To identify role
  targetCoins?: number;
  spinPattern?: 'fast' | 'steady' | 'slow';
  activationTime?: Date;
  lastBotUpdate?: Date;
}

export interface BotSystemConfig {
  enabled: boolean;
  totalBots: number;
  eliteBots: number;
  competitiveBots: number;
  activeBots: number;
  casualBots: number;
  realUserPriorityThreshold: number; // e.g., 0.8 for 80%
  tierConfigs: {
    [BotTier.ELITE]: BotConfig;
    [BotTier.COMPETITIVE]: BotConfig;
    [BotTier.ACTIVE]: BotConfig;
    [BotTier.CASUAL]: BotConfig;
  };
  lastGlobalUpdate?: any; // Firestore Timestamp
}

export interface RealUserStats {
  count: number;
  averageCoins: number;
  maxCoins: number;
  top10MaxCoins: number;
}

// Mailbox Message Types
export enum MessageType {
  WEEKLY_REWARD = 'WEEKLY_REWARD',
  LEVEL_REWARD = 'LEVEL_REWARD',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
  NOTICE = 'NOTICE',
  SYSTEM = 'SYSTEM'
}

export enum MessageStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  CLAIMED = 'CLAIMED'
}

export interface MailboxMessage {
  id: string;
  userId: string;
  type: MessageType;
  title: string;
  description: string;
  createdAt: Date;
  expiresAt: Date;
  status: MessageStatus;

  // Reward data (for WEEKLY_REWARD type)
  rewardType?: 'E_TOKEN' | 'COINS' | 'SPIN_TOKEN';
  rewardAmount?: number;
  sourceCoins?: number; // Original coins that were converted

  // Metadata
  isExpired?: boolean;
  claimedAt?: Date;
}

// Friend System Types
export interface FriendRequest {
  id: string; // The ID of the request document (or user ID, effectively)
  senderId: string;
  senderName: string; // Deprecated, use username
  username: string;
  photoURL?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any; // Firestore Timestamp
  time?: string; // Formatted time string for display (e.g., "2m ago")
}

export interface Friend {
  id: string;
  username: string;
  photoURL?: string;
  totalSpins?: number;
  coins?: number;
  isMe?: boolean;
}
