// Migration script to add existing users to weeklyLeaderboard
// This will copy all users from 'users' collection who have coins
// and add them to the current week's leaderboard

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCqk2HKkodUeTtEh_xRxrcHljrpfxWcIt4",
    authDomain: "lucky-chakra.firebaseapp.com",
    projectId: "lucky-chakra",
    storageBucket: "lucky-chakra.firebasestorage.app",
    messagingSenderId: "168560073638",
    appId: "1:168560073638:web:c06fcf6a418de96b570d67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get current week ID
const getCurrentWeekId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

const migrateExistingUsers = async () => {
    try {
        const weekId = getCurrentWeekId();
        console.log(`🔄 Migrating existing users to week: ${weekId}`);
        console.log('-----------------------------------');

        // Get all users from 'users' collection
        const usersSnapshot = await getDocs(collection(db, 'users'));

        let migratedCount = 0;
        let skippedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Only migrate users who have coins
            if (userData.coins && userData.coins > 0) {
                const docId = `${userId}_${weekId}`;
                const leaderboardDocRef = doc(db, 'weeklyLeaderboard', docId);

                await setDoc(leaderboardDocRef, {
                    userId: userId,
                    username: userData.username || userData.email?.split('@')[0] || 'Player',
                    coins: userData.coins,
                    photoURL: userData.photoURL || null,
                    weekId: weekId,
                    lastUpdated: Timestamp.now()
                });

                console.log(`✅ Migrated ${userData.username || userId} with ${userData.coins.toLocaleString()} coins`);
                migratedCount++;
            } else {
                console.log(`⏭️  Skipped ${userData.username || userId} (no coins)`);
                skippedCount++;
            }
        }

        console.log('-----------------------------------');
        console.log(`🎉 Migration complete!`);
        console.log(`✅ Migrated: ${migratedCount} users`);
        console.log(`⏭️  Skipped: ${skippedCount} users (no coins)`);
        console.log('');
        console.log('📊 Check your leaderboard at http://localhost:3000');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error migrating users:', error);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('1. Make sure Firebase security rules allow read access to users collection');
        console.error('2. Check if Firestore index is built');
        console.error('3. Verify your internet connection');
        process.exit(1);
    }
};

migrateExistingUsers();
