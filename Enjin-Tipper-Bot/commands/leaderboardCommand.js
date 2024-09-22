// leaderboardCommand.js

async function leaderboardCommand(ctx, db) {
    // Function to escape Markdown syntax
    const escapeMarkdown = (str) => str.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

    // Fetch the top 25 users from the database
    const rows = await db.allAsync("SELECT username, tip_count_sent, last_token_type FROM users ORDER BY tip_count_sent DESC LIMIT 25");

    let leaderboardMessage = '🏆 *Top 25 Tip Leaderboard* 🏆\n\n';

    rows.forEach((row, index) => {
        const rankEmoji = getRankEmoji(row.last_token_type); // Get the emoji for the user's rank
        const escapedUsername = escapeMarkdown(row.username || 'Anonymous');
        leaderboardMessage += `${index + 1}. ${rankEmoji} @${escapedUsername} - Tip Balance: ${row.tip_count_sent}\n`;
    });

    ctx.replyWithMarkdown(leaderboardMessage);
}

module.exports = leaderboardCommand;

function getRankEmoji(rank) {
    switch (rank) {
        case 'Rookie':
            return '👶';
        case 'Bronze':
            return '🥉';
        case 'Silver':
            return '🥈';
        case 'Gold':
            return '🥇';
        case 'Platinum':
            return '🎖️';
        case 'Diamond':
            return '💎';
        case 'Champion':
            return '🏆';
        case 'Admin':
            return '🌟';
        default:
            return '';
    }
}