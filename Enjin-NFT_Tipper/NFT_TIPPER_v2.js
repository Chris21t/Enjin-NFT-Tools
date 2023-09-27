const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const winston = require('winston');
const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const { decryptSeed } = require('./encryptionUtil');
const config = require('./config.json');
const BOT_TOKEN = 'YOUR_BOT_TOKEN';
let lastUsedNonce = null;
const axios = require('axios');

const db = new sqlite3.Database('users.db');
db.serialize(() => {
    // Create or modify the "users" table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            telegram_id TEXT PRIMARY KEY,
            address TEXT UNIQUE,
            username TEXT,
            tip_count INTEGER DEFAULT 0,
            warnings INTEGER DEFAULT 0,
            last_tip_time INTEGER DEFAULT 0,
            hourly_tip_count INTEGER DEFAULT 0,
            tip_count_received INTEGER DEFAULT 0,
            tip_count_sent INTEGER DEFAULT 0,
            registration_date INTEGER DEFAULT 0,
            bio TEXT
        )
    `);

    // Check if the columns exist, and if not, add them
    db.all("PRAGMA table_info(users)", [], (err, rows) => {
        if (err) {
            console.error("Failed to fetch table info:", err);
            return;
        }

        const hasLastTipTime = rows.some(row => row.name === "last_tip_time");
        const hasHourlyTipCount = rows.some(row => row.name === "hourly_tip_count");
        const hasWarnings = rows.some(row => row.name === "warnings");

        if (!hasLastTipTime) {
            db.run("ALTER TABLE users ADD COLUMN last_tip_time INTEGER DEFAULT 0");
        }

        if (!hasHourlyTipCount) {
            db.run("ALTER TABLE users ADD COLUMN hourly_tip_count INTEGER DEFAULT 0");
        }

        if (!hasWarnings) {
            db.run("ALTER TABLE users ADD COLUMN warnings INTEGER DEFAULT 0");
        }
    });

    // Create the "profiles" table
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            telegram_id TEXT PRIMARY KEY,
            bio TEXT
        )
    `);
});

const { promisify } = require('util');

db.runAsync = promisify(db.run).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.allAsync = promisify(db.all).bind(db);

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'transaction.log' })
    ]
});

async function sendNFT(address, username) {
    try {
        const SEED_PHRASE = decryptSeed();

        const wsProvider = new WsProvider(config.network.uri);
        const api = await ApiPromise.create({ provider: wsProvider });
        const keyring = new Keyring({ type: "sr25519" });
        keyring.setSS58Format(config.network.format);

        const SENDER = keyring.addFromMnemonic(SEED_PHRASE);
        let { nonce } = await api.query.system.account(SENDER.publicKey);

        // Convert the nonce to a number, if it's not already
        if (typeof nonce !== 'number') {
            if (nonce.toNumber) {
                nonce = nonce.toNumber();
            } else {
                nonce = parseInt(nonce);
            }
        }

        // Use the higher nonce: either the one from the blockchain or the cached one
        if (lastUsedNonce !== null && nonce <= lastUsedNonce) {
            nonce = lastUsedNonce + 1;
        }

        const extrinsic = api.tx.multiTokens.transfer(address, config.collectionId, {
            Simple: {
                tokenId: config.tokenId,
                amount: 1,
                keepAlive: true
            }
        });
        await extrinsic.signAndSend(SENDER, { nonce: nonce });

        // Update the cached nonce
        lastUsedNonce = nonce;

        logger.info(`Sent 1 of tokenId: ${config.tokenId} from collection: ${config.collectionId} to recipient: ${username}`);

        wsProvider.disconnect();

        return true;
    } catch (error) {
        logger.error(`Error sending NFT: ${error.message}`);
        return false;
    }
}

// Telegram Bot Integration
const bot = new Telegraf(BOT_TOKEN);

