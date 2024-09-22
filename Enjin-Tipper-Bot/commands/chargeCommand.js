const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { createProgressBar } = require('../helpers/progressBar');
const logger = require('../utils/logger');
const config = require('../config/config');
const rankRatio = require('../charging/rankRatio.json');
const queryToken = require('../helpers/queryToken');
const { addToQueue, processQueue } = require('../transactionQueue');

const chargeStatusPath = path.join(__dirname, '..', 'charging', 'charge_status.json');
const CHARGE_DURATION_MS = 3600000; // One hour in milliseconds
//const CHARGE_DURATION_MS = 600000; // One hour in milliseconds
const COLLECTION_BLACKLIST = [2479, 5678]; // Example collection IDs that are forbidden

// Using the static token details from config
const ADDRESS = config.address; // Bot's address
const STATIC_TOKEN_ADDRESS = config.address;
const STATIC_TOKEN_COLLECTION_ID = config.collectionId;
const STATIC_TOKEN_ID = config.tokenId;

async function chargeCommand(ctx, db, bot) {
    const args = ctx.message.text.split(' ');

    if (args.length === 1) {
        return replyWithModuleExplanation(ctx);
    }

    if (!fs.existsSync(chargeStatusPath)) {
        return ctx.reply("Charging system is currently unavailable.");
    }

    const chargeStatusData = JSON.parse(fs.readFileSync(chargeStatusPath, 'utf8'));

    if (chargeStatusData.Power !== "On") {
        return ctx.reply("Charging system is currently turned off.");
    }

    const currentPhase = chargeStatusData.On.status;
    if (currentPhase !== "idle") {
        return replyWithCurrentPhase(ctx, currentPhase);
    }

    if (args.length !== 4) {
        return replyWithUsage(ctx, "Incorrect number of arguments provided.");
    }

    const [collectionId, tokenId, amount] = args.slice(1).map(arg => parseInt(arg));
    if (isNaN(collectionId) || isNaN(tokenId) || isNaN(amount)) {
        return replyWithUsage(ctx, "Please make sure that collectionId, tokenId, and amount are valid numbers.");
    }

    if (COLLECTION_BLACKLIST.includes(collectionId)) {
        return ctx.reply("This collection is forbidden from charging.");
    }

    if (amount < chargeStatusData.minCharge || amount > chargeStatusData.maxCharge) {
        return ctx.reply(`Amount must be between ${chargeStatusData.minCharge} and ${chargeStatusData.maxCharge}.`);
    }

    const userTokenBalance = await queryBotBalance(collectionId, tokenId, ADDRESS);
    if (userTokenBalance < amount) {
        return ctx.reply(`Insufficient balance for this token. Current balance: ${userTokenBalance}. Please ensure the bot has enough tokens.`);
    }

    const staticTokenBalanceDetails = await queryBotBalance(STATIC_TOKEN_COLLECTION_ID, STATIC_TOKEN_ID, STATIC_TOKEN_ADDRESS);

    const telegramId = ctx.message.from.id.toString();
    logger.info(`Looking up user with telegram ID: ${telegramId}`);

    try {
        const userQuery = 'SELECT last_token_type, username, isAdmin FROM users WHERE telegram_id = ?';
        let user = await db.getAsync(userQuery, [telegramId]);

        // If the user is not found, retry appending '.0' to the telegramId
        if (!user && !telegramId.endsWith('.0')) {
            const formattedTelegramId = telegramId + '.0';
            logger.info(`Retrying with formatted telegram ID: ${formattedTelegramId}`);
            user = await db.getAsync(userQuery, [formattedTelegramId]);
        }

        if (!user) {
            logger.error(`User not found in the database: ${telegramId}`);
            return ctx.reply("User not found in the database.");
        }

        const userRank = user.last_token_type;
        const rankMultiplier = rankRatio[userRank] || "locked";
        if (rankMultiplier === "locked") {
            return ctx.reply("Your rank does not allow charging at this time.");
        }

        const tokenMetadata = await queryToken(collectionId, tokenId);

        const chargingId = getNextChargingId();
        const chargeDetailsPath = path.join(__dirname, '..', 'charging', `${chargingId}.json`);

        const startAmountBotToken = staticTokenBalanceDetails; // Ensure this is correctly assigned based on your actual data structure
        const targetIncrease = amount * rankMultiplier;
        const targetAmountBotToken = startAmountBotToken + targetIncrease;
        const requiredAmountBotToken = targetIncrease;

        const chargeDetails = {
            chargingId: chargingId,
            status: "initiation",
            startingAt: new Date().toISOString(),
            endingAt: new Date(Date.now() + CHARGE_DURATION_MS).toISOString(),
            collectionIdCharging: collectionId,
            tokenIdCharging: tokenId,
            amountCharging: amount,
            backlisted: COLLECTION_BLACKLIST.includes(collectionId) ? "yes" : "no",
            userNameCharging: user.username,
            userIdCharging: ctx.message.from.id,
            userRankCharging: user.isAdmin === 1 ? "Admin" : userRank,
            userRatioCharging: rankMultiplier,
            startAmountBotToken: startAmountBotToken,
            requiredAmountBotToken: requiredAmountBotToken,
            targetAmountBotToken: targetAmountBotToken,
            chargingTokenMetadata: tokenMetadata,
            balanceChecks: [],
            distribution: {
                chargingAmount: amount,
                currentUsers: 0,
                distributionAmount: 0,
                selection: "all",
                hash1: "example_hash1",
                hash2: "example_hash2"
            }
        };

        fs.writeFileSync(chargeDetailsPath, JSON.stringify(chargeDetails, null, 4));

        updateChargeStatus(chargeStatusData, chargingId);

        const message = createChargeMessage(chargeDetails);
        const imagePath = chargeDetails.chargingTokenMetadata.image;

        try {
            const sentMessage = await bot.telegram.sendPhoto(config.CHAT_ID, { url: imagePath }, { caption: message, parse_mode: 'HTML' });
            await bot.telegram.pinChatMessage(config.CHAT_ID, sentMessage.message_id);
            ctx.reply("Charging period initiated and details pinned to the channel.");

            // Activate the charging period to mark it as active
            activateChargingPeriod(chargeStatusData, chargingId);

            // Start balance checks
            startBalanceChecks(chargeDetails, bot, db);
        } catch (error) {
            logger.error('Error sending or pinning message:', error);
            ctx.reply("Failed to send or pin charging details.");
        }
    } catch (error) {
        logger.error('Error processing charge command:', error);
        ctx.reply("An error occurred while processing the charge command.");
    }
}

