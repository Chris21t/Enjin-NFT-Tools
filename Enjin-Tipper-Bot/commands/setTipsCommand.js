const { BOT_OWNER_ID } = require('../config/config'); // Import BOT_OWNER_ID from your config file
const db = require('../database/db');

const setTipsCommand = async (ctx, db) => {
    console.log("Received /settips command"); // Add this line
    // Check if the command issuer is the bot owner
    const userId = ctx.from.id.toString(); // Get the user's ID
    console.log(`Received command from user ID ${userId}`);
    console.log(`Expected BOT_OWNER_ID: ${BOT_OWNER_ID}`);

    if (userId !== BOT_OWNER_ID) {
        console.log(`Unauthorized access attempt by user ID ${userId}`);
        ctx.reply('You are not authorized to use this command. 🙅');
        return;
    }

    const args = ctx.message.text.trim().split(' '); // Parse the command arguments
    const username = args[1].startsWith('@') ? args[1].substring(1) : args[1]; // Remove "@" from the start, if present
    const newTipCount = parseInt(args[2]);

    // Validate the new tip count
    if (isNaN(newTipCount) || newTipCount < 0) {
        ctx.reply('Invalid number of tips. Please provide a positive number or 0. ➕');
        return;
    }

    try {
        // Update the user's tip_count_sent in the database
        await db.runAsync("UPDATE users SET tip_count_sent = ? WHERE username = ?", [newTipCount, username]);

        ctx.reply(`User ${username}'s tip count has been updated to ${newTipCount}. ✅`);
    } catch (error) {
        console.error(`Failed to update tip count for user ${username}: `, error);
        ctx.reply('There was an error updating the tip count. Please check the logs. ❌');
    }
};

module.exports = setTipsCommand;