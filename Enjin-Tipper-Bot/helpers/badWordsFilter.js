const fs = require('fs');

// Load and preprocess the bad words list
const badWords = fs.readFileSync('./helpers/badwords.txt', 'utf-8')
  .split('\n')
  .map(word => word.trim().toLowerCase())
  .filter(word => word); // This removes any empty strings

module.exports = badWords;