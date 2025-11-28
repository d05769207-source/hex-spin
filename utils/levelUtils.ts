
// Level System Configuration
// Level 1: 0 spins
// Level 2: 50 spins
// Level 3: 80 spins
// Level 4: 100 spins
// Level 5: 200 spins
// Level 20: ~1100 spins
// Level 100: ~21000 spins

// Formula for Level >= 5: Spins = 2 * L^2 + 10 * L + 100
// L5 = 2(25) + 50 + 100 = 200
// L20 = 2(400) + 200 + 100 = 1100
// L100 = 2(10000) + 1000 + 100 = 21100

const EARLY_LEVELS: { [key: number]: number } = {
    1: 0,
    2: 50,
    3: 80,
    4: 100,
};

export const calculateLevel = (totalSpins: number): number => {
    // Check early levels first
    if (totalSpins < 50) return 1;
    if (totalSpins < 80) return 2;
    if (totalSpins < 100) return 3;
    if (totalSpins < 200) return 4;

    // For Level 5 and above, we need to solve the quadratic equation for L:
    // 2L^2 + 10L + (100 - Spins) = 0
    // ax^2 + bx + c = 0
    // a = 2, b = 10, c = 100 - Spins
    // L = (-b + sqrt(b^2 - 4ac)) / 2a

    const a = 2;
    const b = 10;
    const c = 100 - totalSpins;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return 4; // Should not happen if spins >= 200

    const level = (-b + Math.sqrt(discriminant)) / (2 * a);

    return Math.floor(level);
};

export const getSpinsForLevel = (level: number): number => {
    if (level <= 1) return 0;
    if (level <= 4) return EARLY_LEVELS[level];

    return 2 * (level * level) + 10 * level + 100;
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