bot.command('register', (ctx) => {
    // Check if the command is used in a private chat
    if (ctx.chat.type !== 'private') {
        ctx.reply('Please register by sending the /register command to me in a private message.');
        return;
    }

    const rawAddress = ctx.message.text.split(' ')[1];
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    const registrationDate = Math.floor(Date.now() / 1000); // Current timestamp in seconds

    if (rawAddress) {
        // Check if the address is already registered
        db.get("SELECT address FROM users WHERE address = ?", [rawAddress], (err, row) => {
            if (err) {
                ctx.reply('An error occurred while checking the address. Please try again.');
                return;
            }
            if (row) {
                ctx.reply('This address is already registered by another user.');
                return;
            }

            // Check if the address starts with "ef"
            const address = rawAddress.trim();
            if (!address.startsWith("ef")) {
                ctx.reply('Invalid address. Please provide an address that starts with "ef".');
                return;
            }

            // If not, proceed with the registration
            db.run("INSERT OR IGNORE INTO users (telegram_id, address, username, registration_date) VALUES (?, ?, ?, ?)", [userId, address, username, registrationDate], function(err) {
                if (err) {
                    ctx.reply('Failed to register. Please try again.');
                    console.error(err); // Print the error to the console for debugging
                    return;
                }
                ctx.reply('Successfully registered!');
            });
        });
    } else {
        ctx.reply('Please provide a valid address.');
    }
});

bot.command('setbio', async (ctx) => {
    const userId = ctx.from.id;
    const bio = ctx.message.text.split(' ').slice(1).join(' '); // Extract the bio text from the command

    // Check if the user is registered
    const isUserRegistered = await isRegistered(userId);

    if (!isUserRegistered) {
        ctx.reply('You need to register your Enjin Matrixchain address using /register ADDRESS before setting your bio.');
        return;
    }

    if (bio) {
        // Update the user's bio in the database
        db.run("INSERT OR REPLACE INTO profiles (telegram_id, bio) VALUES (?, ?)", [userId, bio], function (err) {
            if (err) {
                ctx.reply('Something is off. It failed to set your bio. Please try again.');
                console.error(err); // Print the error to the console for debugging
                return;
            }
            ctx.reply('Your bio has been updated successfully!');
        });
    } else {
        ctx.reply('Please provide a valid bio text. Usage: /setbio [Be creative and write something funny!]');
    }
});

// Function to check if a user is registered
async function isRegistered(userId) {
    // Check if the user exists in the 'users' table or implement your registration check logic
    const user = await db.getAsync("SELECT * FROM users WHERE telegram_id = ?", [userId]);
    return !!user; // Returns true if the user exists, false otherwise
}

bot.command('profile', async (ctx) => {
    const userId = ctx.from.id;

    // Check if the user is registered
    const isUserRegistered = await isRegistered(userId);

    if (!isUserRegistered) {
        ctx.reply('You need to register your Enjin Matrixchain address using /register ADDRESS before you can use the /profile command.');
        return;
    }

    // Fetch the user's profile from the users table
    const userProfile = await db.getAsync("SELECT username, tip_count_received, tip_count_sent, registration_date FROM users WHERE telegram_id = ?", [userId]);

    if (userProfile) {
        // Log the retrieved user profile
        console.log("Retrieved User Profile:", userProfile);

        const { username, tip_count_received, tip_count_sent, registration_date } = userProfile;

        // Fetch the user's bio from the profiles table
        const userBio = await db.getAsync("SELECT bio FROM profiles WHERE telegram_id = ?", [userId]);
        const bioText = userBio ? userBio.bio : "No bio set";

        // Log the bio variable
        console.log("Retrieved Bio:", bioText);

        const bioInfo = `**Telegram Name**: @${username || 'N/A'}\n`
                     + `**Tips Received**: ${tip_count_received || 0}\n`
                     + `**Tips Sent**: ${tip_count_sent || 0}\n`
                     + `**Registration Date**: ${new Date(registration_date * 1000).toLocaleDateString()}\n`
                     + `**Bio**: ${bioText}`;

        ctx.reply(`User Profile:\n${bioInfo}`);
    } else {
        ctx.reply("You haven't set up a profile yet. Use `/setbio` to set your bio.");
    }
});

