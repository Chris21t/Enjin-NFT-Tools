
const crypto = require('crypto');
const fs = require('fs');

const ENCRYPTION_KEY = Buffer.from('YOUR_ENCRYPTION_KEY', 'hex');
const IV = Buffer.from('YOUR_IV', 'hex');

function decryptSeed() {
    try {
        const encryptedSeed = fs.readFileSync('encryptedSeed.txt', 'utf8');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
        let decrypted = decipher.update(encryptedSeed, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error("Failed to decrypt the seed.");
    }
}

module.exports = {
    decryptSeed
};
