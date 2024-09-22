const { ApiPromise, WsProvider } = require('@polkadot/api');
const fetch = require('node-fetch');
const config = require('../config/config');
const logger = require('../utils/logger');

async function queryCollection(collectionId, db) {
  const wsProvider = new WsProvider(config.network.uri);
  const api = await ApiPromise.create({ provider: wsProvider });

  try {
    const encodedCollectionId = api.createType('u128', collectionId);
    const encodedAttributeKey = api.createType('Bytes', 'uri');

    // Query for collection attributes
    const attributesResult = await api.query.multiTokens.attributes(encodedCollectionId, null, encodedAttributeKey);
    // Query for collection details
    const collectionResult = await api.query.multiTokens.collections(encodedCollectionId);

    if (attributesResult.isSome) {
      const attributes = attributesResult.unwrap().toHuman();
      const response = await fetch(attributes.value);
      const collectionData = await response.json();

      // Add tokenCount and totalDeposit if collectionResult is available
      if (collectionResult) {
        const collectionDetails = collectionResult.toHuman();
        collectionData.tokenCount = collectionDetails.tokenCount;

        // Convert totalDeposit to a more readable format and round it down
        const depositInEnj = BigInt(collectionDetails.totalDeposit.replace(/,/g, '')) / BigInt(1e18);
        collectionData.totalDeposit = depositInEnj.toString().split('.')[0];

        // Add market royalty information
        if (collectionDetails.policy && collectionDetails.policy.market && collectionDetails.policy.market.royalty) {
          const royalty = collectionDetails.policy.market.royalty;
          if (royalty) {
            collectionData.royaltyPercentage = royalty.percentage || 'None';
          } else {
            collectionData.royaltyPercentage = 'None';
          }
        } else {
          collectionData.royaltyPercentage = 'None';
        }
      }

      // Retrieve the owner address from the collection result
      const ownerAddress = collectionResult.toHuman()?.owner || 'Unregistered';

      // Check if the owner address is registered in the database and get the username
      let ownerUsername = 'Unknown';
      await new Promise((resolve, reject) => {
        db.get(`SELECT username FROM users WHERE address = ?`, [ownerAddress], (err, row) => {
          if (err) {
            reject(err);
          } else {
            ownerUsername = row ? `@${row.username}` : 'Unregistered';
            resolve();
          }
        });
      });

      return {
        name: collectionData.name,
        description: collectionData.description,
        image: collectionData.media?.[0]?.url || collectionData.fallback_image || 'Not available',
        tokenCount: collectionData.tokenCount,
        totalDeposit: collectionData.totalDeposit,
        royaltyPercentage: collectionData.royaltyPercentage,
        owner: ownerAddress,
        ownerUsername: ownerUsername
      };
    } else {
      return null;
    }
  } catch (error) {
    logger.error('Error querying collection attributes:', error);
    throw error;
  } finally {
    await api.disconnect();
  }
}

module.exports = queryCollection;