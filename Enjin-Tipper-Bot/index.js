// Importing central dependencies

const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const db = require('./database/db');  // Importing the db instance
const { BOT_TOKEN, BOT_OWNER_ID, DATABASE_PATH } = require('./config/config');
const { initializeNonce, synchronizeNonce } = require('./nonceManager');
const { processQueue } = require('./transactionQueue');
const updateWhitelist = require('./helpers/updateWhitelist');
const { loadWhitelist } = require('./helpers/whitelist');

// Importing local dependencies
const bot = new Telegraf(BOT_TOKEN);
const WHITELIST_UPDATE_INTERVAL = 180000; // 3 minutes in milliseconds
const healthCheckInterval = 900000; // 15 minutes in milliseconds
const eventEmitter = require('./helpers/eventEmitter'); // Adjust the path as needed

// Initialize the logger
logger.info('🤖 Bot initializing...');

// Initialize nonce for the first time after the bot starts
initializeNonce().then(() => {
    logger.info('✅ Nonce initialized successfully.');
}).catch((error) => {
    logger.error(`❌ Failed to initialize nonce: ${error.message}`);
    process.exit(1); // It's critical to stop the application if the nonce can't be initialized
});

// Core bot command handlers
const registerCommand = require('./commands/registerCommand');
const setbioCommand = require('./commands/setbioCommand');
const profileCommand = require('./commands/profileCommand');
const tipCommand = require('./commands/tipCommand');
const statsCommand = require('./commands/statsCommand');
const myAddressCommand = require('./commands/myAddressCommand');
const healthCommand = require('./commands/healthCommand');
const rankingCommand = require('./commands/rankingCommand');
const unregisterCommand = require('./commands/unregisterCommand');
const randomTipCommand = require('./commands/randomtipCommand');
const tiphistoryCommand = require('./commands/tiphistoryCommand');
const leaderboardCommand = require('./commands/leaderboardCommand');
const rankCommand = require('./commands/rankCommand');
const setTipsCommand = require('./commands/setTipsCommand');
const helpCommand = require('./commands/helpCommand');
const stipCommand = require('./commands/stipCommand');
const showCommand = require('./commands/showCommand');
const degenCommand = require('./commands/degenCommand'); // NEW
const infoCommand = require('./commands/infoCommand'); // NEW
const legacyCommand = require('./commands/legacyCommand'); // NEW
const { chargeCommand } = require('./commands/chargeCommand');

// Helper functions and utilities
const badWordsFilter = require('./helpers/badWordsFilter');
const showUserProfile = require('./helpers/showUserProfile');
const helpFunctions = require('./helpers/helpFunctions');
const { registerGuideActions } = require('./helpers/guideActions');
const nftSender = require('./nftSender');
const nftBatchSender = require('./nftBatchSender');
const queryCollection = require('./helpers/queryCollection'); // NEW
const queryToken = require('./helpers/queryToken'); // NEW
const queryAccountData = require('./helpers/queryAccountData'); // NEW

// Importing God mode and administrative features
const godModeCommand = require('./commands/godModeCommand');
const { ADMIN_STATES, adminState } = require('./godmode/adminStates'); // Correct import path
const resetTips = require('./godmode/godModeResetTips');
const resetRanking = require('./godmode/godModeResetRanking');
const broadcastMessage = require('./godmode/godModeBroadcast');
const searchUser = require('./godmode/godModeSearchUser');
const { showStatistics } = require('./godmode/godModeShowStatistics');
const dropTokenToAll = require('./godmode/godModeDropToken')(bot);

// Scheduled tasks
const scheduledJob = require('./scheduledJobs/scheduledJob');
const scheduledJob2 = require('./scheduledJobs/scheduledJob2');
const scheduledJob3 = require('./scheduledJobs/scheduledJob3');
const scheduledJob4 = require('./scheduledJobs/scheduledJob4');
const scheduledJob5 = require('./scheduledJobs/scheduledJob5');

