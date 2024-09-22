const { Markup } = require('telegraf');

// Function to create a consistent guide keyboard
function createGuideKeyboard(additionalButtons) {
    let keyboard = [];
    if (additionalButtons) {
        keyboard.push([additionalButtons]);
    }
    keyboard.push([Markup.button.callback('⬅️ Back to Help', 'RETURN_TO_MAIN_HELP')]);
    return Markup.inlineKeyboard(keyboard);
}

// Main Help Display Function
function displayMainHelp(ctx, edit = false) {
    const helpMessage = `
📘 **NFT Tipper Help Guide** 📘

Welcome to the NFT Tipper! This bot allows you to tip NFTs in your Telegram chat. Experience the power of the Enjin Matrixchain with seamless tipping! The best? It's free!

Choose a section to learn more.
    `;

    const helpKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Getting Started', 'START_GUIDE')],
        [Markup.button.callback('🎁 Tipping', 'TIP_GUIDE')],
        [Markup.button.callback('💎 Super Tipping', 'SUPER_TIPPING')],
        [Markup.button.callback('👨‍👨‍👦‍👦 Collaboration Feature', 'COLLABORATION')],
        [Markup.button.callback('🎃 Seasonal Events', 'TIP_SEASON')],
        [Markup.button.callback('🎉 Ranking Token', 'TIP_RANKING')],
        [Markup.button.callback('📌 Manage Profile & Bio', 'PROFILE_BIO')],
        [Markup.button.callback('🛡️ Channel Rules & Moderation', 'MODERATION_GUIDE')],
        [Markup.button.url('🌐 My Collection', 'https://nft.io/collection/nft-tipper-bot/')]
    ]);

    if (edit) {
        ctx.editMessageText(helpMessage, { parse_mode: 'Markdown', reply_markup: helpKeyboard.reply_markup });
    } else {
        ctx.replyWithMarkdown(helpMessage, helpKeyboard);
    }
}

module.exports = { createGuideKeyboard, displayMainHelp };