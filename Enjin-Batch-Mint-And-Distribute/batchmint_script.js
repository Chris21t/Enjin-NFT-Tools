// 🌌 Imports 🌌
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { cryptoWaitReady, decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import fs from 'fs';
import winston from 'winston';

// ✨ Transaction Pool Management ✨
class TransactionPool {
    constructor() {
        this.PENDING_POOL_LIMIT = 10000;
        this.transactionID = 1;
        this.pending = new Map();
        this.listeners = new Set();
        this.successfulTxCount = 0;
    }

    // Subscribe to transaction status updates.
    subscribe(listener) {
        this.listeners.add(listener);
    }

    // Unsubscribe from transaction status updates.
    unsubscribe(listener) {
        this.listeners.delete(listener);
        logger.debug(`Listener unsubscribed. Current listeners count: ${this.listeners.size}`);
    }

    // Unsubscribe all listeners.
    unsubscribeAll() {
        this.listeners.forEach(listener => {
            this.unsubscribe(listener);
        });
    }

    // Update the status of a transaction in the pool.
    updateTransactionStatus(txID, status, result) {
        logger.debug(`Received update for txID: ${txID} with status: ${status}`);
        if (FINAL_STATUS.includes(status)) {
            this.pending.delete(txID);
            if (status === "Finalized") {
                this.successfulTxCount++;
                logger.debug(`Transaction ${txID} finalized. Total successful transactions: ${this.successfulTxCount}`);
            }
        } else {
            this.pending.set(txID, status);
        }

        this.listeners.forEach(async (listener) => {
            try {
                await listener(txID, status, result);
            } catch (exception) {
                console.error(exception);
            }
        });
    }

    // Generate a unique transaction ID.
    nextTransactionID() {
        return this.transactionID++;
    }

    // Get the number of pending transactions.
    getPendingCount() {
        return this.pending.size;
    }

    // Get the limit for pending transactions.
    getPendingLimit() {
        return this.PENDING_POOL_LIMIT;
    }

    // Get the number of successful transactions.
    getSuccessfulTxCount() {
        return this.successfulTxCount;
    }

    // Send a transaction to the blockchain.
    send(options, extrinsic) {
        if (this.getPendingCount() >= this.getPendingLimit()) {
            throw new Error("transaction pool is full");
        }

        let txID = this.nextTransactionID();
        logger.debug(`Sending transaction with ID: ${txID}`);

        extrinsic.signAndSend(options.signer, options).then((result) => {
            logger.info(`🎉 Transaction ${txID} was successful with result: ${result}`);
            this.updateTransactionStatus(txID, TxStatus.Finalized, result);
        }).catch((error) => {
            logger.error(`🚫 Error sending transaction ${txID}: ${error.message}`);
            this.updateTransactionStatus(txID, TxStatus.Invalid, error);
        });

        return txID;
    }
}

// 🖋 Logger Setup 🖋
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'batchmint.log' })
    ]
});

// 🌐 Network Configurations 🌐
const RPC_URLS = {
    enjin: {
        uri: "wss://rpc.matrix.blockchain.enjin.io",
        format: 1110,
    },
    canary: {
        uri: "wss://rpc.matrix.canary.enjin.io",
        format: 9030,
    }
};

// 🎨 Account and Token Configuration 🎨
const RPC_NODE = RPC_URLS.enjin;
const SEED_PHRASE = "grid blanket blast twenty junk cake grid blanket blast twenty junk cake";
const COLLECTION_ID = 2402;
const TOKEN_START_MINT = 251;
const TOKEN_END_MINT = 255;
const METADATA_PATH = "https://nft.production.enjinusercontent.com/metadata/tokens/6y53myseglxljqbo.json";
const DISTINCT = false;
const TOKEN_DISTRIBUTION = false;

// 🚀 TRANSACTION HANDLING 🚀
const RETRY_LIMIT = 3;
const DELAY_BETWEEN_RETRIES = 12000;
const txPool = new TransactionPool();

const TxStatus = {
    Future: "Future",
    Ready: "Ready",
    Broadcast: "Broadcast",
    InBlock: "InBlock",
    Retracted: "Retracted",
    FinalityTimeout: "FinalityTimeout",
    Finalized: "Finalized",
    Usurped: "Usurped",
    Dropped: "Dropped",
    Invalid: "Invalid",
};

const FINAL_STATUS = [
    "FinalityTimeout",
    "Finalized",
    "Usurped",
    "Dropped",
    "Invalid",
];

// 🎁 TOKEN DISTRIBUTION LOGIC 🎁
let walletAddresses = [];

