// getRandomUser.js

async function getRandomUser(db, excludeUserId) {
    try {
        const rows = await db.allAsync("SELECT telegram_id, address, username FROM users WHERE telegram_id != ?", [excludeUserId]);
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)];
    } catch (error) {
        console.error('Error fetching random user:', error);
        return null;
    }
}

module.exports = getRandomUser;