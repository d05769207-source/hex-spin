
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

export type Page = 'HOME' | 'RANK' | 'SHOP' | 'PROFILE';

export interface User {
  id: string;
  email?: string;
  username?: string;
  isGuest: boolean;
}
