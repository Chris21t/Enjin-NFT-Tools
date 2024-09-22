// tiphistoryCommand.js

async function tiphistoryCommand(ctx, db) {
    try {
        // Fetch the user's tipping details
        const row = await db.getAsync("SELECT tip_count_sent, tip_count_received, last_token_type FROM users WHERE telegram_id = ?", [ctx.from.id]);

        if (!row) {
            ctx.reply('You do not have a tipping history yet.');
            return;
        }

        // Define ranking goals and calculate progress
        const goals = {
            'Rookie': 10,
            'Bronze': 100,
            'Silver': 500,
            'Gold': 1000,
            'Platinum': 2500,
            'Diamond': 5000,
            'Champion': 10000
        };

        const progress = {};
        let currentRank = 'Rookie';

        for (const rank of Object.keys(goals)) {
            progress[rank] = {
                goal: goals[rank],
                achieved: row.tip_count_sent >= goals[rank],
                current: currentRank === rank
            };

            if (currentRank === rank && !progress[rank].achieved) {
                // Set the current rank to the first unachieved rank
                currentRank = null;
            }
        }

        // Construct the reply message with progress bars
        let reply = `
📜 *Your Tipping History*:

✅ *Tips Sent*: ${row.tip_count_sent} 🚀
🎁 *Tips Received*: ${row.tip_count_received} 🎉\n\n`;

        for (const rank of Object.keys(progress)) {
            const { goal, achieved, current } = progress[rank];
            const emoji = achieved ? getRankEmoji(rank) : current ? '🔵' : '⚪';
            const rankText = achieved ? `*${rank} Rank*` : current ? `*${rank} Rank* (Next)` : `*${rank} Rank* (Locked)`;

            reply += `${emoji} ${rankText}: ${row.tip_count_sent}/${goal} tips`;

            if (!achieved) {
                const tipsNeeded = goal - row.tip_count_sent;
                reply += ` (${tipsNeeded} tips away)`;
            }

            reply += '\n';
        }

        reply += "\nYou'll receive the corresponding tokens once you achieve each rank.";

        // Send the constructed message with markdown
        ctx.replyWithMarkdown(reply);

    } catch (err) {
        console.error('Error fetching user tip history:', err);
        ctx.reply('An error occurred while retrieving your tip history. Please try again later. 🔁');
    }
}

module.exports = tiphistoryCommand;

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
        default:
            return '';
    }
}