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
        ctx.editMessageText(startGuide, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('TIP_GUIDE', (ctx) => {
        const tipGuide = `
🎁 *Tipping Guide*:
1. Make sure to hold the NFT Tipper token! 
2. Reply and use /tip to tip (maximum: 3 per hour).
3. Use /randomtip for a fun surprise.
4. Check your tipping records with /tiphistory.
5. Find top tippers with /ranking and /leaderboard.
        `;
        ctx.editMessageText(tipGuide, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('SUPER_TIPPING', (ctx) => {
        const superTipping = `
💎 *Super Tipping*:

Please be aware that each Super Tip deducts 25 tips sent from your balance. It doesn't affect your rank if you drop below the rank threshold, but it will take you longer to achieve the next rank.

1. Make sure to reach the Silver Tipper Rank or higher! 
2. Send /stip USER MESSAGE (maximum: 1 per day).
3. You will receive a confirmation message.
4. The person you sent a Super Tip to will receive a DM.
        `;
        ctx.editMessageText(superTipping, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });


    bot.action('TIP_SEASON', (ctx) => {
        const tipSeason = `
🎃 *Seasonal Surprise*:
1. All registered users can receive a random tip every 60 minutes.
2. A specified token will be sent to a random Enjin Matrixchain address.
3. The user linked to this address will be contacted via DM.
4. Every now and then, the season will be updated.
        `;
        ctx.editMessageText(tipSeason, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('COLLABORATION', (ctx) => {
        const collaborationFeature = `
👨‍👨‍👦‍👦 *Collaboration Feature*:

More information to be shared soon.
        `;
        ctx.editMessageText(collaborationFeature, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('TIP_RANKING', (ctx) => {
        const tipRanking = `
🎉 *Ranking Token*:
1. All whitelisted users can send tips. Each sent tip or randomtip counts.
2. A specific token will be sent to the user once a certain level is achieved.
3. The user achieving a new rank will be contacted via DM.
4. Ranks include: Rookie (10), Bronze (100), Silver (500), Gold (1,000), Platinum (2,500), Diamond (5,000), and Champion (10,000).
        `;
        ctx.editMessageText(tipRanking, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('PROFILE_BIO', (ctx) => {
        const profileBio = `
📌 *Profile & Bio Management*:
1. Set your bio with /setbio [Your bio].
2. Check your profile with /profile.
3. Start anew with /unregister.
        `;
        ctx.editMessageText(profileBio, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('MODERATION_GUIDE', (ctx) => {
        const moderationGuide = `
🛡️ *Channel Rules & Moderation*:
1. **Registration**: Only registered users can chat. Users will need to send a DM to me.
2. **Word Filter**: We maintain chat quality. Words or phrases can be added to my filter.
3. **Warning System**: Breaches result in warnings (5). Excess warnings lead to removal.
        `;
        ctx.editMessageText(moderationGuide, { parse_mode: 'Markdown', reply_markup: createGuideKeyboard().reply_markup });
    });

    bot.action('RETURN_TO_MAIN_HELP', (ctx) => {
        // This function should be imported from where it's defined, like `helpFunctions.js`
        // For now, I'm assuming it's globally available.
        displayMainHelp(ctx, true);
    });
}

module.exports = { registerGuideActions };