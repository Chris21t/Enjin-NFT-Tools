const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger'); // Path to your logger module

const ensureDirectoriesExist = () => {
  const dir = path.join(__dirname, '..', 'whitelists');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('📁 Whitelist directory created.');
  }
};

const updateWhitelistForToken = async (api, tokenConfig, collectionId) => {
  let addresses = [];
  try {
    const entries = await api.query.multiTokens.tokenAccounts.entries(collectionId, tokenConfig.tokenId);

    if (entries.length > 0) {
      entries.forEach(([key]) => {
        const accountAddress = key.args.map((k) => k.toHuman())[2];
        addresses.push(accountAddress);
      });

      // Corrected paths
      const whiteListPath = tokenConfig.tokenId === "1"
        ? path.join(__dirname, '..', tokenConfig.whiteListFile) // Goes up one level to the root for tokenId 1
        : path.join(__dirname, '..', tokenConfig.whiteListFile); // Correct path for other tokenIds

      fs.writeFileSync(whiteListPath, addresses.join('\n'));
      logger.info(`✅ Whitelist for token ID ${tokenConfig.tokenId} updated.`);
    } else {
      logger.info(`📭 No holders found for token ID ${tokenConfig.tokenId}.`);
    }
  } catch (error) {
    logger.error(`❌ Error updating whitelist for token ID ${tokenConfig.tokenId}: ${error.message}`);
  }
};


const updateWhitelist = async () => {
  logger.info('ℹ️ Starting whitelist update');
  ensureDirectoriesExist();

  const wsProvider = new WsProvider(config.network.uri);
  let api = null;

  try {
    api = await ApiPromise.create({ provider: wsProvider });
    // Update whitelist for main tokens
    for (const tokenConfig of config.whiteListTokens) {
      await updateWhitelistForToken(api, tokenConfig, config.whiteListMainCollectionId);
    }
    // Update whitelist for collaboration tokens
    for (const tokenConfig of config.whiteListCollaborationTokens) {
      await updateWhitelistForToken(api, tokenConfig, tokenConfig.collectionId);
    }
    logger.info('🚀 All whitelists have been updated.');
  } catch (error) {
    logger.error(`❌ An error occurred during the whitelist update process: ${error.message}`);
  } finally {
    if (api) await api.disconnect();
  }
};

updateWhitelist().catch((error) => {
  logger.error(`❌ Failed to update whitelists: ${error.message}`);
});

module.exports = updateWhitelist;