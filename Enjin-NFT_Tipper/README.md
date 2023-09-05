
# NFT Tipper Bot

A simple bot for tipping Enjin Blockchain NFTs.

## Setup and Installation

### 1. Encrypting your Seed Phrase

- Begin with the `crypt_it.js` script. This script allows you to encrypt your seed phrase.
- Run the script:

```
node crypt_it.js
```

- Upon execution, it will generate an `encryptedSeed.txt` file containing your encrypted seed phrase. Additionally, it will provide you with an encryption key and an IV (Initialization Vector).

### 2. Setting Up Decryption Utility

- Open the `encryptionUtil.js` file.
- Replace the placeholders `YOUR_ENCRYPTION_KEY` and `YOUR_IV` with the encryption key and IV generated in the previous step.

### 3. Configuring the Bot

- Open the `config.json` file. Initially, it's set to use the testing environment. Change accordingly.
- Replace the placeholders `YOUR_COLLECTION_ID` and `YOUR_TOKEN_ID` with your collection ID and token ID respectively.

### 4. Setting Up the NFT Tipper Bot

- Open the `NFT_TIPPER.js` file.
- Replace the placeholder `YOUR_BOT_TOKEN` with your bot token to connect the bot to your Telegram application.

### 5. Installing Dependencies

Before running the bot, ensure you have all the necessary dependencies installed:

```
npm install
```

This will install all the required packages listed in the `package.json` file.

## Running the Bot

Once all configurations are in place and dependencies are installed, you can start the bot with:

```
node NFT_TIPPER.js
```

## Safety and Precautions

- Never share your seed phrase, encryption key, or IV.
- Always keep backups of important data.
- Ensure that your bot token remains private.
