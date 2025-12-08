
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
  lastWeekId?: string; // Tracks the last week the user was active/reset
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
  superModeSpinsLeft?: number; // New: 50 spin limit
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

// Bot System Types
export enum BotTier {
  ELITE = 'ELITE',           // Top 5-15 range (2 bots)
  COMPETITIVE = 'COMPETITIVE', // Top 20-50 range (20 bots)
  ACTIVE = 'ACTIVE',         // Rank 50-100 (50 bots)
  CASUAL = 'CASUAL'          // Rank 100-300 (128 bots)
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
  botTier: BotTier;
  targetCoins: number;
  spinPattern: 'fast' | 'steady' | 'slow';
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
