const { Keyring } = require('@polkadot/api');
const { decryptSeed } = require('./utils/encryptionUtil');
const config = require('./config/config');
const logger = require('./utils/logger');
const nonceManager = require('./nonceManager');

logger.info('👍 nftSender function started.');

const MAX_RETRIES = 3; // Define the maximum number of retries in case of a nonce error

// Function to check if the transaction failed due to nonce issues
function isNonceError(error) {
    return error.message.includes('1010: Invalid Transaction') || 
           error.message.includes('Priority is too low');
}

// Function to send a single NFT with integrated nonce management
async function sendNFT(transactionData) {
    // Validate transaction data
    if (!transactionData || !transactionData.recipientAddress || !transactionData.collectionId || !transactionData.tokenId) {
        logger.error('❌ Invalid transaction data:', transactionData);
        return { success: false, error: 'Invalid transaction data.' };
    }

    const { recipientAddress, recipientUsername, collectionId, tokenId } = transactionData;
    const recipientInfo = recipientUsername ? recipientUsername : "Anonymous";
    const SEED_PHRASE = decryptSeed();
    const keyring = new Keyring({ type: "sr25519" });
    keyring.setSS58Format(config.network.format);
    const SENDER = keyring.addFromMnemonic(SEED_PHRASE);
    const api = nonceManager.getApiInstance();

    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            logger.info(`📝 Attempt ${retries + 1}: Preparing to send ${collectionId}-${tokenId} to: ${recipientInfo}.`);
            
            // Get the next nonce atomically
            const nonce = await nonceManager.getNextNonce();
            
            const transferExtrinsic = api.tx.multiTokens.transfer(recipientAddress, collectionId, {
                Simple: {
                    tokenId: tokenId,
                    amount: 1,
                    keepAlive: true
                }
            });
            
            // Sign and send the transaction, waiting for the result
            const result = await transferExtrinsic.signAndSend(SENDER, { nonce });
            
            // Handle transaction success
            logger.info(`✅ Transfer to ${recipientInfo} successful. (${result.toHex()})`);
            return { success: true, txHash: result.toHex(), recipient: recipientInfo };
        } catch (error) {
            if (isNonceError(error)) {
                logger.error(`⚠️ Nonce error detected on attempt ${retries + 1}. Synchronizing nonce and retrying transaction.`);
                await nonceManager.synchronizeNonce();
                retries++;
            } else {
                // Handle any other error
                logger.error(`❌ Token transfer failed: ${error.message}`);
                return { success: false, error: error.message };
            }
        }
    }

    // If all retries fail, return the last error
    return { success: false, error: 'Maximum retries reached for nonce synchronization.' };
}

module.exports = { sendNFT };