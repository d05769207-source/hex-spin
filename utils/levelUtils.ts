// Level System Configuration
// Level 1: 10 spins
// Level 10: 1000 spins
// Level 50: 25,000 spins
// Level 100: 100,000 spins

// Formula: Spins = 10 * Level^2

export const calculateLevel = (totalSpins: number): number => {
    if (totalSpins < 10) return 1;

    // Formula: Level = sqrt(Spins / 10)
    const level = Math.sqrt(totalSpins / 10);

    // Cap at 100 if needed, or let it grow indefinitely? 
    // User mentioned "100 level jane me", implying 100 is a soft cap or goal.
    // For now, simple calculation.
    return Math.floor(level);
};

export const getSpinsForLevel = (level: number): number => {
    if (level <= 1) return 0; // Level 1 starts at 0
    // Actually, usually "Spins needed to reach Level X".
    // If Level 1 is start, you need 0 spins.
    // To reach Level 2 (from 1), you need spins.

    // Let's stick to the curve:
    // Reach Level 2: 10 * 2^2 = 40 spins?
    // Reach Level 100: 10 * 100^2 = 100,000 spins.

    return 10 * (level * level);
};

export const getLevelProgress = (totalSpins: number) => {
    const currentLevel = calculateLevel(totalSpins);
    const nextLevel = currentLevel + 1;

    const currentLevelSpins = getSpinsForLevel(currentLevel);
    const nextLevelSpins = getSpinsForLevel(nextLevel);

    const spinsInLevel = totalSpins - currentLevelSpins;
    const spinsNeededForLevel = nextLevelSpins - currentLevelSpins;

    const progress = Math.min(100, Math.max(0, (spinsInLevel / spinsNeededForLevel) * 100));

    return {
        currentLevel,
        nextLevel,
        currentLevelSpins,
        nextLevelSpins,
        spinsInLevel,
        spinsNeededForLevel,
        progress,
        totalSpins
    };
};

export const getLevelReward = (level: number): number => {
    if (level <= 0) return 0;
    if (level === 100) return 0; // Mystery Box, handled separately or manual claim? For now 0 e-tokens automatically.

    // Formula from Profile.tsx:
    // Level 1 = 10, Level 99 = 1000
    // Linear interpolation: y = 10.102 * (x - 1) + 10

    let tokens = Math.floor(10.10204 * (level - 1) + 10);

    if (level === 99) tokens = 1000;

    return tokens;
};
