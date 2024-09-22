// profileCommand.js
const showUserProfile = require('../helpers/showUserProfile');
const getUserIdByUsername = require('../helpers/getUserIdByUsername');

async function profileCommand(ctx, db) {
    // Extract potential username from the command
    const commandParts = ctx.message.text.split(' ');
    let targetUsername = commandParts.length > 1 ? commandParts[1].trim() : null;  // Ensure it's trimmed to remove any whitespace

    if (!targetUsername) {
        // No username provided, show the profile of the user who issued the command
        await showUserProfile(ctx.from.id, ctx, db);
    } else {
        // Check if the username starts with '@' and remove it
        if (targetUsername.startsWith('@')) {
            targetUsername = targetUsername.substring(1);
        }

        // Username provided, attempt to fetch user ID from database
        const targetUserId = await getUserIdByUsername(targetUsername, db);

        if (targetUserId) {
            // User found in the database, show their profile
            await showUserProfile(targetUserId, ctx, db);
        } else {
            // User not found in the database, send an error message
            ctx.reply(`User with username ${targetUsername} not found or not registered.`);
        }
    }
}

module.exports = profileCommand;