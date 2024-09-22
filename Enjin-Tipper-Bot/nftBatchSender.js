const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config/config');
const { decryptSeed } = require('./utils/encryptionUtil');
const logger = require('./utils/logger');
const nonceManager = require('./nonceManager');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Function to check if the transaction failed due to nonce issues
function isNonceError(error) {
    return error.message.includes('1010: Invalid Transaction') || 
           error.message.includes('Priority is too low');
}

// Function to send NFTs in batch using the batchTransfer extrinsic
async function sendNFTBatch(recipients, collectionId, tokenId, recipientCount) {
    // Ensure the API is initialized
    const api = await nonceManager.getApiInstance();

    const SEED_PHRASE = decryptSeed();
    const keyring = new Keyring({ type: "sr25519" });
    keyring.setSS58Format(config.network.format);
    const SENDER = keyring.addFromMnemonic(SEED_PHRASE);

    let retries = 0;
    let retryDelay = RETRY_DELAY;

    while (retries < MAX_RETRIES) {
        try {
            logger.info(`ℹ️ Attempt ${retries + 1}: Initiating batch transfer of tokenId: ${tokenId} from collection: ${collectionId} to ${recipientCount} recipients.`);

            // Use the nonceManager to get the next nonce
            const nonce = await nonceManager.getNextNonce();

            // Prepare the batchTransfer data structure
            const transfersData = recipients.map((recipient) => ({
                accountId: recipient.address,
                params: {
                    Simple: {
                        tokenId: tokenId,
                        amount: 1,
                        keepAlive: true
                    }
                }
            }));

            // Create the batchTransfer extrinsic
            const batchTransferExtrinsic = api.tx.multiTokens.batchTransfer(collectionId, transfersData);

            // Send the batchTransfer extrinsic
            const result = await batchTransferExtrinsic.signAndSend(SENDER, { nonce: nonce });
            logger.info(`✅ Batch transfer successful. (${result.toHex()})`);
            return true;
        } catch (error) {
            if (isNonceError(error)) {
                logger.error(`⚠️ Nonce error detected on attempt ${retries + 1}: ${error.message}. Synchronizing nonce and retrying.`);
                await nonceManager.synchronizeNonce();
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2; // Exponential backoff
                retries++;
            } else {
                logger.error(`❌ Batch transfer failed: ${error.message}`);
                // Non-nonce related error, break the loop and return
                return false;
            }
        }
    }

    logger.error('❌ Maximum retries reached for batch transfer.');
    return false;
}

module.exports = { sendNFTBatch };