bot.command('tip', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only admins can use the /tip command in groups.');
            return;
        }
    }

    const senderUserId = ctx.from.id; // The user sending the tip
    const recipientUserId = ctx.message.reply_to_message ? ctx.message.reply_to_message.from.id : null; // The user receiving the tip

    if (!recipientUserId) {
        ctx.reply('Please reply to a user\'s message to send them a tip.');
        return;
    }

    // Get the sender's address from the database
    db.get("SELECT address, username FROM users WHERE telegram_id = ?", [senderUserId], async (err, senderRow) => {
        if (err || !senderRow || !senderRow.address) {
            ctx.reply('Your address is not found. Make sure you are registered and have set your address.');
            return;
        }

        // Get the recipient's address and username from the database
        db.get("SELECT address, username FROM users WHERE telegram_id = ?", [recipientUserId], async (err, recipientRow) => {
            if (err || !recipientRow || !recipientRow.address) {
                ctx.reply('Recipient\'s address is not found. Make sure the recipient is registered and has set their address.');
                return;
            }

            const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
            const oneHour = 3600; // seconds

            // Check if the sender's last tip was more than an hour ago
            if (currentTime - senderRow.last_tip_time > oneHour) {
                // Reset the hourly tip count if it's been more than an hour
                db.run("UPDATE users SET hourly_tip_count = 0 WHERE telegram_id = ?", [senderUserId]);
                senderRow.hourly_tip_count = 0;
            }

            // Check if the sender has exceeded the hourly tip limit
            if (senderRow.hourly_tip_count >= 10) {
                ctx.reply('You have reached the maximum tip limit of 10 per hour. Please wait before tipping again.');
                return;
            }

            const success = await sendNFT(recipientRow.address);

            if (success) {
                const recipientUsername = recipientRow.username || `user with ID ${recipientUserId}`;
                ctx.reply(`A Bag was sent successfully to @${recipientUsername}!`);

                // Update the tip count, last tip time, and hourly tip count for the sender in the database
                db.run("UPDATE users SET tip_count = tip_count + 1, last_tip_time = ?, hourly_tip_count = hourly_tip_count + 1, tip_count_sent = tip_count_sent + 1 WHERE telegram_id = ?", [currentTime, senderUserId]);

                // Update the tip count for the recipient in the database
                db.run("UPDATE users SET tip_count_received = tip_count_received + 1 WHERE telegram_id = ?", [recipientUserId]);
            } else {
                ctx.reply('Failed to send A Bag. Please try again later.');
            }
        });
    });
});


bot.command('stats', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only admins can use the /stats command in groups.');
            return;
        }
    }

    db.all("SELECT COUNT(*) as totalUsers FROM users", [], (err, rows) => {
        if (err) {
            ctx.reply('Failed to fetch stats. Please try again later.');
            return;
        }
        const totalUsers = rows[0].totalUsers;
        ctx.reply(`Total Registered Users: ${totalUsers}`);
    });
});

bot.command('myaddress', (ctx) => {
    const userId = ctx.from.id;
    db.get("SELECT address FROM users WHERE telegram_id = ?", [userId], (err, row) => {
        if (err || !row) {
            ctx.reply('You are not registered or an error occurred.');
            return;
        }
        ctx.reply(`Your registered address is: ${row.address}`);
    });
});

bot.command('health', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only admins can use the /health command in groups.');
            return;
        }
    }

    const wsProvider = new WsProvider(config.network.uri);
    const api = await ApiPromise.create({ provider: wsProvider });

    if (api.isConnected) {
        ctx.reply('The connection to the Enjin Matrixchain node is healthy.');
    } else {
        ctx.reply('The connection to the Enjin Matrixchain node seems to be down.');
    }

    wsProvider.disconnect();
});

bot.command('ranking', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only group chat administrators can use the /ranking command.');
            return;
        }
    }

    // Fetch the tip ranking from the database
    try {
        const rows = await db.allAsync("SELECT telegram_id, tip_count_received, username FROM users ORDER BY tip_count_received DESC");

        let rankingMessage = '🌠 *Top Tip Receiver* 🌠\n\n';

        // Loop through the rows and create the ranking message
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const usernameDisplay = `@${(row.username || 'Unknown').replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&')}`;
            rankingMessage += `${index + 1}. ${usernameDisplay} - Tips Received: ${row.tip_count_received}\n`;
        }

        ctx.replyWithMarkdown(rankingMessage);
    } catch (dbError) {
        console.error('Error fetching ranking from database:', dbError.message);
        ctx.reply('Failed to fetch ranking. Please try again later.');
    }
});