function getNextChargingId() {
    let id = 1;
    while (fs.existsSync(path.join(__dirname, '..', 'charging', `CHG${id}.json`))) {
        id++;
    }
    return `CHG${id}`;
}

function updateChargeStatus(chargeStatusData, chargingId) {
    const currentTime = new Date();
    const endTime = new Date(currentTime.getTime() + CHARGE_DURATION_MS);
    chargeStatusData.On = {
        status: "initiation",
        details: { chargingId, startTime: currentTime.toISOString(), endTime: endTime.toISOString() }
    };
    fs.writeFileSync(chargeStatusPath, JSON.stringify(chargeStatusData, null, 4));
}

async function queryBotBalance(collectionId, tokenId, address) {
    try {
        const wsProvider = new WsProvider(config.network.uri);
        const api = await ApiPromise.create({ provider: wsProvider });
        // Adjust the query if necessary to match your blockchain's API
        const balance = await api.query.multiTokens.tokenAccounts(collectionId, tokenId, address);
        await api.disconnect();

        // Ensure the balance is correctly parsed as a numeric value
        const actualBalance = balance.isSome ? parseFloat(balance.unwrap().balance.toHuman().replace(/,/g, '')) : 0;
        return actualBalance;
    } catch (error) {
        logger.error('Error querying bot balance:', error);
        throw error; // Rethrow or handle error appropriately
    }
}


function replyWithModuleExplanation(ctx) {
    let message = "Welcome to the Charging Module! Use this command to charge your tokens.\n\n";
    message += "Usage: /charge <collectionId> <tokenId> <amount>\n";
    message += "Please replace <collectionId>, <tokenId>, and <amount> with actual values.";
    ctx.reply(message);
}

function replyWithUsage(ctx, additionalMessage) {
    let message = additionalMessage + "\n\nUsage: /charge <collectionId> <tokenId> <amount>\n";
    message += "Ensure <collectionId>, <tokenId>, and <amount> are correct.";
    ctx.reply(message);
}

function replyWithCurrentPhase(ctx, currentPhase) {
    switch (currentPhase) {
        case "distribution":
            ctx.reply("There's a current charging period in the distribution phase.");
            break;
        case "initiation":
            ctx.reply("Another charging period was already initiated.");
            break;
        case "active":
            ctx.reply("Another charging period is actively charging.");
            break;
        case "error":
            ctx.reply("An error occurred in the charging process.");
            break;
        default:
            ctx.reply("Unknown charging phase.");
    }
}

