// showUserProfile.js
const isRegistered = require('./isRegistered');

function escapeMarkdown(text) {
    return text.replace(/([_*[\]()~`>#+-=|{}.!])(?=\S)/g, '\\$&');
}

async function showUserProfile(userId, ctx, db) {
    // Check if the user is registered
    const isUserRegistered = await isRegistered(userId, db);

    if (!isUserRegistered) {
        ctx.reply('You need to register your Enjin Matrixchain address using /register ADDRESS before you can use the /profile command.');
        return;
    }

    // Fetch the user's profile from the users table
    const userProfile = await db.getAsync("SELECT username, tip_count_received, tip_count_sent, registration_date, last_token_type FROM users WHERE telegram_id = ?", [userId]);

    if (userProfile) {
        const { username, tip_count_received, tip_count_sent, registration_date, last_token_type } = userProfile;

        // Fetch the user's bio from the profiles table
        const userBio = await db.getAsync("SELECT bio FROM profiles WHERE telegram_id = ?", [userId]);
        const bioText = userBio ? escapeMarkdown(userBio.bio) : "No bio set";

        // Calculate the contrast rate for sent and received tips
        const contrastRate = tip_count_sent > 0 ? (tip_count_received / tip_count_sent * 100).toFixed(2) : 0;

        // Describe the contrast rate in terms of giving and receiving
        let contrastRateText = '';
        if (contrastRate === 0) {
            contrastRateText = "They haven't received any tips yet.";
        } else if (contrastRate < 25) {
            contrastRateText = "They're a generous giver!";
        } else if (contrastRate < 50) {
            contrastRateText = "They give more than they receive.";
        } else if (contrastRate < 75) {
            contrastRateText = "Their giving and receiving are balanced.";
        } else {
            contrastRateText = "They receive more than they give!";
        }

        // Create a creative layout for the user profile
        const profileText = `
👤 *User Profile*:

📊 *Tips Balance*: ${tip_count_sent || 0}
🎁 *Tips Received*: ${tip_count_received || 0}
🔥 *Tipping Ratio*: ${contrastRateText}
📅 *Registration Date*: ${new Date(registration_date * 1000).toLocaleDateString()}
🎖 *Current Rank*: ${last_token_type || "Unranked"}

📝 *Bio*:
${bioText}

🌐 *NFT Tipper Collection*:
[NFT Tipper on NFT.io](https://nft.io/collection/nft-tipper-bot/)
`;

        ctx.replyWithMarkdown(profileText);
    } else {
        ctx.reply("You haven't set up a profile yet. Use /setbio to set your bio.");
    }
}

module.exports = showUserProfile;