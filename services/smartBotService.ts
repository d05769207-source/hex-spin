import { supabase, rpc } from '../supabaseClient';
import { BotUser, User, BotTier } from '../types';
import { getCurrentWeekId, getTimeRemaining, getCurrentTime, getServerWeekId } from '../utils/weekUtils';

// CONSTANTS
const TOTAL_BOTS = 4;
const BOT_COLLECTION = 'bot_users';
const USER_COLLECTION = 'users';
const LOCK_COLLECTION = 'system';
const LOCK_DOC_ID = 'botLock';

// CONFIG - Realistic Indian Names
const MALE_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharv', 'Rohan', 'Dhruv', 'Kabir', 'Rahul', 'Amit', 'Ravi', 'Karan', 'Yash',
    'Dev', 'Om', 'Arnav', 'Harsh', 'Ved', 'Tej', 'Rudra', 'Advait', 'Aryan', 'Laksh',
    'Veer', 'Shiv', 'Aakash', 'Ansh', 'Pranav', 'Ritesh', 'Sagar', 'Tushar', 'Varun', 'Akshay',
    'Nikhil', 'Rajat', 'Sahil', 'Vishal', 'Ankur', 'Deepak', 'Gaurav', 'Mohit', 'Pankaj', 'Sumit',
    // Bihar & Jharkhand specific names
    'Manish', 'Santosh', 'Ajay', 'Manoj', 'Sunil', 'Ashok', 'Vinod', 'Dilip', 'Prakash', 'Shyam',
    'Mukesh', 'Ramesh', 'Suresh', 'Rajesh', 'Dinesh', 'Chandan', 'Ranjan', 'Birendra', 'Nagendra', 'Awadhesh',
    'Upendra', 'Jitendra', 'Surendra', 'Rupesh', 'Nitish', 'Lalu', 'Kundan', 'Raushan', 'Sudhir', 'Anil',
    // West Bengal specific names
    'Soumya', 'Sourav', 'Sanjay', 'Debashis', 'Abhijit', 'Debanjan', 'Subham', 'Ayan', 'Aritra', 'Soham',
    'Prosenjit', 'Partha', 'Ratul', 'Supratim', 'Biswajit', 'Koushik', 'Tapas', 'Amitabha', 'Aniruddha', 'Kaushik',
    'Samir', 'Sayan', 'Tarun', 'Tanmoy', 'Indranil', 'Dipankar', 'Siddhartha', 'Joydeep', 'Sujit', 'Somnath'
];

const FEMALE_NAMES = [
    'Sneha', 'Priya', 'Anjali', 'Riya', 'Kavya', 'Sita', 'Gita', 'Pooja', 'Ananya', 'Diya',
    'Ishita', 'Khushi', 'Navya', 'Tanvi', 'Anika', 'Kiara', 'Myra', 'Sara', 'Zara',
    'Aditi', 'Divya', 'Isha', 'Kriti', 'Nisha', 'Radhika', 'Shreya', 'Tanya', 'Vidya', 'Meera',
    'Simran', 'Neha', 'Swati', 'Jyoti', 'Sapna', 'Megha', 'Preeti', 'Ritu', 'Sonal', 'Komal',
    // Bihar & Jharkhand specific names
    'Rani', 'Rekha', 'Sunita', 'Anita', 'Sangeeta', 'Rita', 'Savita', 'Manju', 'Asha', 'Usha',
    'Pushpa', 'Mamta', 'Kiran', 'Suman', 'Geeta', 'Poonam', 'Renu', 'Babita', 'Sushma', 'Vandana',
    // West Bengal specific names
    'Sohini', 'Shreya', 'Anuradha', 'Moumita', 'Payel', 'Rima', 'Soma', 'Debjani', 'Ankita', 'Ananya',
    'Madhurima', 'Tithi', 'Ritika', 'Susmita', 'Payal', 'Tumpa', 'Dipti', 'Chandana', 'Sreya', 'Soumita',
    'Barnali', 'Tanusree', 'Rupali', 'Shampa', 'Sutapa', 'Arpita', 'Sumana', 'Poulomi', 'Rina', 'Srabani'
];

