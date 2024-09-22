// isRegistered.js
async function isRegistered(userId, db) {
    // Check if the user exists in the 'users' table or implement your registration check logic
    const user = await db.getAsync("SELECT * FROM users WHERE telegram_id = ?", [userId]);
    return !!user; // Returns true if the user exists, false otherwise
}

module.exports = isRegistered;