if (TOKEN_DISTRIBUTION) {
    // Load potential recipients from a file.
    walletAddresses = fs.readFileSync('batchmint_list.txt', 'utf-8')
        .split('\n')
        .map(address => address.trim())
        .filter(Boolean);

    // Ensure there are enough addresses for the tokens being minted.
    if (walletAddresses.length < (TOKEN_END_MINT - TOKEN_START_MINT + 1)) {
        logger.error("🚫 Not enough addresses in the TXT file for the number of tokens to mint.");
        process.exit(1);
    }

    // Validate each address for compatibility with the chosen network.
    walletAddresses.forEach(address => {
        try {
            const decoded = decodeAddress(address);
            const encoded = encodeAddress(decoded, RPC_NODE.format);
            if (address !== encoded) {
                throw new Error(`Address not valid for the network: ${address}`);
            }
        } catch (error) {
            logger.error("🚫 Error decoding address:", error.message);
            process.exit(1);
        }
    });
}

// 🎯 MAIN EXECUTION FUNCTION 🎯
async function run() {
    const wsProvider = new WsProvider(RPC_NODE.uri);
    const api = await ApiPromise.create({
        provider: wsProvider,
        throwOnConnect: true,
    });

    try {
        await main(api);
    } catch (error) {
        logger.error(`Error occurred: ${error.message}`);
        txPool.unsubscribeAll(); // Unsubscribe all listeners on error
    } finally {
        await new Promise(resolve => setTimeout(resolve, 12000)); // Wait for 12 seconds
        logger.info("🔌 Disconnecting from the blockchain network...");
        api.disconnect();
        wsProvider.disconnect();
    }
}

// 📦 BATCHED TRANSACTION LOGIC 📦
async function sendInBatch(signer, steps, nonce, buildExtrinsic, api) {
    let step = 0;
    let nextNonce = nonce;

    const sendTransaction = async (retryCount = 0) => {
        try {
            const extrinsic = buildExtrinsic(nextNonce);
            let txID = txPool.send({ signer, nonce: nextNonce }, extrinsic);
            nextNonce++;
            step++;
            logger.info(`Sent transaction: ${txID}`);
            return txID;
        } catch (error) {
            logger.error(`Error in sendTransaction: ${error.message}`);
        }
    };

    // A promise that will resolve when all transactions are finalized.
    const allFinalized = new Promise((resolve) => {
        let listener = async function (txID, status, result) {
            logger.debug(`Received status ${status} for txID: ${txID}`);
            logger.info(`Transaction ${txID} status: ${status}`);
            switch (status) {
                case TxStatus.Ready:
                    return;
                case TxStatus.Broadcast:
                    if (step < steps && txPool.getPendingCount() < txPool.getPendingLimit()) {
                        await sendTransaction();
                    }
                    return;
                case TxStatus.InBlock:
                    logger.info(`Transaction in block: ${txID}`);
                    inBlock++;
                    if (inBlock >= step) {
                        txPool.unsubscribe(listener);
                    }
                    break;
                case TxStatus.Finalized:
                    logger.info(`Transaction ${txID} has been finalized!`);
                    txPool.unsubscribe(listener);
                    logger.debug(`Current successfulTxCount after finalization: ${txPool.getSuccessfulTxCount()}`);
                    // Check if all transactions have been processed.
                    if (txPool.getPendingCount() === 0) {
                        // Cleanup logic to ensure all listeners are unsubscribed
                        txPool.unsubscribeAll();
                        resolve();
                    }
                    break;
                case TxStatus.Dropped:
                case TxStatus.Usurped:
                case TxStatus.FinalityTimeout:
                case TxStatus.Invalid:
                    logger.error(`Transaction ${txID} has encountered an error status: ${status}`);
                    txPool.unsubscribe(listener);
                    break;
                default:
                    logger.error(`Transaction ${txID} encountered an unhandled status: ${status}`);
                    break;
            }
        };

        txPool.subscribe(listener);
    });

    await sendTransaction();
    await allFinalized;  // Wait for the promise to resolve.
    
    // Return the number of successful transactions.
    return {
        successfulTxCount: txPool.getSuccessfulTxCount(),
        txPool: txPool
    };
}

//Function to check the transaction status repeatedly
async function checkTransactionStatus(api, txHash, retries = 5) {
    while (retries > 0) {
        const txStatus = await api.rpc.payment.queryTransactionStatus(txHash);
        if (txStatus.isFinalized) {
            return true;
        } else {
            await new Promise(resolve => setTimeout(resolve, 5000)); // wait for 5 seconds
            retries--;
        }
    }
    return false;
}

