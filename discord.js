const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

async function sendDiscordMessage(content, meta = {}) {
    if (!config.discord.enabled || !config.discord.webhooks.length) return;
    const payload = {
        content: content
    };
    for (const webhook of config.discord.webhooks) {
        try {
            await axios.post(webhook, payload);
            logger.info(
                `[DISCORD] [${meta.platform || '-'}] ${meta.status || 'Info'}: ${meta.streamer || '-'} | Webhook: ${webhook}` +
                (meta.viewers !== undefined ? ` | Viewers: ${meta.viewers}` : '') +
                (meta.url ? ` | Link: ${meta.url}` : '')
            );
        } catch (e) {
            logger.error(`[DISCORD] Fehler beim Senden an ${webhook}:`, e.message);
        }
    }
}

module.exports = { sendDiscordMessage };