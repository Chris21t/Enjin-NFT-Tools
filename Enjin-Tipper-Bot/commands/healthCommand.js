// healthCommand.js
const { WsProvider, ApiPromise } = require('@polkadot/api');
const config = require('../config/config');

async function healthCommand(ctx) {
    if (ctx.chat.type !== 'private') {
        const admins = await ctx.getChatAdministrators();
        const adminIds = admins.map(admin => admin.user.id);

        if (!adminIds.includes(ctx.from.id)) {
            ctx.reply('Sorry, only admins can use the /health command in groups. 🙅');
            return;
        }
    }

    const wsProvider = new WsProvider(config.network.uri);
    const api = await ApiPromise.create({ provider: wsProvider });

    if (api.isConnected) {
        ctx.reply('The connection to the Enjin Matrixchain node is healthy. ✅');
    } else {
        ctx.reply('The connection to the Enjin Matrixchain node seems to be down. ❌');
    }

    wsProvider.disconnect();
}

module.exports = healthCommand;