// unregisterCommand.js

const unregisterConfirmation = {};

function unregisterCommand(ctx, db) {
    const chatId = ctx.chat.id;
    
    // Check if the user has already initiated the unregistration process
    if (ctx.from.id in unregisterConfirmation) {
        if (unregisterConfirmation[ctx.from.id]) {
            // User has confirmed, proceed with unregistration
            delete unregisterConfirmation[ctx.from.id];
            
            db.run("DELETE FROM users WHERE telegram_id = ?", [ctx.from.id], (err) => {
                if (err) {
                    ctx.reply('Failed to unregister. Please try again.');
                } else {
                    ctx.reply('Successfully unregistered! All your data has been deleted.');
                }
            });
        } else {
            // User has not confirmed yet, ask for confirmation
            ctx.reply('Are you sure you want to unregister? All your data will be lost. Type "/unregister" again to confirm.');
            unregisterConfirmation[ctx.from.id] = true;
        }
    } else {
        // User is initiating the unregistration process
        ctx.reply('Are you sure you want to unregister? All your data will be lost. Type "/unregister" again to confirm.');
        unregisterConfirmation[ctx.from.id] = false; // Set confirmation to false initially
    }
}

module.exports = unregisterCommand;