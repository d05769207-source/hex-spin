Bot UID & Leaderboard Name Fix - Updated Plan
User Feedback Summary
UID Generation
✅ Bot 0, Bot 1: Latest UID check karke sahi generate ho raha hai (1025, 1026)
❌ Bot 2, Bot 3: Latest UID ignore karke 9-series UID le rahe hain (900002, 900003)
Name Display
✅ Admin Panel: Naya bot dikhta hai
❌ Leaderboard: Bot 3 ka purana naam dikhta hai
✅ Profile: Bot 3 ka naya naam dikhta hai
Root Cause Analysis
Issue 1: Bot 2, 3 ko 9-Series UIDs Kyun Mil Rahe Hain?
Problem: 
getMaxDisplayId()
 function poore DB se highest displayId dhundta hai. Agar kisi purane bot ka UID 900002 hai, toh wo return kar deta hai.

Current Logic:

// Step 1: getMaxDisplayId() query karta hai
query(usersRef, orderBy('displayId', 'desc'), limit(1))
// Step 2: Agar koi user mila
return data.displayId  // Ye 900002 ho sakta hai!
Why Bot 0,1 Safe Hain: Wo existing bots hain → Re-initialization mein unki old displayId preserve ho jaati hai (jo pehle se sahi thi)

Why Bot 2,3 Fail: Wo naye bots hain ya existing nahi milte → Fallback logic use karte hain → currentMaxDisplayId (900002) + increment → 900003, 900004

Issue 2: Leaderboard Mein Purana Naam Kyun?
Possible Causes:

Leaderboard document update nahi ho raha
Wrong document ID target ho raha hai
Caching ya stale data
Solution Plan
Fix 1: 
getMaxDisplayId()
 - 9-Series IDs Ko Filter Out Karo
Logic: Database query mein condition add karo: sirf wo IDs consider karo jo 900000 se NEECHE hain.

Updated Code:

const getMaxDisplayId = async (): Promise<number> => {
    try {
        const usersRef = collection(db, USER_COLLECTION);
        
        // CRITICAL: Ignore 9-series fallback IDs
        const q = query(
            usersRef, 
            where('displayId', '<', 900000),  // Filter: Only real IDs
            orderBy('displayId', 'desc'), 
            limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const maxId = snapshot.docs[0].data().displayId;
            console.log(`📊 Max Real UID found: ${maxId}`);
            return maxId;
        }
        
        console.log('📊 No users found, starting from 1000');
        return 1000; // Safe baseline
        
    } catch (error) {
        console.warn('Error fetching max displayId:', error);
        return 1000;
    }
};
Impact:

Agar DB mein highest real user ka UID 1026 hai → return 1026
Agar koi 900002 bhi hai → ignore ho jayega
Bot 2, 3 ko 1027, 1028 milega ✅
Fix 2: Leaderboard Name Sync - Debugging & Fix
Step 1: Verify Current Logic Check karo 
generateSmartBots
 mein leaderboard update code:

const leaderboardRef = doc(db, 'weeklyLeaderboard', `${botUid}_${weekId}`);
batch.set(leaderboardRef, {
    username: name,  // Naya naam
    // ...
});
Step 2: Check Document ID Format Leaderboard document ID: bot_2026-W01_3_2026-W01? Confirm karo sahi format use ho raha hai.

Step 3: Force Leaderboard Refresh Agar update ho raha hai par UI mein nahi dikh raha, toh:

Leaderboard component ko force refresh karo
Cache clear karo
Potential Fix Options:

Option A: Leaderboard ko bhi re-sync karo after generation

// After batch.commit() in generateSmartBots
const bots = await getSmartBots();
for (const bot of bots) {
    await syncUserToLeaderboard(bot, weekId);
}
Option B: Check if separate leaderboard update needed Verify if 
simulateSmartBotActivity
 ya koi aur service leaderboard update kar rahi hai jo override kar rahi ho.

Implementation Order
First: 
getMaxDisplayId()
 fix (High Priority) ← 9-series UID issue solve
Second: Leaderboard investigation (Debug first, then fix)
Third: Complete testing
Testing Plan
Test 1: UID Generation
Scenario: Reserved IDs = 0, Existing Max UID = 1026
Expected: New bots → 1027, 1028, 1029, 1030
Test 2: Re-initialization
Scenario: Same week dobara generate
Expected: UIDs preserve, names change
Test 3: Leaderboard Sync
Scenario: Generate bots → Check leaderboard
Expected: Naye names dikhne chahiye sabhi bots ke