function createChargeMessage(chargeDetails) {
    const { chargingId, startingAt, endingAt, startAmountBotToken, userNameCharging, requiredAmountBotToken, targetAmountBotToken, chargingTokenMetadata } = chargeDetails;
    const startDate = new Date(startingAt);
    const endDate = new Date(endingAt);
    const formattedStart = startDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedEnd = endDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    const duration = formatDuration(endDate.getTime() - startDate.getTime());
    const description = chargingTokenMetadata.description.length > 180 ? `${chargingTokenMetadata.description.substring(0, 177)}...` : chargingTokenMetadata.description;

    let message = `<b>Charging Period #${chargingId} initiated by @${userNameCharging}.</b>\n\n`;
    message += `<b>Starts at:</b> ${formattedStart}\n`;
    message += `<b>Ends at:</b> ${formattedEnd}\n`;
    message += `<b>Duration:</b> ${duration}\n\n`;
    message += `<b>Charged Token:</b>\n<blockquote>`;
    message += `Name: ${chargingTokenMetadata.name}\n`;
    message += `Supply: ${chargingTokenMetadata.supply}\n`;
    message += `Cap: ${chargingTokenMetadata.cap}\n`;
    message += `<b>Charged: ${chargeDetails.amountCharging}</b>\n</blockquote>\n`;
    message += `<b>Tipper Tokens:</b>\n<blockquote>`;
    message += `Target: ${targetAmountBotToken}\n`;
    message += `Current: ${startAmountBotToken}\n`;
    message += `<b>Required: ${requiredAmountBotToken}</b>\n</blockquote>\n`;
    message += `The Charging Module will now accept the deposit of Tipper Tokens to complete the Charging Period.\n\n`;
    message += `Please send the required amount of <b>${requiredAmountBotToken}</b> Tipper Tokens to the Bot's address (tap to copy):\n`;
    message += `<code>${ADDRESS}</code>`;

    return message;
}

function activateChargingPeriod(chargeStatusData, chargingId) {
    // Set the charging period status to "active"
    chargeStatusData.On.status = "active";
    chargeStatusData.On.details = {
        ...chargeStatusData.On.details, // Preserve existing details
        chargingId: chargingId, // Update with the current charging ID
        // You can add or update any other relevant details here
    };

    // Write the updated charge status back to the file
    fs.writeFileSync(chargeStatusPath, JSON.stringify(chargeStatusData, null, 4), 'utf8');

    // Log the activation for debugging purposes
    logger.info(`Charging period ${chargingId} activated.`);
}

function formatDuration(milliseconds) {
    let totalSeconds = Math.floor(milliseconds / 1000);
    let days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

    return parts.join(', ');
}

