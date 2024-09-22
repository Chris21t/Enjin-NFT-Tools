const { ApiPromise, WsProvider } = require('@polkadot/api');
const fetch = require('node-fetch');
const config = require('../config/config');
const logger = require('../utils/logger');

async function queryToken(collectionId, tokenId) {
  const wsProvider = new WsProvider(config.network.uri);
  const api = await ApiPromise.create({ provider: wsProvider });

  try {
    const encodedCollectionId = api.createType('u128', collectionId);
    const encodedTokenId = api.createType('u128', tokenId);
    const encodedAttributeKey = api.createType('Bytes', 'uri');

    // Query token attributes
    const attributesResult = await api.query.multiTokens.attributes(encodedCollectionId, encodedTokenId, encodedAttributeKey);
    // Query token details
    const tokenResult = await api.query.multiTokens.tokens(encodedCollectionId, encodedTokenId);

    let tokenData = {};
    if (attributesResult.isSome) {
      const attributes = attributesResult.unwrap().toHuman();
      const response = await fetch(attributes.value);
      tokenData = await response.json();
    }

    // Add supply and cap if tokenResult is available
    if (tokenResult) {
      const tokenDetails = tokenResult.toHuman();
      tokenData.supply = tokenDetails.supply;

      // Handle different cap formats
      if (tokenDetails.cap === 'SingleMint') {
        tokenData.cap = tokenData.supply === '1' ? 'Unique' : 'Single Edition';
      } else if (tokenDetails.cap === null) {
        tokenData.cap = 'Unlimited';
      } else if (tokenDetails.cap && tokenDetails.cap.Supply) {
        // Remove commas before parsing to integer
        const capValue = parseInt(tokenDetails.cap.Supply.replace(/,/g, ''));
        const supplyValue = parseInt(tokenData.supply.replace(/,/g, ''));

        if (supplyValue === capValue) {
          tokenData.cap = 'Fully Minted';
        } else if (capValue >= supplyValue) {
          tokenData.cap = tokenDetails.cap.Supply;
        } else {
          tokenData.cap = 'Error in Cap'; // Cap is less than current supply
        }
      } else {
        // Handle any other unrecognized scenarios
        tokenData.cap = 'Unknown';
      }
    }

    return {
      name: tokenData.name || 'Unknown',
      description: tokenData.description || 'No description available',
      image: tokenData.fallback_image || 'Not available',
      supply: tokenData.supply || 'Unknown',
      cap: tokenData.cap || 'Unknown'
    };
  } catch (error) {
    logger.error('Error querying token attributes:', error);
    throw error;
  } finally {
    await api.disconnect();
  }
}

module.exports = queryToken;
