const queryCollection = require('../helpers/queryCollection');
const queryToken = require('../helpers/queryToken');
const logger = require('../utils/logger');

async function showCommand(ctx, db) {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply('Please provide a collection ID. Usage: /show <collectionId> [tokenId]');
    }

    const collectionId = args[1];
    const tokenId = args.length === 3 ? args[2] : null;
    const maxCaptionLength = 600; // Define once for use throughout

    // Acknowledge the user's request
    let fetchingMessage = tokenId ? 
        `You're looking for Token ID ${tokenId} in Collection ${collectionId}? Let me see what I can find! 🕵️` :
        `You're looking for Collection ID ${collectionId}? Let me see what I can find! 🕵️`;
    ctx.reply(fetchingMessage);

    try {
        let data;
        let responseMessage;
        if (tokenId) {
            data = await queryToken(collectionId, tokenId);
            const assetUrl = `https://nft.io/asset/${collectionId}-${tokenId}`;
            let truncatedDescription = data.description;
            if (truncatedDescription.length > maxCaptionLength - 300) {
                truncatedDescription = truncatedDescription.substring(0, maxCaptionLength - 300);
                truncatedDescription = truncatedDescription.substring(0, truncatedDescription.lastIndexOf(' ')) + '...';
            }

            responseMessage = `🔎 <b>Token Information</b> 🔍\n\n<b>Name:</b> ${data.name}\n\n<b>Description:</b> <blockquote>${truncatedDescription}</blockquote>\n\n<b>📊 Total Supply:</b> ${data.supply}\n<b>🏁 Maximum Supply:</b> ${data.cap}\n\n🔗 <a href="${assetUrl}">View <b>${data.name}</b> on NFT.io</a>\n\nThis data was fetched directly from the Enjin Matrixchain!`;
        } else {
            data = await queryCollection(collectionId, db);
            const collectionUrl = `https://nft.io/collection/${collectionId}/`;
            let truncatedCollectionDescription = data.description;
            if (truncatedCollectionDescription.length > maxCaptionLength - 300) {
                truncatedCollectionDescription = truncatedCollectionDescription.substring(0, maxCaptionLength - 340);
                truncatedCollectionDescription = truncatedCollectionDescription.substring(0, truncatedCollectionDescription.lastIndexOf(' ')) + '...';
            }

            let ownerDisplay;
            if (collectionId === '2479') { // Check if the collection is 2479
                ownerDisplay = '@wisdompanda'; // Set owner to @wisdompanda
            } else if (data.ownerUsername !== 'Unregistered') {
                ownerDisplay = data.ownerUsername; // Display @username
            } else {
                ownerDisplay = `<a href="https://matrix.subscan.io/account/${data.owner}">Unregistered</a>`; // Display hyperlink to the address
            }

            responseMessage = `🔎 <b>Collection Information</b> 🔍\n\n<b>Name:</b> ${data.name}\n\n<b>Description:</b> <blockquote>${truncatedCollectionDescription}</blockquote>\n\n🌟 <b>Unique Tokens:</b> ${data.tokenCount.toLocaleString()}\n🔒 <b>Total Locked:</b> ${data.totalDeposit.toLocaleString()} ENJ\n\n👤 <b>Owner:</b> ${ownerDisplay}\n🎨 <b>Royalties:</b> ${data.royaltyPercentage}\n\n🔗 <a href="${collectionUrl}">View <b>${data.name}</b> on NFT.io</a>\n\nThis data was fetched directly from the Enjin Matrixchain!`;
        }

        if (data) {
            ctx.replyWithPhoto({ url: data.image }, { caption: responseMessage, parse_mode: 'HTML' });
        } else {
            ctx.reply('No data found for the provided ID.');
        }
    } catch (error) {
        logger.error('Error querying data:', error);
        ctx.reply("Weird, I couldn't find anything. 🤔");
    }
}

module.exports = showCommand;