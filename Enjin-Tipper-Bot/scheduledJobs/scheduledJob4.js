const schedule = require('node-schedule');
const logger = require('../utils/logger'); // Adjust the path as needed
const getMintingData = require('../helpers/getMintingData'); // Import the function

function startScheduledJob4(bot) {
    schedule.scheduleJob('*/6 * * * *', async function() {
        logger.info("🔎 Scheduled job started: Initiate Auto-Minting process.");
        try {
            await getMintingData();
            logger.info("✅ Scheduled job completed: Auto-Minting processed.");
        } catch (error) {
            logger.error(`❌ Error occurred in scheduled task: ${error}`);
        }
    });
}

module.exports.startScheduledJob4 = startScheduledJob4;