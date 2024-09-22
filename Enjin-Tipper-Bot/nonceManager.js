const { ApiPromise, WsProvider } = require('@polkadot/api');
const config = require('./config/config');
const logger = require('./utils/logger');
const SENDER_ADDRESS = '0x1a21be6b16943491e00354c8e1df51ec3178da5da511922e22d8caec2c0ced08';

logger.info('👍 nonceManager function started.');

let api = null;
let currentNonce = null;
let nonceLock = false;
const nonceRequestQueue = [];
const LOCK_ACQUIRE_TIMEOUT = 5000; // 5 seconds timeout for acquiring lock

// Initialize the connection and API
async function initializeApi() {
    let retryCount = 0;
    const maxRetries = 5;
    let retryDelay = 1000; // Start with a 1-second delay

    while (!api || !api.isConnected) {
        if (retryCount >= maxRetries) {
            logger.error('❌ Max retries reached. Unable to connect to the API.');
            throw new Error('Max retries reached. Unable to connect to the API.');
        }
        try {
            const wsProvider = new WsProvider(config.network.uri);
            api = await ApiPromise.create({ provider: wsProvider });
            logger.info('🔌 API created and connected.');
            break;
        } catch (error) {
            logger.error(`❌ API initialization failed on attempt ${retryCount + 1}: ${error.message}`);
            logger.info(`Retrying to connect in ${retryDelay} ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Double the delay for the next retry
            retryCount++;
        }
    }
}

// Function to return the API instance; this ensures other modules can access the same instance
function getApiInstance() {
    if (!api) {
        throw new Error("API not initialized. Call initializeApi first.");
    }
    return api;
}

// Function to get the current nonce; if it's null, fetch it from the blockchain
async function getCurrentNonce() {
    // If the nonce is already known, return it without making a blockchain call.
    if (currentNonce !== null) {
        return currentNonce;
    }

    // Wrap the initialization and fetching in a try-catch for robust error handling.
    try {
        // Ensure the API is initialized before attempting to fetch the nonce.
        await initializeApi();

        // Fetch the nonce from the blockchain.
        const { nonce } = await api.query.system.account(SENDER_ADDRESS);
        currentNonce = nonce.toNumber();

        // Log the successfully fetched nonce.
        logger.info(`✅ Current nonce fetched: ${currentNonce}`);
    } catch (error) {
        // Log any errors that occur during the fetch.
        logger.error(`❌ Error fetching nonce: ${error.message}`);
        
        // It might be a good idea to reset currentNonce to null to force a refresh on the next call.
        currentNonce = null;
        
        // Re-throw the error to handle it further up the call stack.
        throw error;
    }

    // Return the fetched or cached nonce.
    return currentNonce;
}

// Function to increment the nonce
function incrementNonce() {
    if (currentNonce !== null) {
        currentNonce += 1;
        logger.info(`🆙 Nonce incremented to: ${currentNonce}`);
        return currentNonce;
    } else {
        logger.error('❗ Cannot increment nonce because it is null.');
        throw new Error('Nonce is null, cannot increment.');
    }
}

async function lockNonce() {
    if (nonceLock) {
        logger.warn('⚠️ Nonce is already locked. Queuing lock request.');
        // Introduce a timeout for acquiring the lock
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Timeout while waiting for nonce lock.'));
            }, LOCK_ACQUIRE_TIMEOUT);
        });

        // Wait for either the lock to be resolved or the timeout
        return Promise.race([
            new Promise((resolve) => nonceRequestQueue.push(resolve)),
            timeoutPromise,
        ]).finally(() => clearTimeout(timeoutId));
    }

    nonceLock = true;
    logger.info('🔒 Nonce locked.');
    return Promise.resolve(true);
}

function unlockNonce() {
    if (!nonceLock) {
        logger.warn('⚠️ Attempted to unlock a nonce that is not locked.');
        return;
    }

    if (nonceRequestQueue.length > 0) {
        const nextResolve = nonceRequestQueue.shift();
        nextResolve(true);
        logger.info('🔓 Nonce unlocked. Passed lock to the next queued request.');
    } else {
        nonceLock = false;
        logger.info('🔓 Nonce unlocked.');
    }
}


// Function to get the next nonce atomically
async function getNextNonce() {
    try {
        // Attempt to acquire the lock. If it times out, the error will be caught.
        await lockNonce();
    } catch (error) {
        // Handle the timeout error, such as logging it and deciding whether to retry.
        logger.error(`❌ Error acquiring nonce lock: ${error.message}`);
        // Depending on the use case, you could throw the error, retry, or handle it differently.
        throw error;
    }

    try {
        const nonce = await getCurrentNonce();
        incrementNonce();
        return nonce;
    } catch (error) {
        // Handle any errors that occur while getting or incrementing the nonce.
        throw error;
    } finally {
        // Ensure unlocking happens even if there are errors.
        unlockNonce();
    }
}

// Function to initialize and synchronize the nonce with the blockchain
async function initializeNonce() {
    await initializeApi(); // Initialize the API connection

    // Fetch the nonce from the blockchain to initialize it
    const { nonce } = await api.query.system.account(SENDER_ADDRESS);
    currentNonce = nonce.toNumber();
    logger.info(`✅ Nonce initialized: ${currentNonce}`);
}

// Function to synchronize the nonce with the blockchain
async function synchronizeNonce() {
    try {
        await initializeApi(); // Ensure the API is initialized

        const { nonce } = await api.query.system.account(SENDER_ADDRESS);
        currentNonce = nonce.toNumber();
        logger.info(`✅ Nonce synchronized: ${currentNonce}`);
    } catch (error) {
        logger.error(`❌ Error during nonce synchronization: ${error.message}`);
        throw error; // Re-throw the error after logging
    }
}

module.exports = {
    getNextNonce,
    initializeApi,
    getApiInstance,
    getCurrentNonce,
    incrementNonce,
    lockNonce,
    unlockNonce,
    initializeNonce,
    synchronizeNonce
};