function startBalanceChecks(chargeDetails, bot, db) {
    const totalDurationMs = CHARGE_DURATION_MS;
    const checkIntervalMs = totalDurationMs / 4;
    let checkCount = 0;
    const totalChecks = 4;
    const chargingId = chargeDetails.chargingId;

    console.log(`Balance checks for Charging Period #${chargingId} will occur every ${formatDuration(checkIntervalMs)} for a total of ${totalChecks} times.`);

    const initialBalance = chargeDetails.startAmountBotToken;
    const targetBalance = chargeDetails.targetAmountBotToken;
    const totalNeeded = targetBalance - initialBalance;

    function performCheck() {
        if (checkCount >= totalChecks) {
            console.log(`Maximum number of balance checks reached for Charging Period #${chargingId}.`);
            sendFinalSummary(chargeDetails, bot);
            return;
        }

        queryBotBalance(STATIC_TOKEN_COLLECTION_ID, STATIC_TOKEN_ID, STATIC_TOKEN_ADDRESS).then(currentBalance => {
            // Ensure progressMade is not negative
            const progressMade = Math.max(currentBalance - initialBalance, 0);
            const progress = createProgressBar(progressMade, totalNeeded, 10);
            const neededBalance = Math.max(targetBalance - currentBalance, 0);

            chargeDetails.balanceChecks.push({
                checkNumber: ++checkCount,
                currentBalance: currentBalance,
                neededBalance: neededBalance,
                timestamp: new Date().toISOString(),
            });

            fs.writeFileSync(path.join(__dirname, '..', 'charging', `${chargingId}.json`), JSON.stringify(chargeDetails, null, 4));

            let timeUntilNextCheckMs = checkIntervalMs * (totalChecks - checkCount);
            let updateMessage = `<b>🔋 Join the Charge! ID #${chargingId}</b>\n` +
                `<b>⏳ ${formatDuration(timeUntilNextCheckMs)} left!</b>\n\n` +
                `<b>Goal:</b> ${targetBalance} Tipper Tokens\n` +
                `<b>Current:</b> ${currentBalance} Tipper Tokens\n` +
                `<b>Required:</b> Just ${neededBalance} more!\n\n` +
                `<b>Progress:</b>\n` +
                `${progress}\n\n` +
                `<b>Support Now:</b>\n` +
                `- Send up to ${neededBalance} Tipper Tokens to: <code>${ADDRESS}</code>\n` +
                `- Avoid /tip: Keeps our momentum going forward.\n\n` +
                `<b>Reward:</b> Reach the goal & unlock an airdrop of "${chargeDetails.chargingTokenMetadata.name}" to ${chargeDetails.distribution.chargingAmount} random registered users!\n\n` +
                `<b>Let's do this!</b> Every token, every second counts. 🦾`;

            bot.telegram.sendPhoto(config.CHAT_ID, chargeDetails.chargingTokenMetadata.image, {
                caption: updateMessage,
                parse_mode: 'HTML',
            });

            if (currentBalance >= targetBalance) {
                console.log(`Target balance reached for Charging Period #${chargingId}. Proceeding to distribution phase.`);
                proceedToDistribution(chargeDetails, bot, db);
            } else if (checkCount < totalChecks) {
                setTimeout(performCheck, checkIntervalMs);
            }
        }).catch(error => {
            logger.error(`Error querying bot balance for Charging Period #${chargingId}:`, error);
            // Consider adding a retry mechanism or handling the error differently
        });
    }

    setTimeout(performCheck, checkIntervalMs);
}

async function sendFinalSummary(chargeDetails, bot) {
    const { chargingId, targetBalance, balanceChecks } = chargeDetails;
    const currentBalance = balanceChecks.slice(-1)[0].currentBalance;

    let message = '';

    if (currentBalance >= targetBalance) {
        message = `🎉 Charging ID #${chargingId}: Goal Achieved! 🎉\n\n` +
            `✅ We hit our ${targetBalance} Tipper Tokens goal due to your incredible support!\n\n` +
            `👏 Shoutout to everyone who contributed. This win is ours, together!\n\n` +
            `What’s Next?\n` +
            `Inspired to go again? Initiate a new Charging Period anytime. Our unity makes us unstoppable!\n\n` +
            `Together, we're limitless! 🦾`;

        // Update CHGX.json file to reflect the successful status
        const chargeDetailsPath = path.join(__dirname, '..', 'charging', `${chargingId}.json`);
        chargeDetails.status = "completed";
        fs.writeFileSync(chargeDetailsPath, JSON.stringify(chargeDetails, null, 4));
    } else {
        message = `❌ Charging ID #${chargingId}: Goal Not Met. 🔍\n\n` +
            `⌛ We faced a challenge this time and didn’t meet our ${targetBalance} Tipper Tokens goal.\n\n` +
            `Next Steps:\n` +
            `- Tipper Tokens: In line with the guidelines, all contributed Tipper Tokens will remain with the bot.\n` +
            `- A New Chance: Our community is defined by perseverance and unity. We have the opportunity to initiate another charging period for "${chargeDetails.chargingTokenMetadata.name}" whenever we're ready!\n\n` +
            `Forward Together:\n` +
            `Remember, each attempt teaches us something new. It’s through these experiences we grow stronger and more connected.\n\n` +
            `🔄 Onwards:\n` +
            `Feeling motivated to lead the charge anew? Let’s unite for another round, where our collective efforts can lead to triumph!\n\n` +
            `Unity in Effort: Challenges are merely stepping stones on our journey together. 🦾`;

        // Update CHGX.json file to reflect the failed status
        const chargeDetailsPath = path.join(__dirname, '..', 'charging', `${chargingId}.json`);
        chargeDetails.status = "failed";
        fs.writeFileSync(chargeDetailsPath, JSON.stringify(chargeDetails, null, 4));
    }

    // Update the charge_status.json file to reset the charging system status in both cases
    const chargeStatusPath = path.join(__dirname, '..', 'charging', 'charge_status.json');
    let chargeStatusData = JSON.parse(fs.readFileSync(chargeStatusPath, 'utf8'));
    chargeStatusData.On.status = "idle";
    chargeStatusData.On.details = { chargingId: "", startTime: "", endTime: "" };
    fs.writeFileSync(chargeStatusPath, JSON.stringify(chargeStatusData, null, 4));

    // Assuming you have a way to send the message to a chat or user
    // For example, using bot.telegram.sendMessage if using Telegraf with Telegram
    // await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    return message; // You might not need to return the message if it's already sent
}

