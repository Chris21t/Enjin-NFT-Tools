const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Adjust the path as per your project structure

// Utility function to format account data into an HTML message
function formatAccountDataToHTML(accountData, mintingData, dynamicTokenName) {
    // Ensure commas are removed before converting to BigInt
    const mainBalanceENJ = (BigInt(accountData.balance.replace(/,/g, '')) / BigInt(1e18)).toString();
    const mainReservedENJ = (BigInt(accountData.reserved.replace(/,/g, '')) / BigInt(1e18)).toString();

    let message = `<b>Account Information</b>\n\n`;
    message += `<b>📬 Address:</b> <code>${accountData.address}</code>\n`;
    message += `<b>👛 Balance:</b> ${mainBalanceENJ} ENJ\n`;
    message += `<b>🔒 Locked:</b> ${mainReservedENJ} ENJ\n`;
    message += `<b>📜 Nonce:</b> ${accountData.nonce}\n\n`;


    message += `<b>🖼 NFT Balances:</b>\n`;
    message += `<blockquote><b>NFT Tipper (Access):</b>\n• Collection ID: ${accountData.tokens[1].collectionId}\n• Token ID: ${accountData.tokens[1].tokenId}\n• Balance: <b>${accountData.tokens[1].balance}</b>\n\n<i>Note: This token is necessary for using tipping commands and is regulated by the Whitelist module.</i></blockquote>\n`;
    message += `<blockquote><b>Tipper Token (Tipping):</b>\n• Collection ID: ${accountData.tokens[0].collectionId}\n• Token ID: ${accountData.tokens[0].tokenId}\n• Balance: <b>${accountData.tokens[0].balance}</b>\n\n<i>Note: This token is distributed through tipping commands among registered users.</i></blockquote>\n\n`;

    if (dynamicTokenName) {
        message += `<b>🔋 ${dynamicTokenName}:</b>\n`;
        message += `<blockquote>• Balance: ${accountData.tokens[2] ? accountData.tokens[2].balance : "No data available"}\n• Collection ID: ${accountData.tokens[2] ? accountData.tokens[2].collectionId : "N/A"}\n• Token ID: ${accountData.tokens[2] ? accountData.tokens[2].tokenId : "N/A"}</blockquote>\n\n`;
    }

    message += `<b>⚒️ Minting Module:</b>\n`;
    const surplusENJIndicator = mintingData.surplus > 0 ? "✅" : "❌";
    const surplusTokenIndicator = mintingData.balanceToken > mintingData.thresholdToken ? "❌" : "✅";
    const surplusThreshold = mintingData.balanceToken - mintingData.thresholdToken;

    message += `<blockquote>`;
    message += `• Threshold ENJ: ${mintingData.thresholdENJ}\n`;
    message += `• Surplus ENJ: ${mintingData.surplus} ${surplusENJIndicator}\n`;
    message += `• Threshold Token: ${mintingData.thresholdToken}\n`;
    message += `• Surplus Token: ${surplusThreshold > 0 ? surplusThreshold : 0} ${surplusTokenIndicator}\n`;
    message += `• Upcoming Mints: <b>${mintingData.mintsUpcoming}</b>\n\n`;
    message += `<i>Note: Only if both Surplus calculations indicate a green tick, the automated minting will be initiated. Updated every 30 minutes.</i></blockquote>\n\n`;
    message += `<i>🕒 Data as of: ${mintingData.timestamp} CET. Automatically updated every 6 minutes.</i>`;


    return message;
}


// Function to handle the /info command
async function infoCommand(ctx, bot) {
    try {
        const accountFilePath = path.join(__dirname, '..', 'token_account_data.json');
        const accountData = JSON.parse(fs.readFileSync(accountFilePath, 'utf8'));

        const mintingReportPath = path.join(__dirname, '..', 'mintingReport.json');
        const mintingData = JSON.parse(fs.readFileSync(mintingReportPath, 'utf8'));

        if (!accountData || typeof accountData !== 'object' || !mintingData) {
            throw new Error('Invalid data.');
        }

        const chargingModuleActive = true; // Logic to check if the Charging Module is active
        const dynamicTokenName = chargingModuleActive ? 'Charging Module' : null;

        const formattedMessage = formatAccountDataToHTML(accountData, mintingData, dynamicTokenName);

        const photoUrl = 'https://nft.production.enjinusercontent.com/uploads/files/dev5hlko6int7uah.jpg';
        await bot.telegram.sendPhoto(ctx.chat.id, photoUrl, { caption: formattedMessage, parse_mode: 'HTML' });
    } catch (error) {
        logger.error('Error handling /info command:', error);
        ctx.reply("Sorry, I couldn't fetch the account information.", { parse_mode: 'HTML' });
    }
}


module.exports = infoCommand;