// 🔥 CORE SCRIPT LOGIC 🔥
async function main(api) {
    let isConnected = true;

    try {
        logger.info("Reading directory with private keys...");

        const keyring = new Keyring({ type: "sr25519" });
        keyring.setSS58Format(RPC_NODE.format);

        const ALICE = keyring.addFromMnemonic(SEED_PHRASE);

        logger.info("Getting nonce from the account...");
        let { nonce } = await api.query.system.account(ALICE.publicKey);
        logger.info(`Nonce: ${nonce}`);

        logger.info("Building transactions:");

        const tokensMint = [];
        for (let tokenId = TOKEN_START_MINT, i = 0; tokenId <= TOKEN_END_MINT; tokenId++, i++) {
            const accountId = TOKEN_DISTRIBUTION ? walletAddresses[i] : ALICE.address;

            const baseMetadataUrl = METADATA_PATH.substring(0, METADATA_PATH.lastIndexOf("/") + 1);
            const metadataFilename = DISTINCT ? `${tokenId}.json` : METADATA_PATH.split('/').pop();
            const metadataPath = baseMetadataUrl + metadataFilename;

            tokensMint.push({
                accountId: accountId,
                params: {
                    CreateToken: {
                        tokenId: tokenId,
                        initialSupply: 1,
                        sufficiency: "Insufficient",
                        cap: "SingleMint",
                        behavior: null,
                        unitPrice: "1000000000000000000",
                        listingForbidden: false,
                        attributes: [
                            {
                                key: "uri",
                                value: metadataPath,
                            },
                        ],
                    },
                },
            });

            logger.info(`Token ID: ${tokenId} URI: ${metadataPath} will be minted to address: ${accountId}`);
        }

        // Calculate estimatedTransactionCost based on the provided values
        const CENJ_TO_SUBCENJ = BigInt(10**18);
        const estimatedMintCost = BigInt(Math.round(0.0100 * 10**18));
        const estimatedAttributeCost = BigInt(Math.round(0.2084 * 10**18));
        const estimatedTransferFee = BigInt(Math.round(0.025 * 10**18));
        const estimatedTransactionCost = estimatedMintCost + estimatedAttributeCost + estimatedTransferFee;

        // Check Account Balance Before Transactions
        const accountInfo = await api.query.system.account(ALICE.publicKey);
        const balance = accountInfo.data.free;
        const requiredBalance = BigInt(tokensMint.length) * estimatedTransactionCost;

        if (balance.lt(requiredBalance)) {
            logger.error("Account balance is too low for all transactions.");
            throw new Error("Insufficient balance.");
        }

        // Store the result of sendInBatch in a variable named 'result'
        let txPool = new TransactionPool();
        let result = await sendInBatch(ALICE, 1, nonce, (nextNonce) => {
            return api.tx.multiTokens.batchMint(COLLECTION_ID, tokensMint);
        }, txPool);

        const delay = 10 * 1000;  // 10 seconds
        await new Promise(resolve => setTimeout(resolve, delay));

        const expectedTransactions = 1;
        if (result.successfulTxCount === expectedTransactions) {
            logger.info("All tokens minted successfully!");
        } else {
            logger.error(`Only ${result.successfulTxCount} out of ${expectedTransactions} transactions were successful.`);
            throw new Error("Not all tokens were minted successfully.");
        }

        logger.info("Batch sending process complete.");
        logger.info(`Total transactions attempted: ${tokensMint.length}`);
        
        logger.info("Script has finished all tasks.");
    } catch (error) {
        logger.error(`Error occurred: ${error.message}`);
    } finally {
        if (isConnected) {
            try {
                await api.disconnect();
                logger.info("Disconnected from the API successfully.");
            } catch (disconnectError) {
                logger.error(`Error occurred while disconnecting: ${disconnectError.message}`);
            }
        }
    }
}

function safeStringify(obj, indent = 2) {
    let cache = [];
    const retVal = JSON.stringify(
        obj,
        (key, value) =>
            typeof value === "object" && value !== null
                ? cache.includes(value)
                    ? undefined // Duplicate reference found, discard key
                    : cache.push(value) && value // Store value in our collection
                : value,
        indent
    );
    cache = null;
    return retVal;
}

// 🚀 SCRIPT EXECUTION 🚀
async function executeScript() {
    try {
        await run();
    } catch (error) {
        logger.error(`🚫 Fatal error: ${error.message}`);
        logger.debug(error.stack); // Log the complete stack trace for debugging
    } finally {
        let retries = 3; // number of retries before force exit
        const checkAndExit = () => {
        const activeHandles = process._getActiveHandles();
            if (activeHandles.length > 0) {
                if (retries > 0) {
                    logger.warn(`🔍 Active Listeners: ${activeHandles.length}. Retrying in 12 seconds...`);
                    activeHandles.forEach(handle => logger.debug(`Active handle type: ${handle.constructor.name}`));
                    // Log the type of active handles for debugging
                    activeHandles.forEach(handle => {
                        logger.debug(`Active handle type: ${handle.constructor.name}`);
                        if (handle.constructor.name === 'Socket') {
                            logger.debug('Socket details:', safeStringify({
                                localAddress: handle.localAddress,
                                localPort: handle.localPort,
                                remoteAddress: handle.remoteAddress,
                                remotePort: handle.remotePort,
                            }));
                        } else {
                            // Print detailed information about the handle using the safeStringify function
                            logger.debug(safeStringify(handle, null, 2)); // Indentation of 2 for clearer output
                        }
                    });
                    retries--;
                    setTimeout(() => {
                        logger.debug('Exiting after setTimeout delay.');
                        checkAndExit();
                    }, 12000);
                } else {
                    logger.error("🚫 Maximum retries reached. Forcefully exiting.");
                    process.exit(1);
                }
            } else {
                logger.info("🔍 No active listeners. Exiting gracefully.");
                process.exit(0);
            }
        };
        
        checkAndExit();
    }
}

executeScript();