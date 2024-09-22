const crypto = require('crypto');
const fs = require('fs');

const ENCRYPTION_KEY = Buffer.from('ENCRYPTION KEY GOES HERE', 'hex');
const IV = Buffer.from('IV GOES HERE', 'hex');

function decryptSeed() {
    try {
        // Adjust the path to point to the 'config' directory
        const encryptedSeed = fs.readFileSync('./config/encryptedSeed.txt', 'utf8');
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