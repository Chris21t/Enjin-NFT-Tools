const config = require('../config/config');
const { addToQueue } = require('../transactionQueue');
const { checkWhitelist } = require('../helpers/whitelist');
const logger = require('../utils/logger');

const SUPER_TIP_FEE = 25; // Define the Super Tip fee here

async function stipCommand(ctx, db, bot) {
    const senderUserId = ctx.from.id; // The user sending the Super Tip
    const commandArgs = ctx.message.text.split(' ');

    if (commandArgs.length < 3) {
        ctx.reply('Usage: /stip @USERNAME MESSAGE');
        return;
    }

    const mentionedUsername = commandArgs[1].replace('@', ''); // Remove "@" symbol
    const messageText = commandArgs.slice(2).join(' '); // Extract the message

    // Check if the mentionedUsername is the same as the sender's username
    if (mentionedUsername.toLowerCase() === ctx.from.username.toLowerCase()) {
        return ctx.reply('You cannot send a Super Tip to yourself.');
    }

    try {
        // Fetch the recipient's data from the database using the mentioned username
        const recipientRow = await db.getAsync("SELECT telegram_id, address, username FROM users WHERE username = ?", [mentionedUsername]);
        if (!recipientRow) {
            ctx.reply(`The user "${mentionedUsername}" is not found or not registered. Please make sure you've mentioned the correct username.`);
            return;
        }

        // Define recipientUserId from the recipientRow
        const recipientUserId = recipientRow.telegram_id;

        // Fetch the sender's last token type and last tip date from the database
        const senderRow = await db.getAsync("SELECT address, username, tip_count_sent, last_token_type, last_tip_date FROM users WHERE telegram_id = ?", [senderUserId]);
        if (!senderRow || !senderRow.address) {
            ctx.reply('Your address is not found. Make sure you are registered and have set your address.');
            return;
        }

        // Only allow users with certain token types to use the stipCommand.
        const allowedTokenTypes = ['Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Admin'];
        if (!allowedTokenTypes.includes(senderRow.last_token_type)) {
            const senderTipCountSent = senderRow.tip_count_sent || 0;
            const tipsRemainingForSilver = Math.max(500 - senderTipCountSent, 0);

            ctx.reply(`You need to have a Silver, Gold, Platinum, Diamond, or Champion rank to use this command. You need ${tipsRemainingForSilver} more tip${tipsRemainingForSilver === 1 ? '' : 's'} to reach Silver rank. You better start tipping!`);
            return;
        }

        const isAdmin = senderRow.last_token_type === 'Admin';
        const today = new Date();

        // Check if the user has already sent a Super Tip today (ignore for Admin)
        if (!isAdmin) {
            const lastTipDate = senderRow.last_tip_date ? new Date(senderRow.last_tip_date) : null;
            if (lastTipDate && lastTipDate.setHours(0,0,0,0) === today.setHours(0,0,0,0)) {
                ctx.reply('You have already sent a Super Tip today. Please try again tomorrow.');
                return;
            }
        }

        const senderTipCountSent = senderRow.tip_count_sent || 0;

        // Check if the sender has enough balance for the Super Tip (ignore for Admin)
        if (!isAdmin && senderTipCountSent < SUPER_TIP_FEE) {
            ctx.reply('You do not have enough balance to send a Super Tip.');
            return;
        }

        // Check if the sender's address is whitelisted
        if (!checkWhitelist(senderRow.address)) {
            const message = 'Sorry, you are not whitelisted and cannot send Super Tips. In order to start tipping, make sure to acquire an NFT Tipper token.';
            return ctx.replyWithHTML(message);
        }

        // Deduct the Super Tip fee from tip_count_sent of the sender and update the last_tip_date (ignore for Admin)
        if (!isAdmin) {
            await db.runAsync("UPDATE users SET tip_count_sent = tip_count_sent - ?, last_tip_date = ? WHERE telegram_id = ?", [SUPER_TIP_FEE, today.toISOString(), senderUserId]);
        }

        // Construct transaction data for the queue
        const transactionData = {
            senderUserId, // include the sender's user ID for nonce tracking
            recipientAddress: recipientRow.address,
            recipientUsername: recipientRow.username,
            collectionId: config.stipCollectionId,
            tokenId: config.stipTokenId,
        };

        // Add the transaction to the queue instead of sending it directly
        logger.info(`👑 Queuing a Super Tip from ${senderRow.username || `user with ID ${senderUserId}`} to ${recipientRow.username}.`);
        addToQueue(transactionData);

        // Customize the message for the recipient
        const senderUsernameDisplay = senderRow.username || `user with ID ${senderUserId}`;
        const recipientUsernameDisplay = recipientRow.username;
        const imageUrl = config.stipImageUrl;

        // Send a consolidated confirmation message with photo to the group chat
        const groupMessage = `<b>Super Tip Incoming!</b>\n\n` +
            `A <b><a href="https://nft.io/asset/${config.stipCollectionId}-${config.stipTokenId}">Super Tip</a></b> was sent to @${recipientRow.username}. Hold tight as our digital courier gets everything ready for launch! 🌟\n\n` +
            `<b>Message:</b> <i>${messageText}</i> - @${senderUsernameDisplay}.\n\n` +
            `<b>Reminder:</b> This stellar gesture will deduct <b>${SUPER_TIP_FEE} tips</b> from your balance and is exclusively available to Tippers ranked Silver or higher. Use your tipping abilities wisely – limit one Super Tip per day. 🎩✨`;

        await ctx.replyWithPhoto(config.stipImageUrl, {
            caption: groupMessage,
            parse_mode: 'HTML'
        });

        // Sender Message
        const senderMessage = `<b>Super Tip Incoming!</b>\n\n` +
            `A <b><a href="https://nft.io/asset/${config.stipCollectionId}-${config.stipTokenId}">Super Tip</a></b> was sent to @${recipientRow.username}. Hold tight as our digital courier gets everything ready for launch! 🌟\n\n` +
            `<b>Remember:</b> This stellar move will deduct <b>${SUPER_TIP_FEE} tips</b> from your balance. Use your tipping powers wisely – one Super Tip per day. 🎩✨`;

        // Send the confirmation message with photo to the sender
        await bot.telegram.sendPhoto(senderUserId, config.stipImageUrl, {
            caption: senderMessage,
            parse_mode: 'HTML'
        });

        // Receiver Message
        const recipientMessage = `🎉 You've just received a <b><a href="https://nft.io/asset/${config.stipCollectionId}-${config.stipTokenId}">Super Tip</a></b> from @${senderRow.username || `user with ID ${senderUserId}`}!\n\n` +
            `<b>Message:</b>\n${messageText}\n\n` +
            `Enjoy your Super Tip! 👉 <a href="https://nft.io/asset/${config.stipCollectionId}-${config.stipTokenId}">View your Super Tip</a>`;

        // Send the message and photo with HTML parse mode to the recipient
        await bot.telegram.sendPhoto(recipientUserId, config.stipImageUrl, {
            caption: recipientMessage,
            parse_mode: 'HTML'
        });

    } catch (error) {
        logger.error('Error processing Super Tip command:', error);
        ctx.reply('An error occurred while processing your Super Tip. Please try again later.');
    }
}

module.exports = stipCommand;