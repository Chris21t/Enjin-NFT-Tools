// rankingCommand.js

async function rankingCommand(ctx, db) {
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
        const rows = await db.allAsync("SELECT telegram_id, tip_count_received, username FROM users ORDER BY tip_count_received DESC LIMIT 25");

        let rankingMessage = '🌠 *Top 25 Tip Receivers* 🌠\n\n';

        // Loop through the rows and create the ranking message
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const usernameDisplay = `@${(row.username || 'Anonymous').replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&')}`;
            rankingMessage += `${index + 1}. ${usernameDisplay} - Tips Received: ${row.tip_count_received}\n`;
        }

        ctx.replyWithMarkdown(rankingMessage);
    } catch (dbError) {
        console.error('Error fetching ranking from database:', dbError.message);
        ctx.reply('Failed to fetch ranking. Please try again later.');
    }
}

module.exports = rankingCommand;