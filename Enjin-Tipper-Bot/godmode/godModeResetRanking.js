// godModeResetRanking.js
async function resetRanking(ctx, db) {
    try {
        await db.run("UPDATE users SET tip_count_sent = 0, tip_count_received = 0");
        ctx.reply('The ranking has been reset.');
    } catch (error) {
        console.error(error);
        ctx.reply('An error occurred while resetting the ranking.');
    }
}

module.exports = resetRanking;
