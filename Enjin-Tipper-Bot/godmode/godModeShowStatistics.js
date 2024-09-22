const db = require('../database/db'); // Adjust the import path based on your project structure

async function showStatistics(ctx) {
    try {
        // Retrieve statistics from the database or other sources
        const registeredUsersCount = await db.getAsync("SELECT COUNT(*) AS count FROM users");
        const totalTipsSent = await db.getAsync("SELECT SUM(tip_count_sent) AS total FROM users");
        const totalTipsReceived = await db.getAsync("SELECT SUM(tip_count_received) AS total FROM users");

        // Format the statistics into a message
        const statisticsMessage = `
📊 *Statistics*:

👥 Registered Users: ${registeredUsersCount.count}
🚀 Total Tips Sent: ${totalTipsSent.total || 0}
🎁 Total Tips Received: ${totalTipsReceived.total || 0}

Please note that the \*Total Tips Sent\* may not be precise, as each Super Tip reduces the balance by 25.
`;

        ctx.replyWithMarkdown(statisticsMessage);
    } catch (error) {
        console.error(error);
        ctx.reply('An error occurred while fetching and displaying statistics.');
    }
}

module.exports = { showStatistics };