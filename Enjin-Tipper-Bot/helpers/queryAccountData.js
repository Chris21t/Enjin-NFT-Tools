const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');

const JSON_FILE_PATH = 'token_account_data.json';
const ADDRESS = config.address; // Use address from config

// Token details
const BALANCE_TOKEN_DETAILS = { collectionId: 2479, tokenId: 9 };
const CHARGE_TOKEN_DETAILS = { collectionId: 2479, tokenId: 1 };

async function queryAccountData() {
    try {
        const timestamp = Date.now();
        const accountData = {
            address: ADDRESS,
            balance: '0', // Initialize balance to '0'
            reserved: '0', // Initialize reserved to '0'
            tokens: [], // Array to store token details
            nonce: '0', // Initialize nonce to '0'
            timestamp: new Date(timestamp).toLocaleString(),
        };

        const wsProvider = new WsProvider(config.network.uri); // Use network URI from config
        const api = await ApiPromise.create({ provider: wsProvider });

        // Retrieve the account balance & nonce
        const { data: balance, nonce } = await api.query.system.account(ADDRESS);
        if (balance) {
            accountData.balance = balance.free.toHuman() || '0'; // Human-readable format
            accountData.reserved = balance.reserved.toHuman() || '0'; // Human-readable format
        }
        accountData.nonce = nonce.toHuman() || '0';

        // Query the balanceToken balance
        const balanceTokenBalance = await api.query.multiTokens.tokenAccounts(
            BALANCE_TOKEN_DETAILS.collectionId,
            BALANCE_TOKEN_DETAILS.tokenId,
            ADDRESS
        );
        accountData.tokens.push({
            type: 'balanceToken',
            balance: balanceTokenBalance.isSome ? balanceTokenBalance.unwrap().balance.toHuman() : '0',
            collectionId: BALANCE_TOKEN_DETAILS.collectionId,
            tokenId: BALANCE_TOKEN_DETAILS.tokenId
        });

        // Query the chargeToken balance
        const chargeTokenBalance = await api.query.multiTokens.tokenAccounts(
            CHARGE_TOKEN_DETAILS.collectionId,
            CHARGE_TOKEN_DETAILS.tokenId,
            ADDRESS
        );
        accountData.tokens.push({
            type: 'chargeToken',
            balance: chargeTokenBalance.isSome ? chargeTokenBalance.unwrap().balance.toHuman() : '0',
            collectionId: CHARGE_TOKEN_DETAILS.collectionId,
            tokenId: CHARGE_TOKEN_DETAILS.tokenId
        });

        // Debugging log
        console.log('Account Data:', accountData);

        // Write the account data to a JSON file
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(accountData, null, 2), 'utf8');
        console.log(`Account data saved to: ${JSON_FILE_PATH}`);

        await api.disconnect();
    } catch (error) {
        logger.error('Error querying account data:', error);
    }
}


module.exports = queryAccountData;