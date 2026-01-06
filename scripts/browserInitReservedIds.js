/**
 * BROWSER CONSOLE INITIALIZATION
 * Copy-paste this entire code in your browser console (F12) when logged into your app
 * This will initialize the Reserved IDs Level System
 */

async function initializeReservedIdsSystem() {
    console.log('🚀 Starting Reserved IDs Config Migration...\n');

    try {
        // Import from your existing firebase instance
        const { db } = window; // Assuming db is available globally
        const { doc, getDoc, setDoc, updateDoc, Timestamp } = await import('firebase/firestore');

        // Step 1: Create Config Document
        console.log('📝 Step 1: Creating config document...');
        const configRef = doc(db, 'system', 'reserved_ids_config');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            console.log('⚠️  Config already exists! Skipping creation.\n');
        } else {
            const initialConfig = {
                currentLevel: 1,
                levels: {
                    1: { maxIds: 6, gapSize: 2, filled: 0 },
                    2: { maxIds: 10, gapSize: 5, filled: 0 },
                    3: { maxIds: 20, gapSize: 10, filled: 0 },
                    4: { maxIds: 50, gapSize: 20, filled: 0 },
                    5: { maxIds: 100, gapSize: 50, filled: 0 }
                },
                lastUpdated: Timestamp.now()
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
                lastUpdated: Timestamp.now()
            });
            console.log('✅ Empty Reserved IDs structure created!\n');
        } else {
            const existingData = reservedSnap.data();
            const existingIds = existingData.ids || [];

            console.log(`   Found ${existingIds.length} existing Reserved IDs`);

            // Determine current level based on pool size
            let currentLevel = 1;
            if (existingIds.length >= 6) currentLevel = 2;
            if (existingIds.length >= 16) currentLevel = 3;
            if (existingIds.length >= 36) currentLevel = 4;
            if (existingIds.length >= 86) currentLevel = 5;

            // Distribute IDs into level pools
            const levelPools = {
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
                lastUpdated: Timestamp.now()
            });

            console.log(`   Distributed IDs across levels:`);
            console.log(`   - Level 1: ${levelPools[1].length} IDs`);
            console.log(`   - Level 2: ${levelPools[2].length} IDs`);
            console.log(`   - Level 3: ${levelPools[3].length} IDs`);
            console.log(`   - Level 4: ${levelPools[4].length} IDs`);
            console.log(`   - Level 5: ${levelPools[5].length} IDs`);
            console.log(`   Current Level: ${currentLevel}\n`);

            // Update config with current fill status
            const finalConfig = await getDoc(configRef);
            const configData = finalConfig.data();
            configData.levels[1].filled = levelPools[1].length;
            configData.levels[2].filled = levelPools[2].length;
            configData.levels[3].filled = levelPools[3].length;
            configData.levels[4].filled = levelPools[4].length;
            configData.levels[5].filled = levelPools[5].length;
            configData.currentLevel = currentLevel;

            await updateDoc(configRef, configData);

            console.log('✅ Existing IDs migrated successfully!\n');
        }

        // Step 3: Verification
        console.log('📝 Step 3: Verifying migration...');
        const finalConfig = await getDoc(configRef);
        const finalReserved = await getDoc(reservedRef);

        console.log('\n✅ MIGRATION COMPLETE!\n');
        console.log('📊 Final State:');
        console.log('   Config:', finalConfig.data());
        console.log('\n   Reserved IDs Summary:');
        const reservedData = finalReserved.data();
        console.log(`   - Total IDs: ${reservedData?.ids?.length || 0}`);
        console.log(`   - Current Level: ${reservedData?.currentLevel || 1}`);
        console.log('\n🎉 System ready for level-based Reserved IDs!\n');

        return { success: true, message: 'Migration completed successfully!' };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
}

// Auto-run
initializeReservedIdsSystem();