const LAST_NAMES = [
    'Sharma', 'Verma', 'Singh', 'Kumar', 'Patel', 'Gupta', 'Reddy', 'Rao', 'Iyer', 'Nair',
    'Chopra', 'Kapoor', 'Malhotra', 'Khanna', 'Bhatia', 'Sethi', 'Arora', 'Mehta', 'Shah', 'Desai',
    'Joshi', 'Kulkarni', 'Patil', 'Jain', 'Agarwal', 'Bansal', 'Goel', 'Mittal', 'Singhal', 'Goyal',
    'Srivastava', 'Dubey', 'Pandey', 'Mishra', 'Tiwari', 'Chaturvedi', 'Saxena', 'Shukla', 'Yadav', 'Chauhan',
    'Rajput', 'Thakur', 'Rathore', 'Bisht', 'Rawat', 'Bhatt', 'Negi', 'Garg', 'Aggarwal', 'Wadhwa',
    'Kohli', 'Suri', 'Anand', 'Bajaj', 'Bose', 'Das', 'Dutta', 'Ghosh', 'Mukherjee', 'Sen',
    'Pillai', 'Menon', 'Krishnan', 'Naidu', 'Raju', 'Varma', 'Murthy', 'Rao', 'Reddy', 'Gowda',
    // Bihar & Jharkhand specific surnames
    'Prasad', 'Rai', 'Singh', 'Mahto', 'Sahu', 'Mandal', 'Sinha', 'Jha', 'Thakur', 'Mukhiya',
    'Paswan', 'Ram', 'Chaudhary', 'Sahani', 'Kisku', 'Murmu', 'Soren', 'Hembrom', 'Hansda', 'Marandi',
    'Tudu', 'Besra', 'Munda', 'Oraon', 'Kerketta', 'Tirkey', 'Topno', 'Lakra', 'Kujur', 'Minz',
    // West Bengal specific surnames
    'Banerjee', 'Chatterjee', 'Mukherjee', 'Ganguly', 'Chakraborty', 'Bhattacharya', 'Roy', 'Sengupta', 'Biswas', 'Sarkar',
    'Basu', 'Dey', 'Paul', 'Chowdhury', 'Majumdar', 'Dasgupta', 'Mitra', 'Saha', 'Kundu', 'Mondal',
    'Pal', 'Halder', 'Nandi', 'Bhowmik', 'Sanyal', 'Dutta', 'Guha', 'Nath', 'Khan', 'Ahmed'
];

const AVATAR_SEEDS = [
    'Felix', 'Aneka', 'Zack', 'Ryker', 'Jude', 'Brooklynn', 'Cream', 'Snowball', 'Trouble', 'Mistypoo',
    'Milo', 'Luna', 'Oliver', 'Bella', 'Leo', 'Lucy', 'Max', 'Daisy', 'Charlie', 'Zoe',
    'Jack', 'Sophie', 'Oscar', 'Lily', 'Toby', 'Chloe', 'Rocky', 'Ruby', 'Bailey', 'Molly'
];

// Gaming Usernames (Free Fire, PUBG, Online Games Style)
const GAMING_USERNAMES = [
    // Classic gaming names
    'Assassin', 'Phantom', 'Shadow', 'Ghost', 'Reaper', 'Ninja', 'Sniper', 'Hunter', 'Warrior', 'Legend',
    'Destroyer', 'Killer', 'Slayer', 'Beast', 'Monster', 'Demon', 'Viper', 'Dragon', 'Tiger', 'Wolf',
    'Predator', 'Savage', 'Immortal', 'Invincible', 'Unstoppable', 'Thunder', 'Lightning', 'Storm', 'Blaze', 'Inferno',
    // Indian gaming culture names
    'BadMash', 'Daku', 'Raja', 'Baadshah', 'Sultan', 'Champion', 'Hero', 'Sher', 'Gabbar', 'Thakur',
    'Nawab', 'Sarkar', 'Boss', 'King', 'Emperor', 'Master', 'Guru', 'Maestro', 'Ace', 'Pro',
    // Stylish with X prefix/suffix
    'xXSniperXx', 'xXKillerXx', 'xXPhantomXx', 'xXGhostXx', 'xXLegendXx', 'xXBeastXx', 'xXDemonXx', 'xXDragonXx',
    // With Pro/Noob suffix
    'ProGamer', 'ProPlayer', 'ProKiller', 'ProSniper', 'NoobMaster', 'EliteGamer', 'MasterChief', 'CaptainCool',
    // Numbers style (will be combined with names)
    'Legend47', 'Killer69', 'Sniper007', 'Ghost420', 'Beast99', 'King786', 'Ace143', 'Pro101',
    // Underscored style
    'Pro_Gamer', 'Beast_Mode', 'God_Mode', 'Kill_Shot', 'Head_Hunter', 'Silent_Killer', 'Death_Angel', 'Dark_Lord',
    // Cool single words
    'Venom', 'Joker', 'Psycho', 'Mad', 'Evil', 'Death', 'Skull', 'Blood', 'Fire', 'Ice',
    'Titan', 'Zeus', 'Thor', 'Loki', 'Hulk', 'Stark', 'Fury', 'Viper', 'Cobra', 'Falcon',
    // Indian slang gaming names
    'GundaGiri', 'Tapori', 'Desi_Gamer', 'Hindustani', 'Jawan', 'Fauji', 'Commando', 'Soldier', 'Sipahi', 'Yodha',
    // Chhapri Style Names (Attitude + Royal + Broken Heart)
    'Attitude_Boy', 'Attitude_King', 'Royal_King', 'Single_Boy', 'Broken_Heart', 'Lonely_Boy', 'Sad_Boy', 'Alone_Boy',
    'Desi_Boy', 'Desi_King', 'Indian_Boy', 'Hindustani_Boy', 'Bindaas_Boy', 'Mast_Boy', 'Pagal_Boy', 'Deewana',
    'Royal_Entry', 'Royal_Boy', 'Royal_Rider', 'Royal_Nawab', 'Royal_Sarkar', 'Prince_Boy', 'Royal_Prince', 'Shehzada',
    'Heart_Breaker', 'Heart_Hacker', 'Love_Killer', 'Love_Guru', 'King_Of_Hearts', 'Pyaar_Ka_Pujari', 'Ishq_Wala',
    'Badtameez', 'Badmash_Boy', 'Shaitan', 'Lafanga', 'Kamina', 'Harami', 'Gunda_Raj', 'Rowdy_Boy', 'Roadside_Romeo',
    'Stylish_Boy', 'Stylish_Star', 'Attitude_Star', 'Swag_Boy', 'Swag_King', 'Chill_Boy', 'Cool_Dude', 'Smart_Boy',
    'Mr_Perfect', 'Mr_Handsome', 'Mr_Cool', 'Mr_Attitude', 'Mr_Bindaas', 'Mr_Dangerous', 'Mr_Devil', 'Mr_Killer',
    'Born_To_Win', 'Born_To_Rule', 'Killer_Smile', 'Devil_Eyes', 'Innocent_Face', 'Cute_Boy', 'Handsome_Hunk',
    'Emotional_Boy', 'Silent_Lover', 'True_Lover', 'One_Side_Lover', 'Bewafa', 'Dhoka_Diya', 'Dard_Bhari', 'Judaai',
    'Mastikhor', 'Haryanvi_Jaat', 'UP_Wala', 'Bihar_Ka_Launda', 'Dehati_Boy', 'Gaon_Ka_Chhora', 'Desi_Gabru'
];

