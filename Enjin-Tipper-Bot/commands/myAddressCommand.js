// myAddressCommand.js

function myAddressCommand(ctx, db) {
    const userId = ctx.from.id;
    db.get("SELECT address FROM users WHERE telegram_id = ?", [userId], (err, row) => {
        if (err || !row) {
            ctx.reply('You are not registered or an error occurred.');
            return;
        }
        ctx.reply(`Your registered address is: ${row.address}`);
    });
}

module.exports = myAddressCommand;