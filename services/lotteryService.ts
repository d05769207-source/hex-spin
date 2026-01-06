import { db } from '../firebase';
import { collection, doc, getDocs, query, where, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { BotTier } from '../types';
import { getSmartBots } from './smartBotService';

const LOTTERY_PARTICIPANTS_COLLECTION = 'sunday_lottery_participants';

/**
 * Ensures the 'Lottery Bot' has a ticket for the given prize.
 * If not, it buys one.
 */
export const ensureLotteryBotParticipation = async (prize: 'iPhone' | 'KTM'): Promise<{ number: number; name: string } | null> => {
    try {
        // 1. Find the Designated Lottery Bot based on Prize
        const bots = await getSmartBots();

        let targetTier = BotTier.SMART_LOTTERY; // Default iPhone Bot
        if (prize === 'KTM') {
            targetTier = BotTier.SMART_LOTTERY_KTM; // KTM Bot
        }

        const lotteryBot = (bots as any[]).find(b => b.botTier === targetTier);

        if (!lotteryBot) {
            console.warn('⚠️ No Lottery Bot found!');
            return null;
        }

        // 2. Check if already participated
        const q = query(
            collection(db, LOTTERY_PARTICIPANTS_COLLECTION),
            where('userId', '==', lotteryBot.uid), // Assuming we start saving userId
            where('prize', '==', prize)
        );

        // Note: In Event.tsx currently we don't save userId, only code. 
        // We need to upgrade Event.tsx to save userId if we want to query by it, 
        // OR we just rely on saving it locally in this function.
        // For robustness, let's checking by a specific field we will start using.

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            console.log(`🤖 Lottery Bot (${lotteryBot.username}) already joined ${prize} with code ${data.code}`);
            return { number: data.code, name: lotteryBot.username! };
        }

        // 3. Generate a "Lucky" Ticket
        const luckyTicket = Math.floor(Math.random() * 900000) + 100000;

        // 4. Force Join
        await addDoc(collection(db, LOTTERY_PARTICIPANTS_COLLECTION), {
            code: luckyTicket,
            prize: prize,
            joinedAt: Timestamp.now(),
            userId: lotteryBot.uid, // We add this field for tracking
            isBot: true,
            username: lotteryBot.username
        });

        console.log(`🤖 Lottery Bot (${lotteryBot.username}) Force Joined ${prize} with code ${luckyTicket}`);
        return { number: luckyTicket, name: lotteryBot.username! };

    } catch (error) {
        console.error('❌ Error ensuring lottery bot participation:', error);
        return null;
    }
};

/**
 * Picks the WINNER.
 * Returns the Lottery Bot's ticket if available.
 * Fallback to random if something fails.
 */
export const pickRiggedWinner = async (prize: 'iPhone' | 'KTM'): Promise<{ number: number; name: string }> => {
    try {
        console.log(`🎲 Picking Rigged Winner for ${prize}...`);

        // 1. Ensure Bot is in the pool
        const botEntry = await ensureLotteryBotParticipation(prize);

        if (botEntry) {
            console.log(`✅ RIGGED WINNER SELECTED: ${botEntry.name} (${botEntry.number})`);
            return botEntry;
        }

        // Fallback: Random (Should not happen if bot exists)
        console.warn('⚠️ Rigging Failed (No Bot). Falling back to random.');
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        return { number: randomNum, name: 'Lucky Winner' };

    } catch (error) {
        console.error('❌ Error picking rigged winner:', error);
        return { number: 0, name: 'Error' };
    }
};