// --- PERSISTENT SIMULATION STATE ---
const SIM_DAY_KEY = 'BOT_SIM_DAY';
const SIM_RUSH_KEY = 'BOT_SIM_RUSH';

export const getSimulationState = () => {
    const day = localStorage.getItem(SIM_DAY_KEY);
    const rush = localStorage.getItem(SIM_RUSH_KEY);
    return {
        forceDay: day ? parseInt(day) : undefined,
        forceRushHour: rush === 'true'
    };
};

export const setSimulationState = (day?: number, rush?: boolean) => {
    if (day !== undefined) {
        localStorage.setItem(SIM_DAY_KEY, day.toString());
    } else {
        localStorage.removeItem(SIM_DAY_KEY);
    }

    if (rush !== undefined) {
        localStorage.setItem(SIM_RUSH_KEY, rush.toString());
    } else {
        localStorage.removeItem(SIM_RUSH_KEY);
    }
    console.log(`🕹️ Simulation State Updated: Day=${day}, Rush=${rush}`);
};

// --- HELPER: GENERATE REALISTIC BOT NAME ---
/**
 * Generates a realistic Indian username with variations
 * Formats: "FirstLast", "First.Last", "first_last99", "LastFirst47", or Gaming usernames
 * @param preferredFormat - Preferred format style (0-6), or undefined for random
 * @param gender - 'male' or 'female', determines which name pool to use
 */
