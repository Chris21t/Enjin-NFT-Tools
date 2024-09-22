const schedule = require('node-schedule');
const { addToQueue } = require('../transactionQueue'); // Import addToQueue function from your transactionQueue module
const db = require('../database/db');
const config = require('../config/config');
const logger = require('../utils/logger');

// Specify the Trick O' Treat collection ID and token ID
const trickOrTreatCollectionId = config.trickOrTreatCollectionId;
const trickOrTreatTokenId = config.trickOrTreatTokenId;

function startScheduledJob(bot) {
    const job1 = schedule.scheduleJob('*/60 * * * *', async function () { // Adjusted to 15 minutes
        try {
            // Fetch all users
            const rows = await db.allAsync("SELECT telegram_id, address, username FROM users");

            if (rows.length === 0) {
                logger.info("No users available for random token distribution.");
                return;
            }

            // Select a random user
            const randomUser = rows[Math.floor(Math.random() * rows.length)];

            // Debug: Log user information
            if (randomUser) {

                // Add NFT distribution task to the queue
                logger.info(`🎈 Queuing a seasonal drop for ${randomUser.username || `ID: ${randomUser.telegram_id}`}.`);
                addToQueue({
                    collectionId: trickOrTreatCollectionId,
                    tokenId: trickOrTreatTokenId,
                    recipientAddress: randomUser.address,
                    recipientUsername: randomUser.username,
                    telegram_id: randomUser.telegram_id,
                });
                
                // Direct message the user
                try {
                    const message = `Congratulations, @${randomUser.username}!\n\nYou've been randomly selected to receive <b><a href="https://nft.io/asset/${config.trickOrTreatCollectionId}-${config.trickOrTreatTokenId}">Beach Days</a></b>, a digital artwork symbolizing all the sunny days that lie ahead. Enjoy! 🌴\n\nMake sure to enjoy life, wherever you are! 🏄\n\nThis tiny token of appreciation is on its way to your wallet through the Enjin Blockchain. 💌\n\nIt's great to have you in the NFT Tipper Bot family. Here's to our all the successful days and all the future ones to come! 🫂`;
                    // URL of the image to be sent
                    const imageUrl = 'https://nft.production.enjinusercontent.com/uploads/files/yvqtltyf6masfxxw.jpg';
                    // Send the message and photo
                    await bot.telegram.sendPhoto(randomUser.telegram_id, imageUrl, { caption: message, parse_mode: 'HTML' });
                    logger.info(`✉️  Direct message sent successfully to user: ${randomUser.username || `ID: ${randomUser.telegram_id}`}.`);
                } catch (error) {
                    logger.error(`❌ Failed to send direct message to user: @${randomUser.username} (ID: ${randomUser.telegram_id}). Error: ${error.message}`);
                }
            } else {
                logger.error("❗ Random user is undefined.");
            }
        } catch (error) {
            logger.error(`❌ An error occurred during Trick O' Treat Recurring Drop: ${error}`);
        }
    });
}

module.exports.startScheduledJob = startScheduledJob;
