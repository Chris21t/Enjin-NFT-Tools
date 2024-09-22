const fs = require('fs').promises;
const path = require('path');
const { sendNFT } = require('./nftSender');
const { sendNFTBatch } = require('./nftBatchSender');
const logger = require('./utils/logger');

const transactionQueue = [];
let isProcessing = false;
const MAX_RETRIES = 3;
const MIN_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 250;

logger.info('👍 Transaction queue function started.');

// Function to add a transaction to the queue
function addToQueue(transactionData) {
    transactionQueue.push({
        data: transactionData,
        retries: 0
    });
    const recipientInfo = transactionData.recipientUsername ? `${transactionData.recipientUsername}` : 'Anonymous Tipper';
    logger.info(`📥 Transaction added to queue. Sent to: ${recipientInfo}. Queue length: ${transactionQueue.length}`);
}

// Function to log failed transactions after MAX_RETRIES
async function logFailedTransaction(transaction) {
    const failedTransactionsPath = path.join(__dirname, 'failedTransactions.json');
    const failedTransaction = { ...transaction, failedAt: new Date().toISOString() };

    try {
        let failedTransactions = [];
        try {
            const data = await fs.readFile(failedTransactionsPath, { encoding: 'utf-8' });
            failedTransactions = JSON.parse(data);
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                throw readError;
            }
        }

        failedTransactions.push(failedTransaction);
        await fs.writeFile(failedTransactionsPath, JSON.stringify(failedTransactions, null, 2));
        logger.info(`📝 Transaction logged as failed after ${MAX_RETRIES} retries.`);
    } catch (error) {
        logger.error(`❌ Error logging failed transaction: ${error.message}`);
    }
}

// Function to requeue a transaction, with a limit on retries
function requeueTransaction(transaction) {
    if (transaction.retries < MAX_RETRIES) {
        transaction.retries++;
        transactionQueue.unshift(transaction);
        logger.info(`🔁 Transaction requeued. Retry count: ${transaction.retries}`);
    } else {
        logger.error(`❌ Transaction failed after ${MAX_RETRIES} retries.`);
        logFailedTransaction(transaction);
    }
}

async function processQueue() {
    if (isProcessing || transactionQueue.length === 0) {
        return;
    }

    isProcessing = true;

    try {
        // Group transactions by collectionId-tokenId pair
        let groupedTransactions = transactionQueue.reduce((acc, transaction) => {
            const key = `${transaction.data.collectionId}-${transaction.data.tokenId}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(transaction);
            return acc;
        }, {});

        // Empty the main queue
        transactionQueue.length = 0;

        // Process each group of transactions
        for (const [groupKey, transactions] of Object.entries(groupedTransactions)) {
            const [collectionId, tokenId] = groupKey.split('-');

            while (transactions.length > 0) {
                // Determine the size of the current batch
                const batchSize = Math.min(transactions.length, MAX_BATCH_SIZE);

                // Prepare the batch with the determined size
                const batch = transactions.splice(0, batchSize);
                const batchData = batch.map(tx => ({
                    ...tx.data, // Spread the data object to include all its properties
                    address: tx.data.recipientAddress // Ensure the address property is explicitly included
                }));

                // If we have enough for a minimum batch size, we send a batch
                if (batchData.length >= MIN_BATCH_SIZE) {
                    const success = await sendNFTBatch(batchData, collectionId, tokenId, batchData.length);
                    if (!success) {
                        // If batch fails, requeue the transactions
                        batch.forEach(requeueTransaction);
                    } else {
                        logger.info(`🚀 Batch of ${batchData.length} transactions for Token ${tokenId} in Collection ${collectionId} sent!`);
                    }
                    // Introduce a delay between batch processing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // If less than MIN_BATCH_SIZE, send transactions individually
                    for (const transaction of batch) {
                        const recipientInfo = transaction.data.recipientUsername ? transaction.data.recipientUsername : 'Anonymous Tipper';
                        const success = await sendNFT(transaction.data);
                        if (!success) {
                            requeueTransaction(transaction);
                        } else {
                            logger.info(`🚀 Transaction for Token ${tokenId} in Collection ${collectionId} sent to ${recipientInfo}!`);
                        }
                        // Introduce a delay of 2 seconds between individual transactions
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        }
    } catch (error) {
        logger.error(`❌ Error processing transaction queue: ${error.message}`);
        // Requeue any transactions that might have been left in the groupedTransactions during an error
        Object.values(groupedTransactions).flat().forEach(requeueTransaction);
    } finally {
        isProcessing = false;
        // Schedule the next processing round if there are transactions left
        if (transactionQueue.length > 0) {
            setTimeout(processQueue, 5000);
        }
    }
}

module.exports = { addToQueue, processQueue };
