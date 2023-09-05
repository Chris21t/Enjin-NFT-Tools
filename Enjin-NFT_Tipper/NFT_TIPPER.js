const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const winston = require('winston');
const { Telegraf } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const { decryptSeed } = require('./encryptionUtil');
const config = require('./config.json');
const BOT_TOKEN = 'YOUR_BOT_TOKEN';
let lastUsedNonce = null;

const db = new sqlite3.Database('users.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (telegram_id TEXT PRIMARY KEY, address TEXT UNIQUE, username TEXT, tip_count INTEGER DEFAULT 0)");
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

async function sendNFT(address) {
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

        logger.info(`Sent 1 of tokenId: ${config.tokenId} from collection: ${config.collectionId} to recipient: ${address}`);

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
    const address = ctx.message.text.split(' ')[1];
    const userId = ctx.from.id;
    const username = ctx.from.username || '';

    if (address) {
        // Check if the address is already registered
        db.get("SELECT address FROM users WHERE address = ?", [address], (err, row) => {
            if (err) {
                ctx.reply('An error occurred while checking the address. Please try again.');
                return;
            }
            if (row) {
                ctx.reply('This address is already registered by another user.');
                return;
            }
            // If not, proceed with the registration
            db.run("INSERT OR IGNORE INTO users (telegram_id, address, username) VALUES (?, ?, ?)", [userId, address, username], function(err) {
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

bot.command('tip', async (ctx) => {
    // Get the list of chat administrators
    const admins = await ctx.getChatAdministrators();
    const adminIds = admins.map(admin => admin.user.id);

    // Check if the user issuing the command is an admin
    if (adminIds.includes(ctx.from.id)) {
        const userId = ctx.message.reply_to_message ? ctx.message.reply_to_message.from.id : ctx.from.id;
        db.get("SELECT address FROM users WHERE telegram_id = ?", [userId], async (err, row) => {
            if (err || !row) {
                ctx.reply('Address not found. Make sure the user is registered.');
                return;
            }
            const success = await sendNFT(row.address);
            if (success) {
                ctx.reply(`NFT sent to ${row.address}!`);
                
                // Update the tip count for the user in the database
                db.run("UPDATE users SET tip_count = tip_count + 1 WHERE telegram_id = ?", [userId]);
            } else {
                ctx.reply('Failed to send NFT. Please try again later.');
            }
        });
    } else {
        ctx.reply('Sorry, only admins can use the /tip command.');
    }
});

bot.command('stats', async (ctx) => {
    const admins = await ctx.getChatAdministrators();
    const adminIds = admins.map(admin => admin.user.id);

    if (adminIds.includes(ctx.from.id)) {
        db.all("SELECT COUNT(*) as totalUsers FROM users", [], (err, rows) => {
            if (err) {
                ctx.reply('Failed to fetch stats. Please try again later.');
                return;
            }
            const totalUsers = rows[0].totalUsers;
            ctx.reply(`Total Registered Users: ${totalUsers}`);
        });
    } else {
        ctx.reply('Sorry, only admins can use the /stats command.');
    }
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
    const admins = await ctx.getChatAdministrators();
    const adminIds = admins.map(admin => admin.user.id);

    if (adminIds.includes(ctx.from.id)) {
        const wsProvider = new WsProvider(config.network.uri);
        const api = await ApiPromise.create({ provider: wsProvider });

        if (api.isConnected) {
            ctx.reply('The connection to the Enjin Matrixchain node is healthy.');
        } else {
            ctx.reply('The connection to the Enjin Matrixchain node seems to be down.');
        }

        wsProvider.disconnect();
    } else {
        ctx.reply('Sorry, only admins can use the /health command.');
    }
});

bot.command('ranking', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (adminIds.includes(ctx.from.id)) {
            // Fetch the tip ranking from the database
            try {
                const rows = await db.allAsync("SELECT telegram_id, tip_count, username FROM users ORDER BY tip_count DESC");

                let rankingMessage = 'Tip Ranking:\n';

                // Loop through the rows and create the ranking message
                for (const row of rows) {
                    const usernameDisplay = `@${row.username || 'Unknown'}`;
                    rankingMessage += `${usernameDisplay}, Tips: ${row.tip_count}\n`;
                }

                ctx.reply(rankingMessage);
            } catch (dbError) {
                console.error('Error fetching ranking from database:', dbError.message);
                ctx.reply('Failed to fetch ranking. Please try again later.');
            }
        } else {
            ctx.reply('Sorry, only group chat administrators can use the /ranking command.');
        }
    } else {
        ctx.reply('The /ranking command can only be used in group chats or supergroups.');
    }
});

bot.command('help', (ctx) => {
    let helpMessage = `
🤖 *Enjin Tip Bot Help* 🤖

1. **/register [address]**
   - Description: Register your Enjin/Canary address with the bot.
   - Usage: /register your Enjin/Canary address
   - Note: Each user can only register once.

2. **/tip**
   - Description: Tip a user with an NFT.
   - Usage: Reply to a user's message and type /tip
   - Note: Only chat administrators can use this command.

3. **/stats**
   - Description: Get the total number of registered users.
   - Usage: /stats
   - Note: Only chat administrators can use this command.

4. **/myaddress**
   - Description: View your registered Enjin/Canary address.
   - Usage: /myaddress

5. **/health**
   - Description: Check the health of the connection to the node.
   - Usage: /health
   - Note: Only chat administrators can use this command.

6. **/ranking**
   - Description: View the tip ranking of users in the chat.
   - Usage: /ranking
   - Note: Only chat administrators can use this command.
`;

    ctx.replyWithMarkdown(helpMessage);
});

bot.launch();