const generateRealisticBotName = async (preferredFormat?: number, gender: 'male' | 'female' = 'male'): Promise<string> => {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let username = '';

        // 25% chance to generate a gaming username (Free Fire/PUBG style)
        const useGamingName = Math.random() < 0.25;

        if (useGamingName) {
            // Pick a random gaming username
            const gamingName = GAMING_USERNAMES[Math.floor(Math.random() * GAMING_USERNAMES.length)];

            // 40% chance to add numbers/modifiers to gaming name
            if (Math.random() < 0.4) {
                const modifier = Math.floor(Math.random() * 100);
                username = `${gamingName}${modifier}`;
            } else {
                username = gamingName;
            }
        } else {
            // Pick random name from gender-specific array
            const nameArray = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
            const firstName = nameArray[Math.floor(Math.random() * nameArray.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

            // Use preferred format if provided, otherwise random (0-6)
            const formatStyle = preferredFormat !== undefined ? preferredFormat : Math.floor(Math.random() * 7);

            switch (formatStyle) {
                case 0:
                    // "RohanSharma"
                    username = `${firstName}${lastName}`;
                    break;
                case 1:
                    // "Rohan.Sharma"
                    username = `${firstName}.${lastName}`;
                    break;
                case 2:
                    // "rohan_sharma"
                    username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
                    break;
                case 3:
                    // "rohan.sharma23"
                    const num1 = Math.floor(Math.random() * 100);
                    username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num1}`;
                    break;
                case 4:
                    // "RohanS47"
                    const num2 = Math.floor(Math.random() * 100);
                    username = `${firstName}${lastName.charAt(0)}${num2}`;
                    break;
                case 5:
                    // "sharma.rohan"
                    username = `${lastName.toLowerCase()}.${firstName.toLowerCase()}`;
                    break;
                case 6:
                    // "SharmaRohan99"
                    const num3 = Math.floor(Math.random() * 100);
                    username = `${lastName}${firstName}${num3}`;
                    break;
            }
        }

        // Check if username already exists in users collection
        try {
            const { data, error } = await supabase
                .from('users')
                .select('uid')
                .eq('username', username)
                .limit(1);

            if (error) {
                console.warn('Error checking username uniqueness:', error);
                // On error, just return it (unlikely collision)
                return username;
            }

            if (!data || data.length === 0) {
                // Username is unique!
                return username;
            }
            // If exists, loop will try again with different name
        } catch (error) {
            console.warn('Error checking username uniqueness:', error);
            // On error, just return it (unlikely collision)
            return username;
        }
    }

    // Fallback: If all attempts fail, add timestamp
    const fallback = `User${Date.now().toString().slice(-6)}`;
    return fallback;
};

// --- HELPER: GET SCORE FOR TARGET RANK ---
// Returns the coins needed to beat the user at 'rank'
const getScoreForRank = async (targetRank: number): Promise<number> => {
    try {
        const weekId = await getServerWeekId();

        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('coins')
            .eq('week_id', weekId)
            .order('coins', { ascending: false })
            .limit(targetRank + 5); // Fetch a bit more to be safe

        if (error) {
            console.warn('Error fetching score for rank, using fallback.', error);
            return 0;
        }

        // If leaderboard is empty or small, return a base target based on day
        if (!data || data.length < targetRank) {
            // Monday: 50, Sunday: 5000 (Simulated Base)
            const day = getCurrentTime().getDay();
            const baseMap: { [key: number]: number } = { 1: 50, 2: 100, 3: 500, 4: 1000, 5: 2500, 6: 4000, 0: 6000 };
            return baseMap[day] || 100;
        }

        // Get the user at the specific rank (0-indexed)
        const targetEntry = data[targetRank - 1];
        if (targetEntry) {
            // console.log(`🎯 Target Rank #${targetRank} Holder: ${targetEntry.username} (${targetEntry.coins} coins)`);
            return targetEntry.coins || 0;
        }
        return 0;
    } catch (error) {
        console.warn('Error fetching score for rank, using fallback.', error);
        return 0;
    }
};

/**
 * PERMANENT DELETE (Hard Reset)
 * Deletes bots from botUsers, users, and leaderboard.
 * Use this only for debugging or full reset.
 */
export const hardDeleteAllBots = async () => {
    try {
        console.log('🔥 Starting Hard Delete (Full Reset) via RPC...');

        const { data, error } = await rpc.hardDeleteAllBots();

        if (error) throw error;

        console.log(`✅ Hard Deleted ${data} bots. System reset to Level 1.`);
        return data;
    } catch (error) {
        console.error('❌ Error in hard delete:', error);
        throw error;
    }
};

/**
 * RETIRE OLD BOTS (Persistent Mode)
 * Moves existing bots to 'RETIRED' state.
 * Removes them from Leaderboard but KEEPS them in 'users' (Hall of Fame).
 */
export const retireOldBots = async () => {
    try {
        console.log('👴 Retiring Old Bots via RPC...');

        const { data, error } = await rpc.retireOldBots();

        if (error) throw error;

        console.log(`✅ Retired ${data} bots. They are now in Hall of Fame.`);
        return data;
    } catch (error) {
        console.error('❌ Error retiring bots:', error);
        throw error;
    }
};

// Helper: Get the highest displayId currently in use
const getMaxDisplayId = async (): Promise<number> => {
    try {
        // CRITICAL FIX: Ignore 9-series fallback IDs (900000+) so we find the REAL max ID
        const { data, error } = await supabase
            .from('users')
            .select('display_id')
            .lt('display_id', 900000)
            .order('display_id', { ascending: false })
            .limit(1);

        if (error) {
            console.warn('Error fetching max displayId:', error);
            return 1000;
        }

        if (data && data.length > 0) {
            return data[0].display_id || 1000;
        }
        return 1000;
    } catch (error) {
        console.warn('Error fetching max displayId:', error);
        return 1000;
    }
};

/**
 * Select an unused real profile photo from Supabase Storage
 * Checks if bot's display_id already has a photo assigned (re-init case)
 * @param displayId - Bot's display_id (persists across weeks)
 * @param botUid - Current bot UID (changes weekly)
 * @returns Supabase Storage URL for the photo
 */
const selectBotPhoto = async (displayId: number, botUid: string): Promise<string> => {
    // LOGIC UPDATE: Always assign a FRESH photo for new UIDs (New Week = New Face)
    // We do NOT check existing displayId, so even if displayId is reused, the photo changes.

    // Get first unused photo
    const { data: availablePhoto, error } = await supabase
        .from('bot_profile_photos')
        .select('*')
        .eq('is_used', false)
        .order('created_at', { ascending: true }) // FIFO order
        .limit(1)
        .maybeSingle(); // Use maybeSingle() if no photos left

    if (error || !availablePhoto) {
        console.error('❌ No unused photos available! Falling back to Dicebear.');
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
    }

    // Use RPC to mark photo as used (Bypasses Client-Side RLS restriction)
    const { error: updateError } = await rpc.markBotPhotoUsed(availablePhoto.id, botUid, displayId);

    if (updateError) {
        console.error('❌ Error marking photo used via RPC:', updateError);
        // Continue anyway, as the photo is returned effectively
    }

    console.log(`📸 Assigned photo ${availablePhoto.filename} to display_id ${displayId}`);
    return availablePhoto.storage_url;
};

export const generateSmartBots = async () => {
    try {
        const weekId = await getServerWeekId();

        // Check if bots already exist for this week
        const { data: existingBots, error: existingError } = await supabase
            .from(BOT_COLLECTION)
            .select('*')
            .eq('week_id', weekId);

        if (existingError) throw existingError;

        const isReinitializing = existingBots && existingBots.length > 0;

        if (isReinitializing) {
            console.log('🔄 Bots already exist for this week. RE-INITIALIZING with same UIDs...');
        } else {
            console.log('🤖 Generating 3 New Smart Bots...');
        }

        // 1. Get Reserved IDs with level awareness
        const { data: reservedData } = await supabase
            .from('system')
            .select('data')
            .eq('id', 'reserved_bot_ids')
            .single();

        let reservedIds: number[] = [];
        let currentLevel = 1;
        let levelPools: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [], 5: [] };

        if (reservedData && reservedData.data) {
            reservedIds = reservedData.data.ids || [];
            currentLevel = reservedData.data.currentLevel || 1;
            levelPools = reservedData.data.levelPools || { 1: [], 2: [], 3: [], 4: [], 5: [] };
        }

        const shuffledAvatars = [...AVATAR_SEEDS].sort(() => 0.5 - Math.random());
        let usedReservedCount = 0;

        // Formats
        const formatRanges = [
            [0, 1],     // Bot 0
            [2, 3],     // Bot 1
            [4, 5],     // Bot 2
            [6, 3, 0]   // Bot 3
        ];

        // Pre-fetch Highest Display ID for fallback
        let currentMaxDisplayId = await getMaxDisplayId();
        let fallbackIncrement = 1;

        for (let i = 0; i < TOTAL_BOTS; i++) {
            const availableFormats = formatRanges[i];
            const formatIndex = availableFormats[Math.floor(Math.random() * availableFormats.length)];

            let gender: 'male' | 'female' = 'male';
            if (i === 0 || i === 2) {
                gender = 'male';
            } else if (i === 1 || i === 3) {
                gender = Math.random() > 0.8 ? 'female' : 'male';
            }

            const name = await generateRealisticBotName(formatIndex, gender);
            // const avatarSeed = shuffledAvatars[i] || 'default';
            // Photo URL will be generated AFTER displayId is resolved using selectBotPhoto

            let level;
            if (i === 0) level = Math.floor(34 + Math.random() * 12);
            else if (i === 1) level = Math.floor(20 + Math.random() * 13);
            else if (i === 2) level = Math.floor(15 + Math.random() * 11);
            else level = Math.floor(10 + Math.random() * 71);

            const totalSpins = (10 * (level * level)) + Math.floor(Math.random() * 50);
            const joinDate = new Date();
            joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 60));

            // Generate UID (Reuse existing if re-init, or create new)
            const botUid = `bot_${weekId}_${i}`;

            // LEVEL-AWARE SMART ID LOGIC
            let displayId: number = 0;

            // 1. Try to REUSE existing ID if Re-initializing
            if (isReinitializing) {
                try {
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('display_id')
                        .eq('uid', botUid)
                        .single();

                    if (existingUser && existingUser.display_id) {
                        const oldId = existingUser.display_id;
                        // DATE: 2024-01-05 - CRITICAL FIX
                        // Only preserve ID if it is VALID (Real ID < 900000)
                        // This prevents 9-series IDs from persisting during re-initialization
                        if (oldId && oldId < 900000) {
                            displayId = oldId;
                            console.log(`♻️ Preserving displayId ${displayId} for bot ${botUid}`);
                        } else {
                            console.warn(`⚠️ Discarding invalid/stale displayId ${oldId} for bot ${botUid}`);
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch existing displayId, using new one');
                }
            }

            // 2. If NO existing ID found (New Bot or First Run), use Level-Aware Logic
            if (!displayId) {
                // FIX: Check ALL levels (5 down to 1) for available IDs.
                // Priority: Consume Highest Level (Overflow) IDs first to preserve Level 1 base.
                for (let level = 5; level >= 1; level--) {
                    if (levelPools[level] && levelPools[level].length > 0) {
                        const realId = levelPools[level].shift();
                        if (realId) {
                            displayId = realId;
                            const globalIndex = reservedIds.indexOf(realId);
                            if (globalIndex > -1) reservedIds.splice(globalIndex, 1);
                            usedReservedCount++;
                            // console.log(`🔒 Consumed ID ${displayId} from Level ${level} pool`);
                            break; // Found one, stop searching
                        }
                    }
                }

                // 3. Final Fallback to MAX ID + Increment if all Reserved pools exhausted
                if (!displayId) {
                    displayId = currentMaxDisplayId + fallbackIncrement;
                    fallbackIncrement++;
                    // console.log(`⚠️ All Reserved pools empty, using fallback ID: ${displayId}`);
                }
            }

            // Rank Types
            let rankType = BotTier.SMART_LEADER;
            if (i === 2) rankType = BotTier.SMART_LOTTERY;
            if (i === 3) rankType = BotTier.SMART_LOTTERY_KTM;

            // NEW: Select real photo based on resolved displayId
            const photoURL = await selectBotPhoto(displayId, botUid);

            // Use RPC to generate bot (Bypasses Client-Side RLS)
            const { error: rpcError } = await rpc.generateBotUser(
                botUid,
                name,
                photoURL,
                level,
                totalSpins,
                0, // coins
                rankType,
                weekId,
                displayId,
                Math.floor(Math.random() * 500), // e_tokens
                100 // tokens
            );

            if (rpcError) {
                console.error(`❌ Error generating bot ${botUid}:`, rpcError);
            }
        }

        if (usedReservedCount > 0) {
            // FIX: Dynamic Level Regression
            // Recalculate level based on remaining IDs to allow downgrading (e.g. L2 -> L1)
            const totalRemaining = reservedIds.length;
            let newLevel = 1;
            if (totalRemaining >= 86) newLevel = 5;
            else if (totalRemaining >= 36) newLevel = 4;
            else if (totalRemaining >= 16) newLevel = 3;
            else if (totalRemaining >= 6) newLevel = 2;
            else newLevel = 1;

            if (newLevel !== currentLevel) {
                // console.log(`📉 Level Regression: Downgrading from Level ${currentLevel} to Level ${newLevel}`);
                currentLevel = newLevel;

                // FIX: Also update the CONFIG document so the Admin Panel reflects the change
                await rpc.updateReservedIdsConfig(newLevel);
            }

            await rpc.updateReservedIds(reservedIds, currentLevel, levelPools);
            // console.log(`🔒 Consumed ${usedReservedCount} IDs from Reserved pools.`);
        }

        if (isReinitializing) {
            console.log('✅ RE-INITIALIZED Bots!');
        } else {
            console.log('✅ Generated Bots successfully!');
        }

    } catch (error) {
        console.error('❌ Error generating smart bots:', error);
    }
};

