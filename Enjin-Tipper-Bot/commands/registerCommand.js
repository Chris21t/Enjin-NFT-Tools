const { Markup } = require('telegraf');
const config = require('../config/config');

async function registerCommand(ctx, db) {
    // Ensure message and chat objects are available
    if (!ctx.message || !ctx.chat) {
        console.error('❌ ctx.message or ctx.chat is undefined');
        console.error('Context object:', ctx);  // Log the entire context object
        return;
    }

    const messageText = ctx.message.text.trim();
    const args = messageText.split(' ');

    if (args.length === 1) {
        // Handle the case where the command has no arguments
        await handleInitialRegistration(ctx);
    } else {
        // Handle the case where the command has arguments (address submission)
        const address = args[1];
        await handleAddressSubmission(ctx, address, db);
    }
}

async function handleInitialRegistration(ctx) {
    // Check if the command is used in a group chat
    if (ctx.chat.type !== 'private') {
        await handleGroupChat(ctx);
        return;
    }

    const infoMessage = '🤖 Welcome to NFT Tipper! To get started, you need to register your Enjin Matrixchain address.';
    const addressRequestMessage = 'ℹ️ Please type /register followed by your Enjin Matrixchain address in one message. It should start with "ef" and be exactly 49 characters long.\n\nIf you need help, use the /help command.';
    
    await ctx.reply(infoMessage);
    await ctx.reply(addressRequestMessage);
}

async function handleGroupChat(ctx) {
    try {
        // Delete the user's command message
        await ctx.deleteMessage(ctx.message.message_id);
    } catch (error) {
        console.error('Could not delete the user command message', error);
    }

    // Static URL for the button
    const registerUrl = 'https://t.me/NFT_TIPPER_BOT?start=register';

    // Create the button
    const registerButton = Markup.inlineKeyboard([
        Markup.button.url('🚀 Register', registerUrl)
    ]);

    // Send the message with the button
    try {
        await ctx.reply(
            'Please click the button below to start the registration process. 🤖\n\nOnce we\'re in a private chat, simply send /register followed by your Enjin Matrixchain address in one message. Always starting with ef! 🦾', 
            registerButton
        );
    } catch (error) {
        console.error('Failed to send the message with the registration button', error);
    }
}

async function handleAddressSubmission(ctx, address, db) {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    const registrationDate = Math.floor(Date.now() / 1000); // Current timestamp in seconds

    if (!address.startsWith('ef') || address.length !== 49) {
        await ctx.reply('❌ Invalid address. Please provide a valid Enjin Matrixchain address.');
        return;
    }

    try {
        const existingUser = await db.getAsync("SELECT address FROM users WHERE address = ?", [address]);
        if (existingUser) {
            await ctx.reply('🚫 This address is already registered.');
            return;
        }

        const nftTipperLink = `<b><a href="https://nft.io/asset/${config.collectionId}-1">NFT Tipper</a></b>`;
        const successMessage = `🎉 Successfully registered! If you already own an ${nftTipperLink} token, you can now send and receive tips.`;

        await db.runAsync("INSERT INTO users (telegram_id, address, username, registration_date) VALUES (?, ?, ?, ?)", [userId, address, username, registrationDate]);
        await ctx.replyWithHTML(successMessage);
    } catch (error) {
        console.error('❌ Failed to register:', error);
        await ctx.reply('❗ An error occurred during registration. Please try again.');
    }
}

module.exports = registerCommand;
