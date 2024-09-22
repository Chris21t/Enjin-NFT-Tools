const schedule = require('node-schedule');
const db = require('../database/db');
const config = require('../config/config');
const { addToQueue } = require('../transactionQueue');
const logger = require('../utils/logger');

function startScheduledJob2(bot) {
    schedule.scheduleJob('*/1 * * * *', async function () {
        try {
            // Select users along with an 'isAdmin' flag
            const rows = await db.allAsync("SELECT telegram_id, address, username, tip_count_sent, last_token_type, isAdmin FROM users");

            if (rows.length === 0) {
                logger.info("No users available for token distribution.");
                return;
            }

            for (const user of rows) {
                // Fetch the user's current rank from the database
                const updatedUserData = await db.getAsync("SELECT last_token_type, isAdmin FROM users WHERE telegram_id = ?", [user.telegram_id]);

                // Check the user's isAdmin status without checking their current rank
                const isAdmin = updatedUserData.isAdmin;

                // Check if the admin user has already been notified
                const hasBeenNotified = updatedUserData.last_token_type === 'Admin';

                // Admin check and token assignment
                if (isAdmin && !hasBeenNotified) {
                    let tokenUrl = `https://nft.io/asset/${config.adminCollectionId}-${config.adminTokenId}`;
                    let adminMessage = [
                        `👑 <b>SALUTE, @${user.username || `ID: ${user.telegram_id}`}</b>`,
                        `As a pillar of the community, your leadership shines. We're honored to award you the <a href="${tokenUrl}">Admin Tipper</a> Token.`,
                        `This token is a symbol of your commitment and exceptional contributions.`,
                        `It will unlock special commands and interfaces soon. Wear it with pride!\n\nThank you for all that you do! 🌟`
                    ].join('\n\n');

                    // Debugging output for admin promotion
                    logger.debug(`Promoting user ${user.username || `ID: ${user.telegram_id}`} to Admin`);
                    
                    addToQueue({
                        recipientAddress: user.address,
                        recipientUsername: user.username || `ID: ${user.telegram_id}`,
                        collectionId: config.adminCollectionId,
                        tokenId: config.adminTokenId,
                    });

                    await db.runAsync("UPDATE users SET last_token_type = 'Admin' WHERE telegram_id = ?", [user.telegram_id]);

                    try {
                        await bot.telegram.sendPhoto(user.telegram_id, config.adminImageUrl, { caption: adminMessage, parse_mode: 'HTML' });
                        logger.info(`Admin token information sent to ${user.username || `ID: ${user.telegram_id}`}.`);
                    } catch (error) {
                        logger.error(`Failed to send admin token information to ${user.username || `ID: ${user.telegram_id}`}: ${error}`);
                    }
                }

                // Skip the rest of the loop for this admin user
                if (isAdmin) continue;

                // Token distribution logic based on the last token type
                let tokenType = '';
                let collectionId = '';
                let tokenId = '';
                let imageUrl = '';
                let message = '';
                let tokenUrl = '';

                if (user.tip_count_sent >= 10000 && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Champion';
                    collectionId = config.championCollectionId;
                    tokenId = config.championTokenId;
                    imageUrl = config.championImageUrl;
                    tokenUrl = `https://nft.io/asset/${collectionId}-${tokenId}`;
                    message = `🏆🌌 <b>LEGENDARY, @${user.username}!</b>\n\nYou've reached the pinnacle of tipping with over 10,000 tips! You're a true Champion! As a symbol of peak generosity, here's your <a href="${tokenUrl}">Champion Tipper Token</a>.\n\nThe community salutes you! 🎖️👏`;
                } else if (user.tip_count_sent >= 5000 && updatedUserData.last_token_type !== 'Diamond' && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Diamond';
                    collectionId = config.platinumCollectionId;
                    tokenId = config.platinumTokenId;
                    imageUrl = config.platinumImageUrl;
                    tokenUrl = `https://nft.io/asset/${collectionId}-${tokenId}`;
                    message = `🌟💠 <b>EXTRAORDINARY, @${user.username}!</b>\n\nWith over 5000 tips, your generosity shines bright like Platinum! Enjoy your <a href="${tokenUrl}">Platinum Tipper Token</a>, and wear it with pride!\n\nYour legendary status is on the horizon! 🌠`;
                } else if (user.tip_count_sent >= 2500 && updatedUserData.last_token_type !== 'Platinum' && updatedUserData.last_token_type !== 'Diamond' && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Platinum';
                    collectionId = config.platinumCollectionId;
                    tokenId = config.platinumTokenId;
                    imageUrl = config.platinumImageUrl;
                    tokenUrl = `https://nft.io/asset/${collectionId}-${tokenId}`;
                    message = `💎✨ <b>SPARKLING, @${user.username}!</b>\n\nYour contribution of over 2500 tips is nothing short of remarkable. As a token of appreciation, here's your dazzling <a href="${tokenUrl}">Diamond Tipper Token</a>.\n\nKeep shining! 🌟`;
                } else if (user.tip_count_sent >= 1000 && updatedUserData.last_token_type !== 'Gold' && updatedUserData.last_token_type !== 'Diamond' && updatedUserData.last_token_type !== 'Platinum' && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Gold';
                    collectionId = config.goldCollectionId;
                    tokenId = config.goldTokenId;
                    imageUrl = config.goldImageUrl;
                    tokenUrl = `https://nft.io/asset/${config.goldCollectionId}-${config.goldTokenId}`;
                    message = `🥇🌟 <b>CONGRATULATIONS, @${user.username}!</b>\n\nYou've joined the elite ranks of GOLD Tippers! With over 1000 tips, you've struck gold. Enjoy your exclusive <a href="${tokenUrl}">Gold Tipper Token</a>, a symbol of your extraordinary generosity!\n\nKeep the tips coming! 🚀`;
                } else if (user.tip_count_sent >= 500 && updatedUserData.last_token_type !== 'Silver' && updatedUserData.last_token_type !== 'Gold' && updatedUserData.last_token_type !== 'Diamond' && updatedUserData.last_token_type !== 'Platinum' && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Silver';
                    collectionId = config.silverCollectionId;
                    tokenId = config.silverTokenId;
                    imageUrl = config.silverImageUrl;
                    tokenUrl = `https://nft.io/asset/${config.silverCollectionId}-${config.silverTokenId}`;
                    message = `🥈⚡ <b>FANTASTIC, @${user.username}!</b>\n\nYou've crossed the 500-tip mark, and the community is abuzz with excitement! As a token of our appreciation, we're delighted to present you with the <a href="${tokenUrl}">Silver Tipper Token</a>.\n\nIn addition, you've unlocked the ability to send a Super Tip! Use the /stip command to send an extra special tip to a friend each day. Keep shining bright like silver!\n\nYou're truly amazing! 🌟`;
                } else if (user.tip_count_sent >= 100 && updatedUserData.last_token_type !== 'Bronze' && updatedUserData.last_token_type !== 'Silver' && updatedUserData.last_token_type !== 'Gold' && updatedUserData.last_token_type !== 'Diamond' && updatedUserData.last_token_type !== 'Platinum' && updatedUserData.last_token_type !== 'Champion') {
                    tokenType = 'Bronze';
                    collectionId = config.bronzeCollectionId;
                    tokenId = config.bronzeTokenId;
                    imageUrl = config.bronzeImageUrl;
                    tokenUrl = `https://nft.io/asset/${config.bronzeCollectionId}-${config.bronzeTokenId}`;
                    message = `🥉🔥 <b>WELL DONE, @${user.username}!</b>\n\nYou've tipped over 100 times, igniting joy across the community! Celebrate with your very own <a href="${tokenUrl}">Bronze Tipper Token</a>. You're on fire! 🔥\n\nYour generosity is incredible! 🎉`;
                } else if (user.tip_count_sent >= 10 && !['Rookie', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Platinum', 'Champion'].includes(updatedUserData.last_token_type)) {
                    tokenType = 'Rookie';
                    collectionId = config.rookieCollectionId;
                    tokenId = config.rookieTokenId;
                    imageUrl = config.rookieImageUrl;
                    tokenUrl = `https://nft.io/asset/${config.rookieCollectionId}-${config.rookieTokenId}`;
                    message = `🌱🎈 <b>YAY, @${user.username}!</b>\n\nYou're on your way with 10 tips! We're all cheering for you. Enjoy your <a href="${tokenUrl}">Rookie Tipper Token</a>, and keep those tips coming!\n\nThanks for tipping! 🎊`;
                }

                if (tokenType) {
                    addToQueue({
                        recipientAddress: user.address,
                        recipientUsername: user.username || `ID: ${user.telegram_id}`,
                        collectionId: collectionId,
                        tokenId: tokenId,
                    });

                    // Log that the token is queued for distribution.
                    logger.info(`${tokenType} Tipper Token queued for distribution to ${user.username || `ID: ${user.telegram_id}`}.`);

                    // Update the user's last token type in the database, but only if they are not an admin
                    await db.runAsync("UPDATE users SET last_token_type = ? WHERE telegram_id = ? AND isAdmin = 0", [tokenType, user.telegram_id]);

                    // Direct message the user
                    try {
                        await bot.telegram.sendPhoto(user.telegram_id, imageUrl, { caption: message, parse_mode: 'HTML' });
                        logger.info(`Direct message sent to ${user.username || `ID: ${user.telegram_id}`}.`);
                    } catch (error) {
                        logger.error(`Failed to send direct message to ${user.username || `ID: ${user.telegram_id}`}: ${error}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`An error occurred during token distribution: ${error}`);
        }
    });
}

module.exports.startScheduledJob2 = startScheduledJob2;