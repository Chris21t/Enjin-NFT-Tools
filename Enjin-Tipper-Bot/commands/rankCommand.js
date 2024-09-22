const { BOT_OWNER_ID } = require('../config/config');
const db = require('../database/db');

// Define the valid ranks, including the new admin rank
const validRanks = ['Null', 'Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Admin'];

const rankCommand = async (ctx) => {
    if (ctx.from.id.toString() !== BOT_OWNER_ID) {
        console.log(`Unauthorized access attempt by user ID ${ctx.from.id}`);
        return;
    }

    const args = ctx.message.text.trim().split(' ');
    if (args.length !== 3) {
        ctx.reply('Invalid command format. Use /rank [username] [rank]. 👀');
        return;
    }

    const username = args[1].startsWith('@') ? args[1].substring(1) : args[1];
    const newRank = args[2];

    if (!validRanks.includes(newRank)) {
        ctx.reply('Invalid rank. Valid ranks are: ' + validRanks.join(', ') + ' 👀');
        return;
    }

    try {
        // Check if the user is currently an admin
        const userData = await db.getAsync("SELECT last_token_type, isAdmin FROM users WHERE username = ?", [username]);
        
        if (!userData) {
            ctx.reply(`User ${username} not found. 👀`);
            return;
        }

        // If the new rank is 'Admin', update only the isAdmin flag
        if (newRank === 'Admin') {
            await db.runAsync("UPDATE users SET isAdmin = 1 WHERE username = ?", [username]);
            ctx.reply(`User ${username} has been promoted to Admin. 🎖️`);
        } else {
            // If the new rank is not 'Admin', update the rank and remove the isAdmin flag if the user was an admin
            const adminStatusUpdate = userData.isAdmin ? ", isAdmin = 0" : "";
            await db.runAsync(`UPDATE users SET last_token_type = ?${adminStatusUpdate} WHERE username = ?`, [newRank, username]);
            ctx.reply(`User ${username}'s rank has been updated to ${newRank}. 🏅⭐`);
        }
    } catch (error) {
        console.error(`Failed to update rank for user ${username}: `, error);
        ctx.reply('There was an error updating the rank. Please check the logs. 📜');
    }
};

module.exports = rankCommand;