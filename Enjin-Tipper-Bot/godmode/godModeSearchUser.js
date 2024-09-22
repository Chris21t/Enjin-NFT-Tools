// godModeSearchUser.js

const { ADMIN_STATES, adminState } = require('./adminStates'); // Correct import path

async function searchUser(ctx, adminState) {
    ctx.deleteMessage(); // This deletes the previous message with buttons
    await ctx.reply('Please enter the username or ID of the user you want to search for:');
    adminState.current = ADMIN_STATES.AWAITING_SEARCH;
}

module.exports = searchUser;