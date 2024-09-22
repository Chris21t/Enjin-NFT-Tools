const { ApiPromise, Keyring } = require('@polkadot/api');
const { decryptSeed } = require('./utils/encryptionUtil');
const nonceManager = require('./nonceManager');
const logger = require('./utils/logger');
const config = require('./config/config');

async function mintNFT(collectionId, tokenId, address, amount) {
    try {
        await nonceManager.initializeApi();
        const api = nonceManager.getApiInstance();
        const SEED_PHRASE = decryptSeed();
        const keyring = new Keyring({ type: 'sr25519' });
        keyring.setSS58Format(config.network.format);
        const SENDER = keyring.addFromMnemonic(SEED_PHRASE);
        const mintParams = { Mint: { tokenId, amount, unitPrice: null } };

        const nonce = await nonceManager.getNextNonce();
        const txHash = await attemptMint(nonce, api, SENDER, address, collectionId, mintParams);

        if (txHash) {
            return { txHash };
        } else {
            throw new Error('Minting unsuccessful after all attempts.');
        }
    } catch (error) {
        logger.error(`❌ Minting failed: ${error.message}`);
        throw error;
    }
}

async function attemptMint(nonce, api, SENDER, address, collectionId, mintParams) {
    const MAX_RETRIES = 3;
    let retryDelay = 1000;
    
    for (let retries = 0; retries < MAX_RETRIES; retries++) {
        try {
            const mintExtrinsic = api.tx.multiTokens.mint(address, collectionId, mintParams);
            const txHash = await new Promise((resolve, reject) => {
                mintExtrinsic.signAndSend(SENDER, { nonce }, ({ status }) => {
                    if (status.isFinalized) {
                        const hash = mintExtrinsic.hash.toString();
                        logger.info(`✅ Minting successful. Transaction finalized with hash: ${hash}`);
                        resolve(hash); // Resolve with the transaction hash
                    } else if (status.isDropped || status.isInvalid) {
                        reject(new Error(`Transaction failed: ${status.toString()}`));
                    }
                });
            });

            api.disconnect();
            return txHash; // Return the transaction hash if successful
        } catch (error) {
            logger.error(`❌ Minting attempt failed: ${error.message}`);
            if (isNonceError(error)) {
                await sleep(retryDelay);
                retryDelay *= 2;
                nonce = await nonceManager.synchronizeNonce();
            } else {
                throw error;
            }
        }
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function confirmTransaction(api, txHash) {
    try {
        // Waiting a period for the transaction to be included in a block
        await sleep(15000); // Adjust the time as necessary

        // Check the recent blocks to find the transaction hash
        for (let i = 0; i < 1; i++) { // Check the last 6 blocks (adjust as needed)
            const blockHash = await api.rpc.chain.getBlockHash(-i); // Get recent block hashes
            const block = await api.rpc.chain.getBlock(blockHash); // Get the full block

            // Check if the block contains the transaction hash
            if (block.block.extrinsics.some(extrinsic => extrinsic.hash.toString() === txHash)) {
                return true; // Transaction found in the block
            }
        }

        return false; // Transaction not found in recent blocks
    } catch (error) {
        logger.error(`Error confirming transaction: ${error.message}`);
        return false;
    }
}

function isNonceError(error) {
    return error.message.includes('1010: Invalid Transaction') || 
           error.message.includes('Priority is too low');
}

module.exports = { mintNFT };