const SPIN_REWARDS = [50, 100, 150, 200, 250, 300, 400, 500, 1000, 2000, 5000];
const REWARD_WEIGHTS = [0.3, 0.25, 0.15, 0.1, 0.05, 0.05, 0.03, 0.03, 0.02, 0.01, 0.01]; // Probabilities

const getRandomSpinReward = () => {
    let random = Math.random();
    for (let i = 0; i < REWARD_WEIGHTS.length; i++) {
        if (random < REWARD_WEIGHTS[i]) {
            return SPIN_REWARDS[i];
        }
        random -= REWARD_WEIGHTS[i];
    }
    return 50; // Default fallback
};

/**
 * Returns a random number between min and max (inclusive) in steps
 */
const getRandomBetween = (min: number, max: number, step: number = 50) => {
    const range = (max - min) / step;
    return min + Math.floor(Math.random() * (range + 1)) * step;
};

const getCatchUpReward = () => {
    // Return random BIG rewards between 1200 and 3500 to look natural
    // e.g. 1234, 1891, 2567, 3102 (koi bhi number!)
    return getRandomBetween(1200, 3500, 1);
};

/**
 * Get the highest score of a REAL (non-bot) user from the leaderboard
 */
const getTopRealUserScore = async (weekId: string): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('user_id, coins')
            .eq('week_id', weekId)
            .order('coins', { ascending: false })
            .limit(10); // Check top 10

        if (error) {
            return 0;
        }

        for (const entry of data || []) {
            // Check if this ID belongs to a bot (Bots have specific ID pattern or we check botUsers)
            // Fast check: startWith 'bot_' is our convention in generateSmartBots
            if (!entry.user_id.startsWith('bot_')) {
                // console.log(`👤 Top Real User Found: ${entry.username} (${entry.coins})`);
                return entry.coins;
            }
        }
        return 0; // No real users found or they have 0 coins
    } catch (error) {
        // console.error("Error finding top real user:", error);
        return 0;
    }
};

