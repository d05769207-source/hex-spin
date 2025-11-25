
import { GameItem, Rarity } from './types';

// Layout Strategy:
// 1. Mobile: Tight/Compact layout (x: 19, y: 13) to bring items closer.
// 2. Desktop: Balanced layout (x: 24, y: 15) for 420px container.

export const ITEMS: GameItem[] = [
  // --- INNER DIAMOND (4 Main Prizes) ---

  // TIER 2: Medium Size (Top) -> User #1 -> 10K Coins
  {
    id: 'inner-top',
    name: '10K Coins',
    imageUrl: '', // Special Render
    rarity: Rarity.LEGENDARY,
    amount: 10000,
    isInner: true,
    position: { x: 0, y: -13 },
    desktopPosition: { x: 0, y: -15 },
  },
  // TIER 2: Medium Size (Bottom) -> User #2 -> 5K Coins
  {
    id: 'inner-bottom',
    name: '5K Coins',
    imageUrl: '', // Special Render
    rarity: Rarity.EPIC,
    amount: 5000,
    isInner: true,
    position: { x: 0, y: 13 },
    desktopPosition: { x: 0, y: 15 },
  },
  // TIER 1: Large Size (Left) → User #3 → KTM
  {
    id: 'inner-left',
    name: 'KTM Duke',
    imageUrl: '/images/ktm_bike.png',
    rarity: Rarity.RARE,
    isInner: true,
    position: { x: -19, y: 0 },
    desktopPosition: { x: -24, y: 0 },
  },
  // TIER 1: Large Size (Right) → User #4 → iPhone (Orange Theme)
  {
    id: 'inner-right',
    name: 'iPhone 15 Pro',
    imageUrl: '/images/iphone.png',
    rarity: Rarity.EPIC,
    isInner: true,
    position: { x: 19, y: 0 },
    desktopPosition: { x: 24, y: 0 },
  },

  // --- OUTER RING (10 Items) ---
  // Mapped based on User Instructions:
  // 5->1k, 6->100, 7->10, 8->2, 9->20, 10->500, 11->200, 12->5, 13->1, 14->50

  // 1. Top Center (User No. 5)
  {
    id: 'outer-1',
    name: 'Coins x1000',
    imageUrl: '',
    rarity: Rarity.LEGENDARY,
    amount: 1000,
    isInner: false,
    position: { x: 0, y: -30 },
    desktopPosition: { x: 0, y: -37 },
  },
  // 2. Top Right (User No. 6)
  {
    id: 'outer-2',
    name: 'Coins x100',
    imageUrl: '',
    rarity: Rarity.RARE,
    amount: 100,
    isInner: false,
    position: { x: 17, y: -23 },
    desktopPosition: { x: 21, y: -27 },
  },
  // 3. Right Upper (User No. 7)
  {
    id: 'outer-3',
    name: 'Coins x10',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 10,
    isInner: false,
    position: { x: 33, y: -11 },
    desktopPosition: { x: 39, y: -13 },
  },
  // 4. Right Lower (User No. 8)
  {
    id: 'outer-4',
    name: 'Coins x2',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 2,
    isInner: false,
    position: { x: 33, y: 11 },
    desktopPosition: { x: 39, y: 13 },
  },
  // 5. Bottom Right (User No. 9)
  {
    id: 'outer-5',
    name: 'Coins x20',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 20,
    isInner: false,
    position: { x: 17, y: 23 },
    desktopPosition: { x: 21, y: 27 },
  },
  // 6. Bottom Center (User No. 10)
  {
    id: 'outer-6',
    name: 'Coins x500',
    imageUrl: '',
    rarity: Rarity.EPIC,
    amount: 500,
    isInner: false,
    position: { x: 0, y: 30 },
    desktopPosition: { x: 0, y: 37 },
  },
  // 7. Bottom Left (User No. 11)
  {
    id: 'outer-7',
    name: 'Coins x200',
    imageUrl: '',
    rarity: Rarity.RARE,
    amount: 200,
    isInner: false,
    position: { x: -17, y: 23 },
    desktopPosition: { x: -21, y: 27 },
  },
  // 8. Left Lower (User No. 12)
  {
    id: 'outer-8',
    name: 'Coins x5',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 5,
    isInner: false,
    position: { x: -33, y: 11 },
    desktopPosition: { x: -39, y: 13 },
  },
  // 9. Left Upper (User No. 13)
  {
    id: 'outer-9',
    name: 'Coins x1',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 1,
    isInner: false,
    position: { x: -33, y: -11 },
    desktopPosition: { x: -39, y: -13 },
  },
  // 10. Top Left (User No. 14)
  {
    id: 'outer-10',
    name: 'Coins x50',
    imageUrl: '',
    rarity: Rarity.COMMON,
    amount: 50,
    isInner: false,
    position: { x: -17, y: -23 },
    desktopPosition: { x: -21, y: -27 },
  },
];

export const SPIN_SEQUENCE = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
];
