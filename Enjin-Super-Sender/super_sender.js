import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import inquirer from 'inquirer';
import readline from 'readline';
import winston from 'winston';
import fs from 'fs';
import chalk from'chalk';

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

// Network configurations
const RPC_URLS = {
    efinity: {
        uri: "wss://rpc.efinity.io",
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
            choices: ['efinity', 'canary']
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
async function main() {
    const answers = await getUserInput();
    
    const SEED_PHRASE = "grid blanket blast twenty junk cake grid blanket blast twenty junk cake";  // Replace with your seed phrase

    const wsProvider = new WsProvider(RPC_URLS[answers.NETWORK].uri);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: "sr25519" });
    keyring.setSS58Format(RPC_URLS[answers.NETWORK].format);

    let recipients = [];
    if (answers.recipientMode === 'single') {
        recipients.push(answers.singleRecipient);
    } else if (answers.recipientMode === 'multiple') {
        recipients = fs.readFileSync('recipients.txt', 'utf-8')
            .split('\n')
            .map(address => address.trim())
            .filter(Boolean)
            .slice(0, parseInt(answers.amount)); // take only the number of recipients as specified by amount
    }

    const SENDER = keyring.addFromMnemonic(SEED_PHRASE);
    let { nonce } = await api.query.system.account(SENDER.publicKey);

    for (const recipient of recipients) {
        const sendAmount = answers.recipientMode === 'single' ? parseInt(answers.amount) : 1;  // If multiple recipients, each gets 1
    
        const extrinsic = api.tx.multiTokens.transfer(recipient, answers.COLLECTION_ID, {
            Simple: {
                tokenId: answers.tokenId,
                amount: sendAmount,
                keepAlive: true  // Keep the token alive; adjust as necessary
            }
        });
        await extrinsic.signAndSend(SENDER, { nonce: nonce++ });
    
        logger.info(`Sent ${sendAmount} of tokenId: ${answers.tokenId} from collection: ${answers.COLLECTION_ID} to recipient: ${recipient}`);
    }

    wsProvider.disconnect();
}

// Execute the script
main().catch(error => {
    logger.error(`Error occurred: ${error.message}`);
});