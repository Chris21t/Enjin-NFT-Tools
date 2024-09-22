// statsCommand.js

async function statsCommand(ctx, db) {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only admins can use the /stats command in groups.');
            return;
        }
    }

    db.all("SELECT COUNT(*) as totalUsers FROM users", [], (err, rows) => {
        if (err) {
            ctx.reply('Failed to fetch stats. Please try again later.');
            return;
        }
        const totalUsers = rows[0].totalUsers;
        ctx.reply(`Total Registered Users: ${totalUsers}`);
    });
}

module.exports = statsCommand;