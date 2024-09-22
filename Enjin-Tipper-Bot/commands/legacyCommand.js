const fetch = require('node-fetch');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const logger = require('../utils/logger');

async function legacyCommand(ctx) {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('Please provide an ID. Usage: /legacy <id> [additionalId]');
    }

    // Determine if it's a Collection (one argument) or a Token (two arguments)
    const isCollection = args.length === 2;
    const id = args[1] + (isCollection ? '' : `-${args[2]}`);
    const url = `https://platform.production.enjinusercontent.com/ethereum/assets/metadata/${id}.json`;
    const maxCaptionLength = 600;

    // Inform the user that the bot is fetching information
    ctx.reply(`Fetching information for ${isCollection ? 'Collection' : 'Token'} ID ${id}...`);

    try {
        const response = await fetch(url, { redirect: 'follow' });
        const data = await response.json();

        if (data) {
            let description = data.description || 'No description yet.';
            if (description.length > maxCaptionLength - 300) {
                description = description.substring(0, maxCaptionLength - 300);
                description = description.substring(0, description.lastIndexOf(' ')) + '...';
            }

            const imageUrl = isCollection ? data.fallback_image : data.image;
            const legacyResponseMessage = `👑 <b>${isCollection ? 'Collection' : 'Token'} Information</b> 👑\n\n<b>Name:</b> ${data.name}\n\n<b>Description:</b> <blockquote>${description}</blockquote>`;
            await ctx.replyWithPhoto({ url: imageUrl }, { caption: legacyResponseMessage, parse_mode: 'HTML' });

        } else {
            ctx.reply('No data found for the provided ID.');
        }
    } catch (error) {
        logger.error(`Error fetching ${isCollection ? 'collection' : 'token'} data:`, error);
        ctx.reply(`Oops, I couldn't find any data for that ${isCollection ? 'collection' : 'token'} ID. 🤔`);
    }
}

module.exports = legacyCommand;