const getMediumReward = () => {
    // Return medium rewards to maintain pace (450 - 1100)
    // e.g. 487, 763, 1024 (koi bhi number!)
    return getRandomBetween(450, 1100, 1);
};

const getSmallRandomReward = () => {
    // Return small rewards for natural look (50 - 150)
    // e.g. 57, 89, 123, 142 (koi bhi number!)
    return getRandomBetween(50, 150, 1);
};

/**
 * 🔒 ATTEMPT TO ACQUIRE LOCK
 * Ensures only ONE client runs the bot simulation.
 * Lock duration: 60 seconds (Runs every ~60s)
 */
const acquireBotLock = async (): Promise<boolean> => {
    try {
        const clientId = 'client_' + Math.floor(Math.random() * 10000);
        const { data: isAcquired, error } = await rpc.acquireBotLock(LOCK_DOC_ID, clientId);

        if (error) {
            console.warn('⚠️ Error acquiring bot lock via RPC:', error);
            return false;
        }

        if (!isAcquired) {
            console.log(`🔒 Bot Simulation Locked. Skipping...`);
            return false;
        }

        return true;

    } catch (error) {
        console.warn('⚠️ Error acquiring bot lock:', error);
        return false; // Fail safe
    }
};

/**
 * Engine: Simulate Smart Activity based on Day of Week
 * Runs for approximately 55 seconds to cover the 1-minute interval
 */