// Registering command handlers
bot.command('register', (ctx) => registerCommand(ctx, db));
bot.command('setbio', (ctx) => setbioCommand(ctx, db));
bot.command('profile', (ctx) => profileCommand(ctx, db));
bot.command('stats', (ctx) => statsCommand(ctx, db));
bot.command('myaddress', (ctx) => myAddressCommand(ctx, db));
bot.command('health', (ctx) => healthCommand(ctx));
bot.command('ranking', (ctx) => rankingCommand(ctx, db));
bot.command('unregister', (ctx) => unregisterCommand(ctx, db));
bot.command('tiphistory', (ctx) => tiphistoryCommand(ctx, db));
bot.command('leaderboard', (ctx) => leaderboardCommand(ctx, db));
bot.command('god', (ctx) => godModeCommand(bot, ctx));
bot.command('rank', (ctx) => rankCommand(ctx, db, bot));
bot.command('settips', (ctx) => setTipsCommand(ctx, db));
bot.command('help', (ctx) => helpCommand(ctx, db));
bot.command('show', (ctx) => showCommand(ctx, db));
bot.command('display', (ctx) => showCommand(ctx, db));
//bot.command('degen', (ctx) => degenCommand(ctx, db));
bot.command('legacy', (ctx) => legacyCommand(ctx, db));
bot.command('info', (ctx) => infoCommand(ctx, bot));
bot.command('charge', (ctx) => chargeCommand(ctx, db, bot));

// Tip command handler
bot.command('tip', (ctx) => tipCommand(ctx, db));
bot.command('randomtip', (ctx) => randomTipCommand(ctx, db));
bot.command('rtip', (ctx) => randomTipCommand(ctx, db));
bot.command('stip', (ctx) => stipCommand(ctx, db, bot));

// Bot actions
bot.action('reset_tips', (ctx) => resetTips(ctx, db));
bot.action('reset_ranking', (ctx) => resetRanking(ctx, db));
bot.action('broadcast_message', (ctx) => broadcastMessage(ctx, ADMIN_STATES));
bot.action('search_user', (ctx) => searchUser(ctx, adminState, ADMIN_STATES));
bot.action('drop_token_to_all', (ctx) => dropTokenToAll(ctx, db));
bot.action('show_statistics', (ctx) => showStatistics(ctx, ADMIN_STATES));

// Start the scheduled jobs
scheduledJob.startScheduledJob(bot);
scheduledJob2.startScheduledJob2(bot);
scheduledJob3.startScheduledJob3(bot);
scheduledJob4.startScheduledJob4(bot);
scheduledJob5.startScheduledJob5(bot);
registerGuideActions(bot);

// Registering middlewares
const setupGodModeMiddleware = require('./godmode/godModeMiddleware')(bot, db);

// Initialize transaction processing
// Set up the timer to process the transaction queue every minute
setInterval(async () => {
    try {
        await synchronizeNonce(); // Synchronize the nonce with the blockchain
        logger.info('✅ Nonce synchronized successfully.');

        await processQueue(); // Process the queue
        // Emit the custom event to signal that the queue is processed
        eventEmitter.emit('transactionQueueProcessed');
        logger.info('✅ Queue processed successfully.');
    } catch (error) {
        logger.error(`❌ Error during queue processing or nonce synchronization: ${error.message}`);
        // Implement any additional error handling logic here. Depending on the error's nature, 
        // you might want to implement retry logic, alert administrators, or take corrective actions.
    }
}, 60000);

// Set up the timer to update the whitelist every 15 minutes
setInterval(async () => {
    try {
        await updateWhitelist();
        loadWhitelist();
        logger.info('✅ Whitelist updated and loaded successfully');
    } catch (error) {
        logger.error(`❌ Error updating and loading whitelist:', error`);
    }
}, WHITELIST_UPDATE_INTERVAL);

