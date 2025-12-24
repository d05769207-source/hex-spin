// LEADERBOARD REPAIR SCRIPT
// Use this to manually fix users whose leaderboard coins are showing 0

import { forceResyncUserToLeaderboard } from './services/leaderboardService';

// HOW TO USE:
// 1. Open browser console (F12)
// 2. Find the user ID that needs repair
// 3. Run: window.repairUserLeaderboard('USER_ID_HERE')

// Example:
// window.repairUserLeaderboard('abc123xyz')

// Make function globally available
(window as any).repairUserLeaderboard = async (userId: string) => {
    try {
        console.log(`🔧 Starting repair for user: ${userId}`);
        await forceResyncUserToLeaderboard(userId);
        console.log(`✅ Repair complete! Check leaderboard now.`);
        alert('✅ User leaderboard data repaired successfully!');
    } catch (error) {
        console.error('❌ Repair failed:', error);
        alert('❌ Repair failed. Check console for details.');
    }
};

console.log('🛠️ Repair script loaded! Use: window.repairUserLeaderboard("USER_ID")');
