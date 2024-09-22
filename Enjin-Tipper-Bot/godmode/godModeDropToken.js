const db = require('../database/db');
const config = require('../config/config');
const { BOT_OWNER_ID } = config;
const fs = require('fs');
const path = require('path');
const eventEmitter = require('../helpers/eventEmitter');
const { addToQueue } = require('../transactionQueue');
const logger = require('../utils/logger');

// Define GodV1TokenName, GodV1CollectionId, GodV1TokenId, GodV1ImageUrl, and GodV1TokenMessage at the module level
const GodV1TokenName = config.GodV1TokenName;
const GodV1CollectionId = config.GodV1CollectionId;
const GodV1TokenId = config.GodV1TokenId;
const GodV1ImageUrl = config.GodV1ImageUrl;
const GodV1TokenMessage = config.GodV1TokenMessage;

// Define the sleep function
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = (bot) => {
    bot.action('drop_token_to_all', async (ctx) => {
        if (ctx.from.id.toString() !== BOT_OWNER_ID) {
            await ctx.reply('🚫 You do not have permission to execute this command.');
            logger.error('🚫 Unauthorized access attempt.');
            return;
        }

        const filePath = path.join(__dirname, 'god.txt');
        fs.writeFileSync(filePath, '', 'utf8');

        let users;
        try {
            users = await db.allAsync("SELECT * FROM users");
            users.forEach(user => {
                const transactionData = {
                    collectionId: GodV1CollectionId,
                    tokenId: GodV1TokenId,
                    recipientAddress: user.address,
                    recipientUsername: user.username,
                    telegram_id: user.telegram_id,
                };
                addToQueue(transactionData);
            });

            await ctx.reply('🚀 Godmode token drop initiated. Transactions are being queued.');
        } catch (error) {
            logger.error(`❌ Error queuing transactions: ${error.message}`);
            await ctx.reply('❗ An error occurred while initiating the token drop.');
            return;
        }

        // Wait for the custom event that signals the transactionQueue is processed
        eventEmitter.once('transactionQueueProcessed', () => {
            // Define the success message sending function here
            const sendSuccessMessage = async (ctx, users) => {
                const sendMessage = async (user) => {
                    const usernameOrAnonymous = user.username ? `@${user.username}` : 'Anonymous Tipper';
                    const message = `☄️ <b>${GodV1TokenName} Token Granted!</b> ☄️\n\n${usernameOrAnonymous}, you've been chosen to receive this <b><a href="https://nft.io/asset/${GodV1CollectionId}-${GodV1TokenId}">Special Token</a></b> through God Mode! 🌌\n\n<i>» ${GodV1TokenMessage} «</i>\n\n<b>This token will be dispatched to:</b> ${users.length} pioneers\n\n<i>All the best. XOXO <a href="https://x.com/Fungible_Chris">Chris</a>. 💜</i>`;

                    try {
                        await bot.telegram.sendPhoto(user.telegram_id, GodV1ImageUrl, { caption: message, parse_mode: 'HTML' });
                        fs.appendFileSync(filePath, `${usernameOrAnonymous} - ${user.address}\n`, 'utf8');
                        logger.info(`📬 Message sent to ${usernameOrAnonymous}`);
                    } catch (error) {
                        logger.error(`❌ Failed to send message to ${usernameOrAnonymous}: ${error.message}`);
                    }
                };

                for (const user of users) {
                    await sendMessage(user);
                    await sleep(100); // Correctly await the sleep duration
                }

                logger.info('🎉 Godmode Token drop completed and messages sent to all users.');
                await ctx.reply('🎉 Godmode Token drop completed! Messages have been sent to all users.');
            };

            sendSuccessMessage(ctx, users); // Call the success message sending function
        });
    });
};
