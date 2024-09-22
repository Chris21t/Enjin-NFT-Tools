const fs = require('fs');
const path = require('path'); // Include the path module
const config = require('../config/config');
const { addToQueue } = require('../transactionQueue');
const { checkWhitelist } = require('../helpers/whitelist');
const logger = require('../utils/logger');

async function tipCommand(ctx, db) {
    const senderUserId = ctx.from.id; // The user sending the tip
    let recipientUserId = null; // The user receiving the tip

    // Check if the command is executed in a group or a supergroup
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return ctx.reply('Tipping is only allowed in groups. 🗣️');
    }

    // Load minting report data
    const mintingReportPath = path.join(__dirname, '..', 'mintingReport.json');

    let mintingReport;
    try {
        const rawData = fs.readFileSync(mintingReportPath);
        mintingReport = JSON.parse(rawData);
    } catch (error) {
        logger.error('Error reading minting report:', error);
        ctx.reply('Failed to retrieve the minting report data. Please try again later. 👀');
        return;
    }

    // Check balanceToken and balance
    if (mintingReport.balanceToken < 1000 || mintingReport.balance < 10) {
        const message = [
            '🚨 <b>Attention Needed!</b> 🚨\n\n',
            'The NFT Tipping Bot is running low on resources:\n',
            mintingReport.balanceToken < 1000 ? `♦️ Tipper Tokens are critically low (${mintingReport.balanceToken} left). Minimum: 1000.\n` : '',
            mintingReport.balance < 10 ? `♦️ ENJ Balance is below safe levels (${mintingReport.balance} ENJ left). Minimum: 10.\n\n` : '',
            'To continue enjoying uninterrupted tipping, please contribute by sending the necessary resources to the following address:\n',
            `<code>${mintingReport.address}</code>\n\n`,
            'Your support keeps our community thriving! 💜'
        ].join('');
        ctx.replyWithHTML(message);
        return;
    }


    if (ctx.message.reply_to_message) {
        recipientUserId = ctx.message.reply_to_message.from.id; // Check if there's a reply
    } else if (ctx.message.entities) {
        // Check if the message contains a mention (username)
        const mentionEntity = ctx.message.entities.find((entity) => entity.type === 'mention');
        if (mentionEntity) {
            const mentionText = ctx.message.text.substr(mentionEntity.offset, mentionEntity.length);
            const mentionedUsername = mentionText.replace('@', ''); // Remove "@" symbol

            // Check if the mentionedUsername is the same as the sender's username
            if (mentionedUsername.toLowerCase() === (ctx.from.username || '').toLowerCase()) {
                return ctx.reply('You cannot send a tip to yourself. 👀');
            }

            try {
                // Fetch the recipient's data from the database using the mentioned username
                const recipientRow = await db.getAsync("SELECT telegram_id, address, username FROM users WHERE username = ?", [mentionedUsername]);

                if (recipientRow) {
                    if (recipientRow.telegram_id) {
                        recipientUserId = recipientRow.telegram_id;
                    } else {
                        // Telegram ID not found for the user, reply with a user-friendly message
                        logger.error(`🤔 Recipient Telegram ID not found in the database for username: ${mentionedUsername}`);
                        ctx.reply(`The user "${mentionedUsername}" does not have a valid ID in our system. Please make sure they're registered properly. 👀`);
                        return;
                    }
                } else {
                    // User not found in the database, reply with a user-friendly message
                    logger.error(`🤔 Recipient data not found in the database for username: ${mentionedUsername}`);
                    ctx.reply(`The user "${mentionedUsername}" is not found or not registered. Please make sure you've mentioned the correct username. 👀`);
                    return;
                }
            } catch (error) {
                logger.error('Error fetching recipient data:', error);
                ctx.reply('Failed to retrieve recipient data. Please try again later. 👀');
                return;
            }
        }
    }

    // Prevent users from tipping themselves
    if (senderUserId === recipientUserId) {
        return ctx.reply('You cannot send a tip to yourself. 👀');
    }

    try {

        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const oneHour = 3600; // Seconds in one hour

        // Get the sender's data from the database
        const senderData = await db.getAsync("SELECT address, username, last_tip_time, hourly_tip_count FROM users WHERE telegram_id = ?", [senderUserId]);

        if (!senderData || !senderData.address) {
            ctx.reply('Your address is not found. Make sure you are registered and have set your address. 👀');
            return;
        }

        // Check if the sender's address is whitelisted
        if (!checkWhitelist(senderData.address)) {
            const message = 'Sorry, you are not whitelisted and cannot send tips. In order to start tipping, make sure to acquire an <b><a href="https://nft.io/asset/2479-1">NFT Tipper</a></b> token. 🛒';
            return ctx.replyWithHTML(message);
        }

        // Get the recipient's data from the database
        const recipientRow = await db.getAsync("SELECT address, username FROM users WHERE telegram_id = ?", [recipientUserId]);

        if (!recipientRow || !recipientRow.address) {
            ctx.reply('Recipient address is not found. Make sure the recipient is registered and has set their address. 👀');
            return;
        }

        // Reset the hourly_tip_count if more than an hour has passed since the last tip
        if (currentTime - senderData.last_tip_time > oneHour) {
            await db.runAsync("UPDATE users SET hourly_tip_count = 0 WHERE telegram_id = ?", [senderUserId]);
            senderData.hourly_tip_count = 0;
        }

        // Check if the user has exceeded the hourly tip limit
        if (senderData.hourly_tip_count >= 3) {
            ctx.reply('You have reached the maximum tip limit of 3 per hour. Please try again later. ⏳');
            return;
        }

        // Construct transaction data for the queue
        const transactionData = {
            senderUserId, // include the sender's user ID for nonce tracking
            recipientAddress: recipientRow.address,
            recipientUsername: recipientRow.username,
            collectionId: config.collectionId,
            tokenId: config.tokenId
        };

        // Flag for successful tip, actual sending will be handled by the transaction queue processor
        let success = true;

        // Add the transaction to the queue instead of sending it directly
        try {
            logger.info(`✉️  Queuing a tip from ${senderData.username || `user with ID ${senderUserId}`} to ${recipientRow.username || `user with ID ${recipientUserId}`}.`);
            addToQueue(transactionData);
        } catch (error) {
            logger.error('Failed to add transaction to queue:', error);
            ctx.reply('Failed to send tip. Please try again later. 🔁');
            success = false;
        }

        // Introduce a delay of 200ms second before replying
        const delayMs = 200;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (success) {
            const recipientUsername = recipientRow.username || 'Anonymous';
            ctx.reply(
                `An <b><a href="https://nft.io/asset/${config.collectionId}-${config.tokenId}">NFT Tip</a></b> was sent successfully to @${recipientUsername}. I'll deliver it to your Enjin Wallet as quickly as possible. Enjoy! 💜`,
                { parse_mode: 'HTML' }
            );

            // Record the successful tip in the database with the current time
            try {
                await db.runAsync("BEGIN");
                await db.runAsync("INSERT INTO tips (telegram_id, tip_time) VALUES (?, ?)", [senderUserId, currentTime]);
                await db.runAsync("UPDATE users SET tip_count_received = tip_count_received + 1 WHERE telegram_id = ?", [recipientUserId]);
                await db.runAsync("UPDATE users SET tip_count_sent = tip_count_sent + 1, last_tip_time = ?, hourly_tip_count = hourly_tip_count + 1 WHERE telegram_id = ?", [currentTime, senderUserId]);
                await db.runAsync("COMMIT");
            } catch (error) {
                logger.error('Failed to update the database after a successful tip:', error);
                // Handle database update error if necessary
            }
        } else {
            ctx.reply('Failed to send an NFT Tip. Please try again later. 🔁');
        }
    } catch (error) {
        logger.error('Error processing tip command:', error);
        ctx.reply('An error occurred while processing your request. Please try again later. 🔁');
    }
}

module.exports = tipCommand;