// Message handler for bad words and user registration
bot.on('message', async (ctx) => {
    // Check if the message is in a group or supergroup chat
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        return; // Exit the handler if it's not a group or supergroup chat
    }

    // Ensure the message has a text property before proceeding
    if (!ctx.message || !ctx.message.text) {
        return; // Exit if there's no text in the message
    }

    // Check if the user is registered
    const userId = ctx.from.id;
    let user;
    try {
        user = await new Promise((resolve, reject) => {
            db.get("SELECT warnings FROM users WHERE telegram_id = ?", [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        // If the user is not registered, send a friendly message and delete their message
        if (!user) {
            const username = ctx.from.username ? `@${ctx.from.username}` : `User ${ctx.from.id}`;
            const registrationMessage = `Hey ${username}, and welcome!🎈\n\nTo get started, simply DM /register (Your Enjin Matrixchain Address) to @NFT_Tipper_BOT.\n\nExcited to have you with us! 🙌`;
            await ctx.reply(registrationMessage);

            // Delete the message from the chat
            try {
                await ctx.deleteMessage();
            } catch (err) {
                logger.error(`❌ Failed to delete message: ${err}`);
            }
            return;
        }
    } catch (err) {
        logger.error(`❌ Database select error: ${err}`);
        return; // Exit on database error
    }

    const messageText = ctx.message.text.toLowerCase();

    // Check for bad words
    for (const word of badWordsFilter) {
        if (messageText.includes(word)) {
            // Delete the message containing the bad word
            try {
                await ctx.deleteMessage();
            } catch (err) {
                logger.error(`❌ Failed to delete message: ${err}`);
                if (err.description === "Bad Request: message to delete not found") {
                    await ctx.reply("I've detected some inappropriate language, but I need to be a group admin to take action. Make me an admin to help keep the chat clean! 🤖");
                }
            }

            // Increase the warning count for the user and log appropriately
            const newWarnings = (user.warnings || 0) + 1;
            try {
                await new Promise((resolve, reject) => {
                    db.run("UPDATE users SET warnings = ? WHERE telegram_id = ?", [newWarnings, userId], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(this.lastID);
                        }
                    });
                });
                logger.info(`⚠️ User @${ctx.from.username} warning count updated: ${newWarnings}`);
            } catch (err) {
                logger.error(`❌ Database update error: ${err}`);
            }

            if (newWarnings >= 5) {
                // Kick the user after 5 warnings
                try {
                    await ctx.kickChatMember(ctx.chat.id, userId);
                    await ctx.reply(`User @${ctx.from.username} has been kicked for repeated violations. 🛡️`);
                } catch (kickError) {
                    logger.error(`❌ Failed to kick user: ${kickError}`);
                }
            } else {
                await ctx.reply(`@${ctx.from.username}, please refrain from using inappropriate language. Warning ${newWarnings}/5.`);
            }

            break; // Exit the loop after finding a bad word
        }
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error(`❌ Unhandled Promise Rejection: ${error.message}`);
});

// Handle shutdown signals gracefully
process.on('SIGINT', () => {
    logger.info('⚠️  Bot shutdown requested (SIGINT), shutting down...');
    // Perform any necessary cleanup here
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('⚠️ Bot shutdown requested (SIGTERM), shutting down...');
    // Perform any necessary cleanup here
    process.exit(0);
});

// Export the bot and db objects
module.exports = {
    bot,
    db,
    eventEmitter,
};

// Set up the health check
const healthCheck = () => {
    logger.info('🔍 Performing Health Check...');

    // Example of a health check: Check if the database is connected
    db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            logger.error(`❌ Health Check Failed: Database connection error: ${err.message}`);
        } else {
            logger.info(`✅ Health Check: Database connection successful. Detected tables: ${row.name}`);

            // Perform a database backup
            const dbPath = path.join(__dirname, 'database', 'users.db'); // UPDATE with your actual database path
            const backupPath = path.join(__dirname, 'database-backup', `backup-${Date.now()}.db`);

            // Create backup directory if it doesn't exist
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            fs.copyFile(dbPath, backupPath, (err) => {
                if (err) {
                    logger.error(`❌ Database backup failed: ${err.message}`);
                } else {
                    logger.info(`🎉 Database backup successful: Backup created!`);
                }
            });
        }
    });

    // Add other health checks as needed...

    logger.info('✅ Health Check completed: All systems operational');
};

// Schedule the health check
setInterval(healthCheck, healthCheckInterval);

// Launch the bot with error handling
(async () => {
    try {
        // Update the whitelist and load it into memory before starting the bot
        loadWhitelist();
        logger.info('✅ Whitelist updated and loaded successfully');

        // Launch the bot
        await bot.launch();
        logger.info('🚀 Bot initialized successfully.');
        logger.info('All command handlers are active...');
        logger.info('All scheduled tasks are active...');
        logger.info('Listening for incoming messages...');
    } catch (error) {
        logger.error(`❌ Error launching the bot: ${error.message}`);
        process.exit(1); // Exit the process with an error code
    }
})();