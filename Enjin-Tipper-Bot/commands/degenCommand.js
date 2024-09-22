const fetch = require('node-fetch');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const logger = require('../utils/logger');

async function degenCommand(ctx) {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply('Please provide a number. Usage: /degen <number>');
    }

    const number = args[1];
    const url = `https://platform.production.enjinusercontent.com/enterprise/degens/assets/metadata/2-${number}.json`;
    const maxCaptionLength = 600; // Define once for use throughout

    // Inform the user that the bot is fetching information
    ctx.reply('Fetching information for Degen #' + number + '...');

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data) {
            let description = data.description || 'No description yet.';
            if (description.length > maxCaptionLength - 300) {
                description = description.substring(0, maxCaptionLength - 300);
                description = description.substring(0, description.lastIndexOf(' ')) + '...';
            }

            const degenResponseMessage = `👑 <b>Degen Information</b> 👑\n\n<b>Name:</b> Degen ${data.name}\n\n<b>Description:</b> <blockquote>${description}</blockquote>\n\n🔗 <a href="${data.external_url}">View on the platform</a>`;
            await ctx.replyWithPhoto({ url: data.fallback_image }, { caption: degenResponseMessage, parse_mode: 'HTML' });

            // Fetch pool information after Degen information is displayed
            await fetchPoolInformation(ctx, number);
        } else {
            ctx.reply('No data found for the provided number.');
        }
    } catch (error) {
        logger.error('Error fetching degen data:', error);
        ctx.reply("Oops, I couldn't find any data for that number. 🤔");
    }
}

async function fetchPoolInformation(ctx, number) {
    const wsProvider = new WsProvider('wss://rpc.relay.blockchain.enjin.io');
    const api = await ApiPromise.create({ provider: wsProvider });

    try {
        const poolId = parseInt(number) - 1;
        const poolInfo = await api.query.nominationPools.bondedPools(poolId);

        if (poolInfo.isSome) {
            const poolData = poolInfo.unwrap().toHuman();
            const commission = poolData.commission.current ? `${poolData.commission.current}%` : '0%';

            // Convert capacity from atto ENJ to ENJ
            let capacity = BigInt(poolData.capacity.replace(/,/g, ''));
            capacity = capacity / BigInt(1e18); // Convert from atto ENJ to ENJ

            // Format capacity for display
            if (capacity >= BigInt(1e6)) {
                capacity = `${(Number(capacity) / 1e6).toFixed(2)}M ENJ`;
            } else if (capacity >= BigInt(1e3)) {
                capacity = `${(Number(capacity) / 1e3).toFixed(2)}K ENJ`;
            } else {
                capacity = `${capacity} ENJ`;
            }

            const poolResponseMessage = `🔗 <b>Linked Pool</b> 🔗\n\n<b>Capacity:</b> ${capacity}\n<b>Commission:</b> ${commission}`;
            ctx.reply(poolResponseMessage, { parse_mode: 'HTML' });
        } else {
            ctx.reply('No pool information available for this number.');
        }
    } catch (error) {
        logger.error('Error fetching pool information:', error);
        ctx.reply("There was an issue fetching pool information. 🤔");
    } finally {
        await api.disconnect();
    }
}

module.exports = degenCommand;