bot.command('unregister', (ctx) => {
    db.run("DELETE FROM users WHERE telegram_id = ?", [ctx.from.id], (err) => {
        if (err) {
            ctx.reply('Failed to unregister. Please try again.');
            return;
        }
        ctx.reply('Successfully unregistered!');
    });
});

bot.command('randomtip', async (ctx) => {
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    const oneHour = 3600; // seconds

    // Fetch the sender's last tip time and hourly tip count
    const senderData = await db.getAsync("SELECT last_tip_time, hourly_tip_count FROM users WHERE telegram_id = ?", [ctx.from.id]);

    if (!senderData) {
        ctx.reply("You are not registered. Please register first using the /register command.");
        return;
    }

    // Check if the last tip was more than an hour ago
    if (currentTime - senderData.last_tip_time > oneHour) {
        // Reset the hourly tip count if it's been more than an hour
        db.run("UPDATE users SET hourly_tip_count = 0 WHERE telegram_id = ?", [ctx.from.id]);
        senderData.hourly_tip_count = 0;
    }

    // Check if the user has exceeded the hourly tip limit
    if (senderData.hourly_tip_count >= 10) {
        ctx.reply('You have reached the maximum tip limit of 10 per hour. Please wait before tipping again.');
        return;
    }

    const rows = await db.allAsync("SELECT telegram_id, address, username FROM users WHERE telegram_id != ?", [ctx.from.id]);
    
    if (rows.length === 0) {
        ctx.reply("Sorry, there are no other users to send a random tip to.");
        return;
    }

    const randomUser = rows[Math.floor(Math.random() * rows.length)];

    const success = await sendNFT(randomUser.address, randomUser.telegram_id);
    if (success) {
        const recipientDisplay = randomUser.username ? `@${randomUser.username}` : `User with ID: ${randomUser.telegram_id}`;
        ctx.reply(`NFT sent successfully to ${recipientDisplay}!`);

        // Update the tip count, last tip time, and hourly tip count for the sender in the database
        db.run("UPDATE users SET tip_count = tip_count + 1, last_tip_time = ?, hourly_tip_count = hourly_tip_count + 1 WHERE telegram_id = ?", [currentTime, ctx.from.id]);
    } else {
        ctx.reply('Failed to send NFT. Please try again later.');
    }
});

bot.command('tiphistory', (ctx) => {
    db.get("SELECT tip_count FROM users WHERE telegram_id = ?", [ctx.from.id], (err, row) => {
        if (err || !row) {
            ctx.reply('Error fetching your tip history.');
            return;
        }
        ctx.reply(`You have sent a total of ${row.tip_count} tips.`);
    });
});

bot.command('leaderboard', async (ctx) => {
    const escapeMarkdown = (str) => str.replace(/_/g, "\\_");
    const rows = await db.allAsync("SELECT username, tip_count_sent FROM users ORDER BY tip_count_sent DESC LIMIT 10");
    let leaderboardMessage = '🏆 *Top 10 Tip Leaderboard* 🏆\n\n';
    rows.forEach((row, index) => {
        const escapedUsername = escapeMarkdown(row.username || 'Unknown');
        leaderboardMessage += `${index + 1}. @${escapedUsername} - Tips Sent: ${row.tip_count_sent}\n`;
    });
    ctx.replyWithMarkdown(leaderboardMessage);
});

bot.command('help', (ctx) => {
    // Ensure that the command works only in private chats (DMs)
    if (ctx.chat.type === 'private') {
        displayMainHelp(ctx);
    } else {
        ctx.reply('Please contact me in direct messages for the help guide.');
    }
});

// Function to create a consistent guide keyboard
function createGuideKeyboard(additionalButtons) {
    let keyboard = [];
    if (additionalButtons) {
        keyboard.push([additionalButtons]);
    }
    keyboard.push([Markup.button.callback('⬅️ Back to Help', 'RETURN_TO_MAIN_HELP')]);
    return Markup.inlineKeyboard(keyboard);
}