export const simulateSmartBotActivity = async (forceDay?: number, forceRushHour?: boolean) => {
    // 1. Try to Acquire Lock FIRST
    // If we're forcing simulation (manual button), we override the lock check
    const isManualRun = forceDay !== undefined || forceRushHour === true;
    if (!isManualRun) {
        const hasLock = await acquireBotLock();
        if (!hasLock) return;
    }

    const startTime = Date.now();
    const DURATION = 55 * 1000; // Run for 55 seconds

    console.log('🤖 Starting Smart Bot Simulation Loop...');

    try {
        const initialBots = await getSmartBots();
        if (initialBots.length === 0) return;

        const weekId = await getServerWeekId();

        // --- PRE-LOOP SETUP ---
        const botLeads: Record<string, number> = {};

        // Initial setup for leads (randomized per session)
        const leaderBots = initialBots.filter((b: any) => b.bot_tier !== BotTier.SMART_LOTTERY && b.bot_tier !== BotTier.SMART_LOTTERY_KTM);
        const shuffledLeaders = [...leaderBots].sort(() => 0.5 - Math.random());
        if (shuffledLeaders[0]) botLeads[shuffledLeaders[0].uid] = 15000 + Math.floor(Math.random() * 5000);
        if (shuffledLeaders[1]) botLeads[shuffledLeaders[1].uid] = 10000 + Math.floor(Math.random() * 5000);

        // Mutable bots array to track local state during the loop
        let bots = [...initialBots];

        while (Date.now() - startTime < DURATION) {
            // 1. Wait 6 seconds (Spin Delay)
            await new Promise(r => setTimeout(r, 6000));

            // 2. CHECK SIMULATION STATE (POLL for Admin Changes) -- NEW
            const overrides = getSimulationState();
            const now = getCurrentTime();

            // Determine Effective Day
            const effectiveDay = forceDay !== undefined
                ? forceDay
                : (overrides.forceDay !== undefined ? overrides.forceDay : now.getDay());

            // Determine Rush Hour & Super Aggressive Mode
            const timeRemainingMs = getTimeRemaining();
            const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);
            const minutesRemaining = timeRemainingMs / (1000 * 60);

            const isRushHour = forceRushHour !== undefined
                ? forceRushHour
                : (overrides.forceRushHour || (effectiveDay === 0 && hoursRemaining <= 5));

            // SUPER AGGRESSIVE MODE: Last 15 minutes before reset
            const isSuperAggressive = effectiveDay === 0 && minutesRemaining <= 15;

            // console.log(`🕹️ Bot Loop Tick: Day=${effectiveDay}, Rush=${isRushHour}`);

            // 3. Refresh Targets (Every Spin based on NEW state)
            let currentBaseScore = 0;
            if (isRushHour) {
                currentBaseScore = await getTopRealUserScore(weekId);
            } else {
                let baseTargetRank = 50;
                if (effectiveDay === 1 || effectiveDay === 2) baseTargetRank = 45;
                else if (effectiveDay === 3) baseTargetRank = 30;
                else if (effectiveDay === 4) baseTargetRank = 20;
                else if (effectiveDay === 5 || effectiveDay === 6) baseTargetRank = 5;
                else if (effectiveDay === 0) baseTargetRank = 3;

                currentBaseScore = await getScoreForRank(baseTargetRank);
            }

            for (const bot of bots as any[]) {
                // Determine if we should act (Randomness + Time verification)
                // Don't update ALL bots every loop to reduce writes
                if (Math.random() > 0.4) continue;

                if (bot.bot_tier === BotTier.SMART_LOTTERY) {
                    // Lottery bot (iPhone) just chills and collects small amounts
                    if (Math.random() > 0.8) await updateSingleBot(bot, getRandomSpinReward(), weekId);
                    continue;
                }

                if (bot.bot_tier === BotTier.SMART_LOTTERY_KTM) {
                    // Lottery bot (KTM) chills too, but earns 50% less than normal
                    if (Math.random() > 0.8) {
                        const reward = getRandomSpinReward();
                        const reducedReward = Math.floor(reward * 0.5); // 50% less coins
                        await updateSingleBot(bot, reducedReward, weekId);
                    }
                    continue;
                }

                // Calculate Target
                let myTarget = 0;
                if (isRushHour) {
                    const myLead = botLeads[bot.uid] || 10000;
                    myTarget = currentBaseScore + myLead;
                } else {
                    const isBotZero = bot.uid.endsWith('_0');
                    if (isBotZero) myTarget = currentBaseScore + 500;
                    else myTarget = Math.max(100, currentBaseScore - 500);
                }

                // Check STATUS
                if (bot.coins < myTarget) {
                    const deficit = myTarget - bot.coins;
                    let reward = 0;

                    // SUPER AGGRESSIVE MODE (Last 15 Minutes)
                    if (isSuperAggressive) {
                        // 3x-5x faster catch up with realistic randomization
                        if (deficit > 5000) {
                            // Big deficit: 5k-12k per update (koi bhi number!)
                            reward = getRandomBetween(5000, 12000, 1);
                        } else if (deficit > 1000) {
                            // Medium deficit: 2k-5k per update
                            reward = getRandomBetween(2000, 5000, 1);
                        } else {
                            // Small deficit: 800-2k per update
                            reward = getRandomBetween(800, 2000, 1);
                        }
                        // console.log(`🔥 SUPER AGGRESSIVE: Bot ${bot.username} catching up with ${reward} coins`);
                    } else {
                        // NORMAL TIERED REWARDS Logic
                        if (deficit > 5000) {
                            reward = getCatchUpReward();
                        } else if (deficit > 1000) {
                            reward = getMediumReward();
                        } else {
                            reward = getSmallRandomReward();
                        }
                    }

                    await updateSingleBot(bot, reward, weekId);
                    bot.coins += reward; // Update local state for next loop logic

                } else {
                    // AHEAD -> Strict Chill due to "Rank Inflation" issue
                    // Previously 20% chance caused them to climb #17 on Tuesday.
                    // Now: 1% chance just to update lastActive timestamp occasionally.
                    if (Math.random() > 0.99) {
                        const smallReward = getSmallRandomReward();
                        await updateSingleBot(bot, smallReward, weekId);
                        bot.coins += smallReward;
                    }
                }
            }

            // 4. ZOMBIE MODE (Retired Bots Logic)
            // Wake up old bots occasionally to update their "Last Active"
            if (Math.random() > 0.7) { // 30% chance per 6s tick to wake up zombies
                const { data: retiredBots } = await supabase
                    .from(BOT_COLLECTION)
                    .select('uid, username')
                    .eq('bot_tier', 'RETIRED')
                    .order('last_active', { ascending: true })
                    .limit(3);

                if (retiredBots && retiredBots.length > 0) {
                    for (const zombie of retiredBots) {
                        // Wake them up!
                        const updates = {
                            last_active: new Date().toISOString(),
                            total_spins: ((zombie as any).total_spins || 0) + 1
                        };

                        await supabase
                            .from(BOT_COLLECTION)
                            .update(updates)
                            .eq('uid', zombie.uid);

                        await supabase
                            .from('users')
                            .update(updates)
                            .eq('uid', zombie.uid);

                        // console.log(`🧟 Zombie Woke Up: ${zombie.username}`);
                    }
                }
            }
        }
        console.log('🤖 Bot Simulation Loop Finished.');
    } catch (error) {
        console.error('❌ Bot Simulation Loop Error:', error);
    }
};

