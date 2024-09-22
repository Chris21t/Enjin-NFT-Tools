// godModeMiddleware.js

const { ADMIN_STATES, adminState } = require('../godmode/adminStates');
const config = require('../config/config'); // Import the config object
const logger = require('../utils/logger'); // Ensure you have a logger module to use

module.exports = function(bot, db) {
    // Middleware to handle messages based on admin state
    bot.use(async (ctx, next) => {
        const BOT_OWNER_ID = config.BOT_OWNER_ID;

        // If it's not a text message, or the message sender is not the admin, skip this middleware
        if (ctx.from.id.toString() !== BOT_OWNER_ID || !ctx.message || !('text' in ctx.message)) {
            return next();
        }

        switch (adminState.current) {
            case ADMIN_STATES.AWAITING_BROADCAST:
                adminState.current = ADMIN_STATES.NONE; // Reset the state by modifying the 'current' property
                const broadcastMessage = ctx.message.text;
                let users;
                let successfulDeliveries = 0; // Counter for successful deliveries
                let failedDeliveries = 0; // Counter for failed deliveries

                try {
                    users = await db.allAsync("SELECT telegram_id FROM users");
                } catch (err) {
                    logger.error('🚨 Error fetching users:', err);
                    return;
                }

                for (const user of users) {
                    try {
                        await ctx.telegram.sendMessage(user.telegram_id, broadcastMessage);
                        successfulDeliveries++; // Increment on successful delivery
                        //logger.info(`✅ Successfully sent message to ${user.telegram_id}`);
                    } catch (err) {
                        logger.error(`❌ Failed to send message to ${user.telegram_id}:`, err);
                        failedDeliveries++; // Increment on failed delivery
                    }
                }

                await ctx.reply(`📣 Broadcast complete. Sent: ${successfulDeliveries}, Failed: ${failedDeliveries}.`);
                break;

            case ADMIN_STATES.AWAITING_SEARCH:
                adminState.current = ADMIN_STATES.NONE; // Reset the state
                const searchTerm = ctx.message.text.startsWith('@')
                    ? ctx.message.text.slice(1).toLowerCase() // Remove '@' and convert to lowercase
                    : ctx.message.text.toLowerCase(); // Convert to lowercase for case-insensitive search
                let matches;
                try {
                    matches = await db.allAsync(
                        `SELECT * FROM users WHERE LOWER(username) LIKE ? OR telegram_id = ? OR address LIKE ? ORDER BY CASE
                            WHEN LOWER(username) = ? THEN 1
                            WHEN telegram_id = ? THEN 2
                            WHEN address = ? THEN 3
                            ELSE 4
                        END`,
                        [`%${searchTerm}%`, searchTerm, `%${searchTerm}%`, searchTerm, searchTerm, searchTerm]
                    );
                } catch (err) {
                    logger.error(`🚨 Database error during user search: ${err.message}`);
                    await ctx.reply('An error occurred while searching. Please try again.');
                    return;
                }
                
                if (matches && matches.length > 0) {
                    const MAX_MESSAGE_LENGTH = 4096; // Telegram max message length
                    let replies = '';
                    for (const [index, user] of matches.entries()) {
                        let link = `https://matrix.subscan.io/account/${user.address}`;
                        let userMessage = `
<b>User #${index + 1}:</b>
Username: @${user.username}
ID: ${user.telegram_id}
Tips Sent: ${user.tip_count_sent}
Tips Received: ${user.tip_count_received}
Address: <a href="${link}">${user.address}</a>
Last Token Type: ${user.last_token_type || 'None'}
Registration Date: ${new Date(user.registration_date * 1000).toLocaleDateString()}
Warnings: ${user.warnings}
isAdmin: ${user.isAdmin ? 'Yes' : 'No'}
`;

                        // Check if adding the next user would exceed the maximum message length
                        if ((replies.length + userMessage.length) > MAX_MESSAGE_LENGTH) {
                            // Send the current message and reset the replies string
                            await ctx.replyWithHTML(replies);
                            replies = userMessage;
                        } else {
                            // Add the user to the current message
                            replies += userMessage;
                        }
                    }

                    // Send any remaining replies
                    if (replies.length > 0) {
                        await ctx.replyWithHTML(replies);
                    }
                } else {
                    await ctx.reply('🔍 No users found with the provided search criteria.');
                }
                break;

            default:
                // If the admin state is NONE or unhandled, skip to the next middleware
                return next();
        }
    });
};

// Export the adminState object
module.exports.adminState = adminState;