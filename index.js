const logger = require('./logger');
const { checkTwitchStreams } = require('./twitch');
const { checkKickStreams } = require('./kick');
const { startHealthServer } = require('./health');
const config = require('./config');

async function mainLoop() {
    logger.info('Starte Überwachungsrunde...');
    if (config.twitch.enabled) await checkTwitchStreams();
    if (config.kick.enabled) await checkKickStreams();
}

startHealthServer(3000);

setInterval(mainLoop, config.check_interval);
mainLoop();