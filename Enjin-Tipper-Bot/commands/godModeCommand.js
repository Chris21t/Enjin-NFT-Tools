const { Markup } = require('telegraf');
const config = require('../config/config');
const logger = require('../utils/logger');

const { ADMIN_STATES } = require('../godmode/adminStates');
const resetTips = require('../godmode/godModeResetTips');
const resetRanking = require('../godmode/godModeResetRanking');
const broadcastMessage = require('../godmode/godModeBroadcast');
const searchUser = require('../godmode/godModeSearchUser');
const dropTokenToAll = require('../godmode/godModeDropToken');
const showStatistics = require('../godmode/godModeShowStatistics');

function godModeCommand(bot, ctx) {
    try {
        const BOT_OWNER_ID = config.BOT_OWNER_ID; // Use the exact property name as defined in your config file

        if (ctx.from.id.toString() === BOT_OWNER_ID) {
            ctx.reply('Admin actions:', Markup.inlineKeyboard([
                [
                    Markup.button.callback('Reset Timers', 'reset_tips'),
                    Markup.button.callback('Reset Ranking', 'reset_ranking'),
                ],
                [
                    Markup.button.callback('Broadcast Message', 'broadcast_message'),
                    Markup.button.callback('Search User', 'search_user'),
                ],
                [
                    Markup.button.callback('Drop Token to All', 'drop_token_to_all'),
                    Markup.button.callback('Show Statistics', 'show_statistics'),
                ],
            ]));
        } else {
            ctx.reply('You do not have permission to execute this command.');
        }
    } catch (error) {
        // Log the error
        logger.error('Error in godModeCommand:', error);

        // Handle the error as needed, e.g., send an error message to the user
        ctx.reply('An error occurred while processing your request.');
    }
}

module.exports = godModeCommand;
