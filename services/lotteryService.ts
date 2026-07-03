import { supabase } from '../supabaseClient';
import { BotTier } from '../types';
import { getSmartBots } from './smartBotService';

const LOTTERY_PARTICIPANTS_TABLE = 'sunday_lottery_participants';

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

        const lotteryBot = (bots as any[]).find(b => b.bot_tier === targetTier);

        if (!lotteryBot) {
            console.warn('⚠️ No Lottery Bot found!');
            return null;
        }

        // 2. Check if already participated
        const { data, error } = await supabase
            .from(LOTTERY_PARTICIPANTS_TABLE)
            .select('*')
            .eq('user_id', lotteryBot.uid)
            .eq('prize', prize)
            .limit(1);

        if (error) {
            console.error('Error checking lottery bot participation:', error);
            return null;
        }

        if (data && data.length > 0) {
            const entry = data[0];
            console.log(`🤖 Lottery Bot (${lotteryBot.username}) already joined ${prize} with code ${entry.code}`);
            return { number: entry.code, name: lotteryBot.username! };
        }

        // 3. Generate a "Lucky" Ticket
        const luckyTicket = Math.floor(Math.random() * 900000) + 100000;

        // 4. Force Join
        const { error: insertError } = await supabase
            .from(LOTTERY_PARTICIPANTS_TABLE)
            .insert({
                code: luckyTicket,
                prize: prize,
                joined_at: new Date().toISOString(),
                user_id: lotteryBot.uid,
                is_bot: true,
                username: lotteryBot.username
            });

        if (insertError) {
            console.error('Error inserting lottery bot participation:', insertError);
            return null;
        }

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
