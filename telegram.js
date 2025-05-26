const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');
const config = require('./config');

const bot = new TelegramBot(config.telegram.token, { polling: false });

async function sendTelegramMessage(message, meta = {}) {
    for (const chatid of config.telegram.chatids) {
        try {
            await bot.sendMessage(chatid, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: config.disable_web_page_preview
            });
            logger.info(
                `[TELEGRAM] [${meta.platform || '-'}] ${meta.status || 'Info'}: ${meta.streamer || '-'} | ChatID: ${chatid}` +
                (meta.viewers !== undefined ? ` | Viewers: ${meta.viewers}` : '') +
                (meta.url ? ` | Link: ${meta.url}` : '')
            );
        } catch (err) {
            logger.error(`[TELEGRAM] Fehler beim Senden an ${chatid}:`, err.message);
        }
    }
}

module.exports = { sendTelegramMessage };