// Main Help Display Function
function displayMainHelp(ctx) {
    const helpMessage = `
📘 **Bag Tipper Help Guide** 📘

Welcome to the Bag Tipper! This bot allows you to tip Bag NFTs in your Telegram chat. Experience the prowess of the Enjin Matrixchain with seamless tipping!

Choose a section to learn more.
    `;

    const helpKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Getting Started', 'START_GUIDE')],
        [Markup.button.callback('🎁 Tipping Guide', 'TIP_GUIDE')],
        [Markup.button.callback('📌 Manage Profile & Bio', 'PROFILE_BIO')],
        [Markup.button.callback('🛡️ Channel Rules & Moderation', 'MODERATION_GUIDE')],
        [Markup.button.url('🌐 Join our NFT Community', 'https://x.com/NFT_Enterprise')]
    ]);

    ctx.replyWithMarkdown(helpMessage, helpKeyboard);
}

bot.action('START_GUIDE', (ctx) => {
    const startGuide = `
🚀 *Getting Started with Bag Tipper*:
1. Start your journey with /start.
2. Link your Enjin address with /register [address].
3. Confirm your linked address with /myaddress.
4. Overview with /help.
    `;
    ctx.replyWithMarkdown(startGuide, createGuideKeyboard());
});

bot.action('TIP_GUIDE', (ctx) => {
    const tipGuide = `
🎁 *Tipping Guide*:
1. Reply and use /tip to tip.
2. Use /randomtip for a fun surprise.
3. Check your tipping records with /tiphistory.
4. Find top tippers with /ranking and /leaderboard.
    `;
    ctx.replyWithMarkdown(tipGuide, createGuideKeyboard());
});

bot.action('PROFILE_BIO', (ctx) => {
    const profileBio = `
📌 *Profile & Bio Management*:
1. Set your bio with /setbio [Your bio].
2. Check your profile with /profile.
3. Start anew with /unregister.
    `;
    ctx.replyWithMarkdown(profileBio, createGuideKeyboard());
});

bot.action('MODERATION_GUIDE', (ctx) => {
    const moderationGuide = `
🛡️ *Channel Rules & Moderation*:
1. **Registration**: Only registered users can chat. Link Telegram to Enjin Matrixchain on join.
2. **Word Filter**: We maintain chat quality. Filters are adjustable in a separate config file.
3. **Warning System**: Breaches result in warnings. Excess warnings lead to removal.
    `;
    ctx.replyWithMarkdown(moderationGuide, createGuideKeyboard());
});

bot.action('RETURN_TO_MAIN_HELP', displayMainHelp);


const fs = require('fs');
const badWords = fs.readFileSync('badwords.txt', 'utf-8').split('\n').map(word => word.trim().toLowerCase());

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
    const user = await db.getAsync("SELECT warnings FROM users WHERE telegram_id = ?", [userId]);

    // If the user is not registered, send a friendly message and delete their message
    if (!user) {
        const username = ctx.from.username ? `@${ctx.from.username}` : `User ${ctx.from.id}`;
        const registrationMessage = `Hello, ${username}! Welcome to the chat. To participate fully and protect our community, please register using the /register command in my DMs. Once registered, you'll be able to chat in the group. 😊`;
        ctx.reply(registrationMessage);

        // Delete the message from the chat
        return ctx.deleteMessage();
    }

    const messageText = ctx.message.text.toLowerCase();

    // Check for bad words
    for (const word of badWords) {
        if (messageText.includes(word)) {
            // Delete the message containing the bad word
            try {
                await ctx.deleteMessage();
            } catch (err) {
                console.error("Failed to delete message:", err.message);
                if (err.description === "Bad Request: message to delete not found") {
                    ctx.reply("I've detected some inappropriate language, but I need to be a group admin to take action. Make me an admin to help keep the chat clean! 🤖");
                }
            }

            // Increase the warning count for the user
            const newWarnings = (user.warnings || 0) + 1;
            await db.runAsync("UPDATE users SET warnings = ? WHERE telegram_id = ?", [newWarnings, userId]);

            if (newWarnings >= 5) {
                // Kick the user after 5 warnings
                try {
                    await ctx.kickChatMember(userId);
                    ctx.reply(`User @${ctx.from.username} has been kicked for repeated violations.`);
                } catch (kickError) {
                    console.error("Failed to kick user:", kickError.message);
                }
            } else {
                ctx.reply(`@${ctx.from.username}, please refrain from using inappropriate language. Warning ${newWarnings}/5.`);
            }

            break; // Exit the loop after finding a bad word
        }
    }
});

bot.launch();