/**
 * ATOMIC UPDATE
 * Uses atomic operations to avoid race conditions (overwrite glitches).
 */
const updateSingleBot = async (bot: any, amount: number, weekId: string) => {
    // NEW: Action Based Spin Calculation
    let spinsToAdd = 1; // Default for small wins
    if (amount >= 1200) {
        spinsToAdd = 5; // Jackpot/Big Win
    } else if (amount >= 450) {
        spinsToAdd = 3; // Medium Win
    }
    // Else 1 spin for small wins (50-150)

    // Use RPC for atomic updates and RLS bypass
    // Note: RPC handles incrementing existing values
    const { error } = await rpc.updateBotStats(bot.uid, weekId, amount, spinsToAdd);

    if (error) {
        console.error(`❌ Error updating bot ${bot.username}:`, error);
    }
};

/**
 * Helper: Get All Smart Bots
 */
export const getSmartBots = async () => {
    try {
        const weekId = getCurrentWeekId();

        const { data, error } = await supabase
            .from(BOT_COLLECTION)
            .select('*')
            .eq('week_id', weekId);

        if (error) {
            console.error("Error getting smart bots:", error);
            return [];
        }

        return (data || [])
            .map((bot: any) => ({ id: bot.uid, ...bot }))
            .filter((bot: any) => bot.bot_tier !== 'RETIRED');
    } catch (error) {
        console.error("Error getting smart bots:", error);
        return [];
    }
};

/**
 * 🧪 TEST ONLY: Generate Demo Leaderboard
 * Creates 80 fake entries in weeklyLeaderboard to test ranking logic.
 * These are lightweight entries (no user profile).
 */
export const generateDemoLeaderboard = async (count: number = 80) => {
    try {
        console.log(`🧪 Generating ${count} Demo Bots via RPC...`);
        const weekId = getCurrentWeekId();

        const { error } = await rpc.generateDemoLeaderboard(weekId, count);

        if (error) {
            console.error("Error generating demo leaderboard:", error);
            throw error;
        }

        console.log('✅ Demo Leaderboard Populated!');
    } catch (error) {
        console.error("Error generating demo leaderboard:", error);
        throw error;
    }
};

/**
 * 🧪 TEST ONLY: Clear Demo Bots
 */
export const clearDemoLeaderboard = async () => {
    try {
        console.log('🧹 Cleaning Demo Bots...');
        const weekId = getCurrentWeekId();

        // Approach: Batch delete known ID range
        let deleted = 0;

        for (let i = 0; i < 200; i++) { // Cover up to 200 potential demo bots
            const botId = `demo_bot_${i}`;

            const { error } = await supabase
                .from('weekly_leaderboard')
                .delete()
                .eq('user_id', botId)
                .eq('week_id', weekId);

            if (!error) deleted++;
        }

        console.log(`✅ Demo Bots Cleared. Deleted: ${deleted}`);
    } catch (error) {
        console.error('❌ Error clearing demo bots:', error);
    }
};
