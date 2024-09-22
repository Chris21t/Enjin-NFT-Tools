// helpers/getMintingData.js

const fs = require('fs');
const path = require('path');
//const { mintTokens } = require('../mintTokens'); // Import the mintTokens function from the root
const logger = require('../utils/logger');

function attoToENJ(attoBalance) {
    return (BigInt(attoBalance) / BigInt(1e18)).toString();
}

function readTokenAccountData() {
    try {
        const filePath = path.join(__dirname, '..', 'token_account_data.json');
        const jsonData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(jsonData);
    } catch (error) {
        logger.error('Error reading token account data:', error);
        throw error;
    }
}

async function getMintingData() {
    try {
        const data = readTokenAccountData();
        const balanceAtto = BigInt(data.balance.replace(/,/g, ''));

        const thresholdENJ = 50; // Threshold in ENJ
        const thresholdToken = 5000; // Threshold for balanceToken
        const maxMint = 2500; // Maximum amount of tokens to mint at once
        const mintCostENJ = 0.01; // Cost of minting one token in ENJ

        const thresholdAtto = BigInt(thresholdENJ) * BigInt(1e18);
        const surplusENJAtto = balanceAtto > thresholdAtto ? balanceAtto - thresholdAtto : BigInt(0);
        const surplusENJ = Number(attoToENJ(surplusENJAtto));
        
        // Correctly initialize balanceToken before it's used
        const balanceToken = parseInt(data.tokens.find(token => token.type === 'balanceToken').balance.replace(/,/g, ''), 10);

        let calculatedMints = Math.floor(surplusENJ / mintCostENJ);
        // Apply the max mint cap after checking the balanceToken threshold
        calculatedMints = balanceToken < thresholdToken ? Math.min(calculatedMints, maxMint) : 0;

        const balanceData = {
            address: data.address,
            balance: Number(attoToENJ(balanceAtto)),
            thresholdENJ,
            thresholdToken,
            surplus: surplusENJ,
            mintsUpcoming: calculatedMints,
            balanceToken,
            timestamp: new Date(Date.now()).toLocaleString(),
        };

        if (balanceData.mintsUpcoming > 0) {
            //await mintTokens(calculatedMints, balanceData);
            const message = "I could theoretically mint";
            logger.info(message);
        } else {
            const message = "No tokens to mint or threshold not met.";
            logger.info(message);
        }

        const mintingReportPath = path.join(__dirname, '..', 'mintingReport.json');
        fs.writeFileSync(mintingReportPath, JSON.stringify(balanceData, null, 2), 'utf8');
        logger.info(`Minting report saved to: mintingReport.json`);

    } catch (error) {
        logger.error('Error in getMintingData:', error);
    }
}

module.exports = getMintingData;