async function proceedToDistribution(chargeDetails, bot, db) {
    console.log("Distributing tokens...");

    try {
        const limit = Math.min(chargeDetails.distribution.chargingAmount, 200);
        const usersQuery = `SELECT telegram_id, address, username FROM users ORDER BY RANDOM() LIMIT ?`;
        const users = await db.allAsync(usersQuery, [limit]) || [];

        if (users.length > 0) {
            const dmPromises = users.map(async (user) => {
                addToQueue({
                    collectionId: chargeDetails.collectionIdCharging,
                    tokenId: chargeDetails.tokenIdCharging,
                    recipientAddress: user.address,
                    recipientUsername: user.username,
                });
                // Assuming processQueue is modified to always return an array
                const transactionResults = await processQueue() || [];
                const imagePath = chargeDetails.chargingTokenMetadata.image; // Ensure this is correctly set to the image path or URL
                const message = "Congratulations! You've received an airdrop.";
                try {
                    // Correct method call for sending a photo with Telegraf
                    await bot.telegram.sendPhoto(user.telegram_id, { source: imagePath }, { caption: message, parse_mode: 'Markdown' });
                } catch (error) {
                    console.error("Error sending DM:", error);
                }
            });

            await Promise.all(dmPromises);
            console.log("DMs sent to all queued users.");
        } else {
            console.log("No users found for distribution.");
        }

        // Update and save the distribution status
        const chargeStatusPath = path.join(__dirname, '..', 'charging', 'charge_status.json');
        const chargeStatusData = JSON.parse(fs.readFileSync(chargeStatusPath, 'utf8'));
        chargeStatusData.On.status = "distribution";
        chargeStatusData.On.details = {
            chargingId: chargeDetails.chargingId,
            startTime: new Date().toISOString(),
            endTime: "" // Assuming it's set later
        };
        fs.writeFileSync(chargeStatusPath, JSON.stringify(chargeStatusData, null, 4));

        // Notify channel about the distribution phase
        const successMessage = `✅ Charging ID #${chargeDetails.chargingId}: Goal Achieved! 🎉\n\n` +
            `⏳ Goal Surpassed Ahead of Time!\n\n` +
            `We hit our ${chargeDetails.targetAmountBotToken} Tipper Tokens goal due to your incredible support!\n\n` +
            `🏆 Reward Distribution:\n` +
            `- "${chargeDetails.chargingTokenMetadata.name}" Airdrop to ${users.length} lucky users starts now! Winners will receive a DM shortly.\n` +
            `- Next Steps: Watch your wallets and celebrate with us when your airdrop arrives!\n\n` +
            `👏 Shoutout to @${chargeDetails.userNameCharging} for initiating this, and thanks to everyone who contributed. This win is ours, together!\n\n` +
            `What’s Next?\n` +
            `Inspired to go again? Initiate a new Charging Period anytime. Our unity makes us unstoppable!\n\n` +
            `Together, we're limitless! 🦾`;
        await bot.telegram.sendMessage(config.CHAT_ID, successMessage, { parse_mode: 'Markdown' });

        console.log("Distribution completed.");

        // Update CHGX.json file
        const chargeDetailsPath = path.join(__dirname, '..', 'charging', `${chargeDetails.chargingId}.json`);
        chargeDetails.status = "completed"; // Update status to completed
        fs.writeFileSync(chargeDetailsPath, JSON.stringify(chargeDetails, null, 4));

        // Update charge_status.json file
        //const chargeStatusData = JSON.parse(fs.readFileSync(chargeStatusPath, 'utf8'));
        chargeStatusData.On.status = "idle"; // Change status to idle
        chargeStatusData.On.details = {
            chargingId: "", // Clear chargingId
            startTime: "", // Clear startTime
            endTime: "" // Clear endTime
        };
        fs.writeFileSync(chargeStatusPath, JSON.stringify(chargeStatusData, null, 4));

    } catch (error) {
        console.error("Error during distribution:", error);
    }
}

module.exports = { chargeCommand };