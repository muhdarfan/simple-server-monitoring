let teleBot, checkTimer;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const serverToCheck = require('../server.json').servers;
const checkInterval = process.env.CHECK_INTERVAL ?? 300;

const start = async () => {
    try {
        // Init Telegram Bot
        teleBot = require('./telegram')(process.env.TELEGRAM_BOT_TOKEN);
        teleBot.start((ctx) => ctx.reply('Welcome!'));

        teleBot.catch((err) => {
            console.log('Ooops', err);
        })

        teleBot.launch();

        startHealthMonitoringPolling();

    } catch (err) {
        console.log('An error occurred');
        console.error(err.message);
    }
}

const startHealthMonitoringPolling = () => {
    if (checkTimer) clearTimeout(checkTimer);

    checkTimer = setTimeout(checkHealthStatus, 5000);
}

const checkHealthStatus = async () => {
    try {
        for (const server of serverToCheck) {
            console.log(`Checking ${server.name}...`);

            let status = false;

            try {
                const url = `http://${server.host}/`;

                const data = await fetchWithTimeout(
                    url, {
                        timeout: 5000 // 5 seconds
                    }
                )

                status = true;
                console.log('up')
            } catch (err) {
                console.log('down')

                // console.log(err)
                switch (err.code) {
                    case 'ECONNREFUSED':
                        console.log('connection refused.')
                        break;

                    case 'ERR_INVALID_URL':
                        console.log('invalid url');
                        break;

                    default:
                        console.log('unknown error')
                        break;
                }

                status = false;
            }

            if (status !== server.isUp) {
                server.isUp = !server.isUp;

                for (const teleGroupId of server.groups) {
                    if (status) {
                        teleBot.telegram.sendMessage(teleGroupId, `Server ${server.name} is up...`)
                    } else {
                        teleBot.telegram.sendMessage(teleGroupId, `Server ${server.name} is down...`)
                    }
                }
            }

            console.log('');
        }
    } catch (err) {
        console.log(err);
    } finally {
        checkTimer = setTimeout(checkHealthStatus, checkInterval * 1000); // 1 minutes
    }
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

process.once('SIGINT', () => teleBot?.stop('SIGINT'));
process.once('SIGTERM', () => teleBot?.stop('SIGTERM'));

module.exports = {
    start
}