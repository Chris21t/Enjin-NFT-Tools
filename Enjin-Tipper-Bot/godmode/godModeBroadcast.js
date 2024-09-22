// godModeBroadcast.js

const { ADMIN_STATES, adminState } = require('../godmode/adminStates');

async function broadcastMessage(ctx) {
    ctx.deleteMessage(); 
    await ctx.reply('Please enter the message you want to broadcast:');
    adminState.current = ADMIN_STATES.AWAITING_BROADCAST;
}

module.exports = broadcastMessage;