import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { decodeAddress } from '@polkadot/util-crypto';
import { isHex, isU8a } from '@polkadot/util';
import inquirer from 'inquirer';
import readline from 'readline';
import winston from 'winston';
import fs from 'fs';
import chalk from'chalk';

// Replace with your seed phrase
const SEED_PHRASE = "toward tuition nature nature ill drill toward tuition nature nature ill drill";

// Logger setup
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
        new winston.transports.File({ filename: 'transaction.log' })
    ]
});

//Validate addresses
function isValidAddress(address) {
    try {
        const decoded = decodeAddress(address);
        return isHex(decoded) || isU8a(decoded);
    } catch (error) {
        return false;
    }
}

// Network configurations
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getUserInput() {
    const questions = [
        {
            type: 'list',
            name: 'NETWORK',
            message: chalk.blue('Select the network:'),
            choices: ['enjin', 'canary']
        },
        {
            type: 'input',
            name: 'COLLECTION_ID',
            message: chalk.blue('Enter the Collection ID:')
        },
        {
            type: 'input',
            name: 'tokenId',
            message: chalk.blue('Enter the tokenId:')
        },
        {
            type: 'input',
            name: 'amount',
            message: chalk.blue('Enter the amount to send:')
        },
        {
            type: 'list',
            name: 'recipientMode',
            message: chalk.blue('Select recipient mode:'),
            choices: ['single', 'multiple']
        },
        {
            type: 'input',
            name: 'singleRecipient',
            message: chalk.blue('Enter the recipient address:'),
            when: answers => answers.recipientMode === 'single'
        }
    ];

    return inquirer.prompt(questions);
}

// Main logic
// Main logic
async function main() {
    const answers = await getUserInput();

    const wsProvider = new WsProvider(RPC_URLS[answers.NETWORK].uri);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    keyring.setSS58Format(RPC_URLS[answers.NETWORK].format);

    const SENDER = keyring.addFromMnemonic(SEED_PHRASE);
    let { nonce } = await api.query.system.account(SENDER.address);
    nonce = nonce.toBn().toNumber();

    let recipients;
    if (answers.recipientMode === 'single') {
        recipients = [answers.singleRecipient];
    } else {
        recipients = fs.readFileSync('recipients.txt', 'utf-8')
            .split('\n')
            .map(address => address.trim())
            .filter(address => isValidAddress(address))
            .slice(0, parseInt(answers.amount));
    }

    const validRecipients = recipients.filter(isValidAddress);

    const transfers = validRecipients.map(recipient => {
        const sendAmount = answers.recipientMode === 'single' ? parseInt(answers.amount) : 1;
        return api.tx.multiTokens.transfer(recipient, answers.COLLECTION_ID, {
            Simple: {
                tokenId: answers.tokenId,
                amount: sendAmount,
                keepAlive: true
            }
        });
    });

    try {
        const batchExtrinsic = api.tx.utility.batch(transfers);
        await batchExtrinsic.signAndSend(SENDER, { nonce });
        logger.info(`Batch transfer sent with nonce: ${nonce}`);
    } catch (error) {
        logger.error(`Batch transfer failed: ${error.message}`);
        return;
    }

    validRecipients.forEach(recipient => {
        const sendAmount = answers.recipientMode === 'single' ? parseInt(answers.amount) : 1;
        logger.info(`Sent ${sendAmount} of tokenId: ${answers.tokenId} from collection: ${answers.COLLECTION_ID} to recipient: ${recipient}`);
    });

    wsProvider.disconnect();
}

// Execute the script
main().catch(error => {
    logger.error(`Error occurred: ${error.message}`);
});