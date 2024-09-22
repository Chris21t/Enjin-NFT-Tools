// getUserIdByUsername.js
async function getUserIdByUsername(username, db) {
    try {
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
        const row = await db.get("SELECT telegram_id FROM users WHERE username = ?", [cleanUsername]);
        return row ? row.telegram_id : null;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}

module.exports = getUserIdByUsername;