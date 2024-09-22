// helpCommand.js
const { displayMainHelp } = require('../helpers/helpFunctions');

const helpCommand = (ctx) => {
    // Ensure that the command works only in private chats (DMs)
    if (ctx.chat.type === 'private') {
        displayMainHelp(ctx);
    } else {
        ctx.reply('Please contact me in direct messages for the help guide. 👍');
    }
};

module.exports = helpCommand;