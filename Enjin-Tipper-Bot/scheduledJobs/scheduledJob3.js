const schedule = require('node-schedule');
const logger = require('../utils/logger'); // Adjust the path as needed
const queryAccountData = require('../helpers/queryAccountData'); // Import the function

function startScheduledJob3(bot) {
    schedule.scheduleJob('*/5 * * * *', async function() {
        logger.info("🔎 Scheduled job started: Querying account data.");
        try {
            await queryAccountData();
            logger.info("✅ Scheduled job completed: Account data queried and saved.");
        } catch (error) {
            logger.error(`❌ Error occurred in scheduled task: ${error}`);
        }
    });
}

module.exports.startScheduledJob3 = startScheduledJob3;