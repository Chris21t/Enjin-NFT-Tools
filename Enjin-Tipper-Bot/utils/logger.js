const winston = require('winston');

// Custom filter function to exclude specific log messages
const excludeFilter = winston.format((info) => {
    // Specify the log messages you want to exclude based on their content
    if (
        info.message.includes('REGISTRY: Unknown signed extensions CheckFuelTank found, treating them as no-effect') ||
        info.message.includes('API/INIT: RPC methods not decorated: multitokens_queryClaimableCollections, multitokens_queryClaimableTokens') ||
        info.message.includes('API/INIT: matrix-enjin/605: Not decorating unknown runtime apis: 0x37242681f96a7abd/1')
    ) {
        return false; // Exclude the log message
    }
    return info; // Pass through all other log messages
});

// Create and configure the logger
const logger = winston.createLogger({
    level: 'info', // Set the logging level as needed (e.g., 'info', 'error', 'debug')
    format: winston.format.combine(
        winston.format.timestamp(),
        excludeFilter(), // Apply the custom filter here
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({ level: 'info' }), // Set log level for console transport to 'info'
        new winston.transports.File({ filename: 'transaction.log' }) // Log to a file
    ]
});

// Export the logger
module.exports = logger;
