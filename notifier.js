const { sendTelegramMessage } = require('./telegram');
const { sendDiscordMessage } = require('./discord');

/**
 * Benachrichtigt alle aktiven Plattformen.
 * @param {string} message Die Nachricht (Markdown)
 * @param {object} meta optionale Metadaten (platform, status, streamer, viewers, url)
 */
async function notifyAll(message, meta = {}) {
    await Promise.all([
        sendTelegramMessage(message, meta),
        sendDiscordMessage(message, meta)
    ]);
}

module.exports = { notifyAll };