/**
 * ONE-TIME MIGRATION SCRIPT
 * Initialize Reserved IDs Level-Based Config System
 * 
 * Run this script ONCE to:
 * 1. Create config document with 5 levels
 * 2. Migrate existing Reserved IDs to new structure
 * 3. Set initial level based on current pool size
 * 
 * Usage: ts-node scripts/initReservedIdsConfig.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Firebase config - Hardcoded from firebase.ts (Guaranteed to work)
const firebaseConfig = {
    apiKey: "AIzaSyCqk2HKkodUeTtEh_xRxrcHljrpfxWcIt4",
    authDomain: "lucky-chakra.firebaseapp.com",
    projectId: "lucky-chakra",
    storageBucket: "lucky-chakra.firebasestorage.app",
    messagingSenderId: "168560073638",
    appId: "1:168560073638:web:c06fcf6a418de96b570d67",
};

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase config missing!');
    process.exit(1);
}

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase config missing! Check your .env.local file.');
    console.error('Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface LevelConfig {
    maxIds: number;
    gapSize: number;
    filled: number;
}

interface ReservedIdsConfig {
    currentLevel: number;
    levels: {
        [key: number]: LevelConfig;
    };
    lastUpdated: Date;
}

async function initializeConfig() {
    console.log('🚀 Starting Reserved IDs Config Migration...\n');

    try {
        // Step 1: Create Config Document
        console.log('📝 Step 1: Creating config document...');
        const configRef = doc(db, 'system', 'reserved_ids_config');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            console.log('⚠️  Config already exists! Skipping creation.\n');
        } else {
            const initialConfig: ReservedIdsConfig = {
                currentLevel: 1,
                levels: {
                    1: { maxIds: 6, gapSize: 2, filled: 0 },
                    2: { maxIds: 10, gapSize: 5, filled: 0 },
                    3: { maxIds: 20, gapSize: 10, filled: 0 },
                    4: { maxIds: 50, gapSize: 20, filled: 0 },
                    5: { maxIds: 100, gapSize: 50, filled: 0 }
                },
                lastUpdated: new Date()
            };

            await setDoc(configRef, initialConfig);
            console.log('✅ Config document created successfully!\n');
        }

        // Step 2: Migrate Existing Reserved IDs
        console.log('📝 Step 2: Migrating existing Reserved IDs...');
        const reservedRef = doc(db, 'system', 'reserved_bot_ids');
        const reservedSnap = await getDoc(reservedRef);

        if (!reservedSnap.exists()) {
            console.log('⚠️  No existing Reserved IDs found. Creating empty structure...');
            await setDoc(reservedRef, {
                ids: [],
                currentLevel: 1,
                levelPools: {
                    1: [],
                    2: [],
                    3: [],
                    4: [],
                    5: []
                },
                lastUpdated: new Date()
            });
            console.log('✅ Empty Reserved IDs structure created!\n');
        } else {
            const existingData = reservedSnap.data();
            const existingIds = existingData.ids || [];

            console.log(`   Found ${existingIds.length} existing Reserved IDs`);

            // Determine current level based on pool size
            let currentLevel = 1;
            if (existingIds.length >= 6) currentLevel = 2;
            if (existingIds.length >= 16) currentLevel = 3; // 6 + 10
            if (existingIds.length >= 36) currentLevel = 4; // 6 + 10 + 20
            if (existingIds.length >= 86) currentLevel = 5; // 6 + 10 + 20 + 50

            // Distribute IDs into level pools
            const levelPools: { [key: number]: number[] } = {
                1: existingIds.slice(0, 6),
                2: existingIds.slice(6, 16),
                3: existingIds.slice(16, 36),
                4: existingIds.slice(36, 86),
                5: existingIds.slice(86)
            };

            // Update Reserved IDs document
            await updateDoc(reservedRef, {
                ids: existingIds,
                currentLevel: currentLevel,
                levelPools: levelPools,
                lastUpdated: new Date()
            });

            console.log(`   Distributed IDs across levels:`);
            console.log(`   - Level 1: ${levelPools[1].length} IDs`);
            console.log(`   - Level 2: ${levelPools[2].length} IDs`);
            console.log(`   - Level 3: ${levelPools[3].length} IDs`);
            console.log(`   - Level 4: ${levelPools[4].length} IDs`);
            console.log(`   - Level 5: ${levelPools[5].length} IDs`);
            console.log(`   Current Level: ${currentLevel}\n`);

            // Update config with current fill status
            const configData = (await getDoc(configRef)).data() as ReservedIdsConfig;
            configData.levels[1].filled = levelPools[1].length;
            configData.levels[2].filled = levelPools[2].length;
            configData.levels[3].filled = levelPools[3].length;
            configData.levels[4].filled = levelPools[4].length;
            configData.levels[5].filled = levelPools[5].length;
            configData.currentLevel = currentLevel;

            // Update as plain object to avoid type issues
            await updateDoc(configRef, {
                currentLevel: configData.currentLevel,
                levels: configData.levels,
                lastUpdated: new Date()
            });

            console.log('✅ Existing IDs migrated successfully!\n');
        }

        // Step 3: Verification
        console.log('📝 Step 3: Verifying migration...');
        const finalConfig = await getDoc(configRef);
        const finalReserved = await getDoc(reservedRef);

        console.log('\n✅ MIGRATION COMPLETE!\n');
        console.log('📊 Final State:');
        console.log('   Config:', JSON.stringify(finalConfig.data(), null, 2));
        console.log('\n   Reserved IDs Summary:');
        const reservedData = finalReserved.data();
        console.log(`   - Total IDs: ${reservedData?.ids?.length || 0}`);
        console.log(`   - Current Level: ${reservedData?.currentLevel || 1}`);
        console.log('\n🎉 System ready for level-based Reserved IDs!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
initializeConfig()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
