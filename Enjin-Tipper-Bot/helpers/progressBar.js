// utils.js

/**
 * Converts seconds into a human-readable format.
 * @param {number} seconds - The duration in seconds.
 * @returns {string} A human-readable duration string.
 */
function formatDuration(milliseconds) {
    let totalSeconds = Math.floor(milliseconds / 1000);
    let days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

    return parts.join(', ');
}


/**
 * Creates a text-based progress bar.
 * @param {number} progressMade - The amount of progress made towards the goal.
 * @param {number} totalNeeded - The total amount needed to reach the goal.
 * @param {number} width - The desired width of the progress bar.
 * @returns {string} A text representation of the progress bar.
 */
function createProgressBar(progressMade, totalNeeded, width) {
    // Ensure progressMade is not negative
    progressMade = Math.max(progressMade, 0);

    // Calculate the ratio of progress made to total needed, ensuring it does not go below 0 or exceed 1
    const ratio = Math.max(0, Math.min(progressMade / totalNeeded, 1));
    const filledBarLength = Math.round(ratio * width);
    const emptyBarLength = width - filledBarLength;
    const filledBar = '█'.repeat(filledBarLength);
    const emptyBar = '░'.repeat(emptyBarLength);
    return `[${filledBar}${emptyBar}] ${Math.round(ratio * 100)}%`;
}

module.exports = { formatDuration, createProgressBar };