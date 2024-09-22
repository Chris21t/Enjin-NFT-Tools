// godModeResetTips.js
async function resetTips(ctx, db) {
    try {
        // Reset hourly_tip_count for all users
        await db.run("UPDATE users SET hourly_tip_count = 0");
        await db.run("DELETE FROM tips");

        // Reset last_tip_date for all users to a date in the past (e.g., yesterday)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await db.run("UPDATE users SET last_tip_date = ?", [yesterday.toISOString()]);

        ctx.reply('All user tip timers have been reset.');
    } catch (error) {
        console.error(error);
        ctx.reply('An error occurred while resetting tip timers.');
    }
}

module.exports = resetTips;