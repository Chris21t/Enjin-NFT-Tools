// guideActions.js
const { createGuideKeyboard } = require('../helpers/helpFunctions');
const { displayMainHelp } = require('../helpers/helpFunctions');


function registerGuideActions(bot) {
    bot.action('START_GUIDE', (ctx) => {
        const startGuide = `
🚀 *Getting Started with NFT Tipper*:
1. Start your journey with /start.
2. Link your Enjin Matrixchain address with /register [ADDRESS].
3. Check your linked address with /myaddress.
4. Unregister your address with /unregister.
5. Overview with /help.
        `;
        ctx.replyWithMarkdown(startGuide, createGuideKeyboard());
    });

    bot.action('TIP_GUIDE', (ctx) => {
        const tipGuide = `
🎁 *Tipping Guide*:
1. Reply and use /tip to tip (maximum: 10 per hour).
2. Use /randomtip for a fun surprise.
3. Check your tipping records with /tiphistory.
4. Find top tippers with /ranking and /leaderboard.
        `;
        ctx.replyWithMarkdown(tipGuide, createGuideKeyboard());
    });

    bot.action('TIP_SEASON', (ctx) => {
        const tipSeason = `
🎃 *Seasonal Surprise*:
1. All registered users can receive a random tip every 15 minutes.
2. A specified token will be sent to a random Enjin Matrixchain address.
3. The user associated with this address will be contacted via DM.
4. You can unregister with /unregister.
        `;
        ctx.replyWithMarkdown(tipSeason, createGuideKeyboard());
    });

    bot.action('TIP_RANKING', (ctx) => {
        const tipRanking = `
🎉 *Ranking Token*:
1. All registered users can send tips. Each sent tip counts.
2. A specific token will be sent to the user once a certain level is achieved.
3. The user achieving a new rank will be contacted via DM.
4. Ranks include: Rookie (10), Bronze (100), Silver (500), Gold (1000)
        `;
        ctx.replyWithMarkdown(tipRanking, createGuideKeyboard());
    });

    bot.action('PROFILE_BIO', (ctx) => {
        const profileBio = `
📌 *Profile & Bio Management*:
1. Set your bio with /setbio [Your bio].
2. Check your profile with /profile.
3. Start anew with /unregister.
        `;
        ctx.replyWithMarkdown(profileBio, createGuideKeyboard());
    });

    bot.action('MODERATION_GUIDE', (ctx) => {
        const moderationGuide = `
🛡️ *Channel Rules & Moderation*:
1. **Registration**: Only registered users can chat. Users will need to send a DM to me.
2. **Word Filter**: We maintain chat quality. Words or phrases can be added to my filter.
3. **Warning System**: Breaches result in warnings (5). Excess warnings lead to removal.
        `;
        ctx.replyWithMarkdown(moderationGuide, createGuideKeyboard());
    });

    bot.action('RETURN_TO_MAIN_HELP', (ctx) => {
        // This function should be imported from where it's defined, like `helpFunctions.js`
        // For now, I'm assuming it's globally available.
        displayMainHelp(ctx);
    });
}

module.exports = { registerGuideActions };