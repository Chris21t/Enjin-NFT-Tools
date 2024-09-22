// utils.js

/**
 * Converts seconds into a human-readable format.
 * @param {number} seconds - The duration in seconds.
 * @returns {string} A human-readable duration string.
 */
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} minute${minutes > 1 ? 's' : ''}${remainingSeconds > 0 ? ` and ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}` : ''}`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
}

/**
 * Creates a text-based progress bar.
 * @param {number} currentValue - The current value towards the goal.
 * @param {number} totalValue - The total value (goal) to reach.
 * @param {number} width - The desired width of the progress bar.
 * @returns {string} A text representation of the progress bar.
 */
function createProgressBar(currentValue, totalValue, width) {
    const ratio = Math.min(currentValue / totalValue, 1); // Ensure the ratio does not exceed 1
    const filledBarLength = Math.round(ratio * width);
    const emptyBarLength = width - filledBarLength;
    const filledBar = '█'.repeat(filledBarLength);
    const emptyBar = '░'.repeat(emptyBarLength);
    return `[${filledBar}${emptyBar}] ${Math.round(ratio * 100)}%`;
}

module.exports = { formatDuration, createProgressBar };