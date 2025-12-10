
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export const removeSortUsers = async () => {
    console.log('🧹 Starting cleanup of "Sort_" users...');

    // 1. Find users with names starting with "Sort_" from the weeklyLeaderboard
    // Note: '>= Sort_' and '<= Sort_\uf8ff' is a standard way to query prefix in Firestore
    const leaderboardRef = collection(db, 'weeklyLeaderboard');
    const q = query(
        leaderboardRef,
        where('username', '>=', 'Sort_'),
        where('username', '<=', 'Sort_\uf8ff')
    );

    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} Sort_ users to delete.`);

    if (snapshot.empty) {
        console.log('✅ No users found. Cleanup complete.');
        return;
    }

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
        // Delete from leaderboard
        batch.delete(docSnap.ref);
    });

    await batch.commit();
    console.log('✅ Deleted all findings from leaderboard.');
};
