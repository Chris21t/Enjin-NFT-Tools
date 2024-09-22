const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const { mintNFT } = require('../mintNFT');
const config = require('../config/config');
const logger = require('../utils/logger');

// Function to start and execute the scheduled job
function startScheduledJob5(bot) {
    let jobActive = true; // Flag to control job execution

    schedule.scheduleJob('30 1 */3 * * *', async function() {
        logger.info('👍  Minting Module started.');

        if (!jobActive) {
            logger.info('Job is inactive due to a previous error.');
            return;
        }

        try {
            const reportPath = path.join(__dirname, '..', 'mintingReport.json');
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

            let message;
            let txHash = '';

            if (report.mintsUpcoming > 0) {
                const mintResult = await mintNFT(config.collectionId, config.tokenId, config.address, report.mintsUpcoming);
                txHash = mintResult.txHash;

                // Create the message with the original mintsUpcoming and obtained txHash
                message = createEpicMintingMessage(report, txHash);

                // Update the mintingReport.json after creating the message
                report.mintsUpcoming = 0;
                fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
            } else {
                message = createEpicMintingMessage(report, null); // Pass null if no txHash is available
            }

            const sentMessage = await bot.telegram.sendPhoto(config.CHAT_ID, config.tokenImage, { caption: message, parse_mode: 'HTML' });
            await bot.telegram.pinChatMessage(config.CHAT_ID, sentMessage.message_id);

        } catch (error) {
            logger.error(`Error in scheduledJob5: ${error.message}`);
            jobActive = false;
        } finally {
            jobActive = true;
        }
    });
}

function createEpicMintingMessage(balanceData, txHash) {
  const { surplus, mintsUpcoming, balanceToken, thresholdToken } = balanceData;
  let txHashMessage = txHash ? `<a href="https://matrix.subscan.io/extrinsic/${txHash}" target="_blank">View the Mint via Subscan</a>` : 'Transaction hash not available at this time.';
  let tipperTokensLink = `https://nft.io/asset/${config.collectionId}-${config.tokenId}`;
  const fundWalletCTA = `To ensure continued minting of Tipper Tokens, we encourage you to fund the wallet at the following address:\n<code>efPjs1X2fo4ompPZsdBvyjE9xDEJasnbuTDMoMsjMJhPkZGRm</code>`;

  if (mintsUpcoming > 0) {
    return `<b>💥 Automated Minting Update! 💥</b>\n\n` +
           `We're on fire! The auto-minting system has just minted <b>${mintsUpcoming}</b> new <a href="${tipperTokensLink}" target="_blank"><b>Tipper Tokens</b></a>, all thanks to a surplus of <b>${surplus}</b> ENJ. 🔥\n\n` +
           `These new Tipper Tokens are a testament to our community's growth and active support. Celebrate and keep tipping – our collective energy is unstoppable! 🦾\n\n` +
           `Enjoy the new tokens and keep the tips flowing! 🎉\n\n` +
           `${txHashMessage}`;
  } else if (surplus > 0 && balanceToken > thresholdToken) {
    return `<b>🚫 Minting Not Initiated 🚫</b>\n\n` +
           `Although we have an extra <b>${surplus}</b> ENJ, we're not minting new <a href="${tipperTokensLink}" target="_blank">Tipper Tokens</a> right now. The reason is simple: the current balance of Tipper Tokens is <b>${balanceToken}</b>, which is more than the set limit of <b>${thresholdToken}</b>. So, no need to create more Tipper Tokens at the moment. 🛑\n\n` +
           `No action is required from any of you. This system is designed to automatically start minting again when it's the right time. ⏳\n\n` +
           `Stay tuned for future updates! 👀`;
  } else {
    return `<b>🔍 Minting Awaiting Next Round 🔍</b>\n\n` +
           `Currently, there is either no surplus or the conditions for minting new <a href="${tipperTokensLink}" target="_blank"><b>Tipper Tokens</b></a> are not met. We're in waiting mode – <b>no extra ENJ</b> yet. But don't worry, our auto-minting system is all set and ready to go! ✨\n\n` +
           `Stay tuned for the next token wave! 🌊\n\n` +
           `${fundWalletCTA}`;
  }
}

module.exports.startScheduledJob5 = startScheduledJob5;