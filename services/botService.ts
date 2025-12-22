/**
 * DEPRECATED: Use smartBotService.ts instead.
 * This file is kept temporarily to avoid import errors until all references are updated.
 */

import { BotSystemConfig } from '../types';

export const getBotSystemConfig = async (): Promise<BotSystemConfig> => {
    // Return dummy
    return {} as any;
};

export const updateBotSystemConfig = async () => { };
export const generateBotUsers = async () => { };
export const getBotUsers = async () => [];
export const activateBotsForWeek = async () => { };
export const simulateBotActivity = async () => { };
export const deactivateAllBots = async () => { };
export const deleteAllBots = async () => { };
export const getBotLeaderboard = async () => [];
export const getRealUserStats = async () => ({ count: 0, averageCoins: 0, maxCoins: 0, top10MaxCoins: 0 });
