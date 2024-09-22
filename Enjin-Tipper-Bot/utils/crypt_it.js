const crypto = require('crypto');
const fs = require('fs');

const seedPhrase = "YOUR SEED GOES HERE";
const ENCRYPTION_KEY = crypto.randomBytes(32);  // Generate a random encryption key
const IV = crypto.randomBytes(16);               // Generate a random IV

// Encrypt the seed phrase
const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
let encrypted = cipher.update(seedPhrase, 'utf8', 'hex');
encrypted += cipher.final('hex');

// Save the encrypted seed phrase to a file
fs.writeFileSync('encryptedSeed.txt', encrypted);

// For demonstration purposes, we'll print out the encryption key and IV.
// In a real-world scenario, you'd store these securely.
console.log('Encryption Key:', ENCRYPTION_KEY.toString('hex'));
console.log('IV:', IV.toString('hex'));
