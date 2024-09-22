const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { addToQueue } = require('../transactionQueue');
const getRandomUser = require('../helpers/getRandomUser');
const { checkWhitelist } = require('../helpers/whitelist');
const logger = require('../utils/logger');

async function randomtipCommand(ctx, db) {
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

    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const oneHour = 3600;

        let senderUsername = ctx.from.username || `User ${ctx.from.id}`;

        const senderData = await db.getAsync("SELECT last_tip_time, hourly_tip_count, address FROM users WHERE telegram_id = ?", [ctx.from.id]);

        if (!senderData) {
            ctx.reply("You are not registered. Please register first using the /register command in my DMs (@NFT_TIPPER_BOT). Simply click start and type /register Your_Enjin_Matrixchain_Address as one command.");
            return;
        }

        if (!checkWhitelist(senderData.address)) {
            const message = 'Sorry, you are not whitelisted and cannot send tips. In order to start tipping, make sure to acquire an <b><a href="https://nft.io/asset/2479-1">NFT Tipper</a></b> token. 🛒';
            return ctx.replyWithHTML(message);
        }

        if (currentTime - senderData.last_tip_time > oneHour) {
            await db.runAsync("UPDATE users SET hourly_tip_count = 0 WHERE telegram_id = ?", [ctx.from.id]);
            senderData.hourly_tip_count = 0;
        } else if (senderData.hourly_tip_count >= 3) {
            const nextTipTime = new Date((senderData.last_tip_time + oneHour) * 1000).toLocaleString();
            ctx.reply(`You have reached the maximum tip limit of 3 per hour. Please try again later. ⏳`);
            return;
        }

        let randomUser;

        try {
            randomUser = await getRandomUser(db, ctx.from.id);
        } catch (error) {
            logger.error('Error getting random user:', error); // Use logger for error logging
            ctx.reply('An error occurred while selecting a random user to send a tip to. Please try again later. ⏳');
            return;
        }

        if (!randomUser) {
            ctx.reply("Sorry, there are no other users to send a random tip to.");
            return;
        }

        const transactionData = {
            recipientAddress: randomUser.address,
            recipientUsername: randomUser.username,
            collectionId: config.collectionId,
            tokenId: config.tokenId,
        };

        const recipientDisplay = randomUser.username ? `@${randomUser.username}` : 'Anonymous';

        try {
            logger.info(`🎲 Queuing a randomtip from ${senderUsername} for ${recipientDisplay}`);
            await addToQueue(transactionData);
        } catch (error) {
            logger.error('Failed to add transaction to queue:', error); // Use logger for error logging
            ctx.reply('Failed to send random tip. Please try again later.');
            return;
        }

        const delayMs = 200;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        ctx.reply(
            `A random <b><a href="https://nft.io/asset/${config.collectionId}-${config.tokenId}">NFT Tip</a></b> is going to ... Let me think about it ... ${recipientDisplay}! Why not? Sounds good! I'll deliver it as quickly as possible. Keep checking your Enjin Wallet. Enjoy! 🤖 `,
            { parse_mode: 'HTML' }
        );

        await db.runAsync("BEGIN");

        await db.runAsync("INSERT INTO tips (telegram_id, tip_time) VALUES (?, ?)", [ctx.from.id, currentTime]);
        await db.runAsync("UPDATE users SET tip_count_received = tip_count_received + 1 WHERE telegram_id = ?", [randomUser.telegram_id]);
        await db.runAsync("UPDATE users SET tip_count_sent = tip_count_sent + 1, last_tip_time = ?, hourly_tip_count = hourly_tip_count + 1 WHERE telegram_id = ?", [currentTime, ctx.from.id]);

        await db.runAsync("COMMIT");
    } catch (error) {
        logger.error('Error in randomtip command:', error); // Use logger for error logging
        ctx.reply('An unexpected error occurred. Please try again later.');
    }
}

module.exports = randomtipCommand;
