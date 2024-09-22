const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let whitelist = new Set();

function loadWhitelist() {
  try {
    // Construct the path to the whitelist.txt file
    const whitelistPath = path.join(__dirname, '..', 'whitelist.txt');
    
    // Read the file and split it into lines
    const data = fs.readFileSync(whitelistPath, 'utf-8');
    whitelist = new Set(data.split('\n').filter(address => address));
    
    logger.info('✅ Whitelist loaded into memory');
  } catch (error) {
    logger.error('❌ Error loading whitelist:', error);
  }
  return whitelist;
}

function checkWhitelist(address) {
  return whitelist.has(address);
}

// Export the loadWhitelist function
module.exports = { loadWhitelist, checkWhitelist };