// getRankEmoji.js

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
        default:
            return '';
    }
}

module.exports = getRankEmoji;