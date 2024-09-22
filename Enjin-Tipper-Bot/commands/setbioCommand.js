// setbioCommand.js

const isRegistered = require('../helpers/isRegistered');

async function setbioCommand(ctx, db) {
    const userId = ctx.from.id;
    const bio = ctx.message.text.split(' ').slice(1).join(' '); // Extract the bio text from the command

    // Check if the user is registered
    const isUserRegistered = await isRegistered(userId, db);

    if (!isUserRegistered) {
        ctx.reply('You need to register your Enjin Matrixchain address using /register (Your Enjin Matrixchain Address) before setting your bio. 🙌');
        return;
    }

    if (bio) {
        // Update the user's bio in the database
        db.run("INSERT OR REPLACE INTO profiles (telegram_id, bio) VALUES (?, ?)", [userId, bio], function (err) {
            if (err) {
                ctx.reply('Something is off. It failed to set your bio. Please try again.');
                console.error(err); // Print the error to the console for debugging
                return;
            }
            ctx.reply('Your bio has been updated successfully! ✅');
        });
    } else {
        ctx.reply('Please provide a valid bio text. Usage: /setbio (Be creative and write something funny!) 🥳');
    }
}

module.exports = setbioCommand;