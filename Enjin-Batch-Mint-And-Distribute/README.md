# BatchMint Script

Welcome to `batchmint_script.js` - your ultimate minting companion in the NFT world. Designed meticulously for blockchain interactions, this script allows you to mint tokens with unparalleled efficiency and precision. Say goodbye to individual minting and embrace the future of batch processing.

---

## 🌟 Key Features

- **Batch Minting**: Mint up to 250 NFTs in a single operation, making the process swift and hassle-free.
- **Automatic Distribution**: Activate this to instantly send minted NFTs to a predefined list of addresses as defined in the `batchmint_list.txt`.
- **Dynamic Metadata**: Flexibility is key. Choose between unique or shared metadata for each minted token.
- **Transaction Management**: Navigate the complexities of transaction retries and pool overflows with grace.
- **Error Handling**: Comprehensive logging, both to the console and `batchmint.log`, ensures troubleshooting is straightforward.
- **Security**: Rest easy with the robustness of mnemonic-based authentication.

---

## 🔧 Configuration Parameters

Customize the script to your needs with the following parameters:

- **RPC_NODE**: The network you want to use
  *Example*: RPC_URLs.canary (Testnet)
- **SEED_PHRASE**: Your account's mnemonic seed phrase.
  *Example*: "word1 word2 word3 ... word12"
- **COLLECTION_ID**: A unique identifier for your token collection.
  *Example*: 2305
- **TOKEN_START_MINT & TOKEN_END_MINT**: Define your minting range. Please keep in mind that only 250 tokens can be created, minted and distributed at once.
  *Example*: TokenID 1 to 250
- **METADATA_PATH**: Direct the script to your token's metadata.
  *Example*: "https://mydomain.com/metadata/token.json"
- **DISTINCT**: Choose how you want to handle metadata. If set to true, each minted token uses specific tokenIDs (like 1.json, 2.json). If false, a single static file (like "token.json") is used.
  *Example*: true or false
- **TOKEN_DISTRIBUTION**: Control your distribution. If true, tokens are sent using addresses from `batchmint_list.txt`. If false, they're minted to the creator's account.
  *Example*: true or false

---

## 🛠 Usage Guide

1. **Setup**: Make sure Node.js graces your system.
2. **Install Dependencies**: In the script's directory, breathe life into it with `npm install`.
3. **Tailor Your Experience**: Tweak the configuration parameters in the script to your liking.