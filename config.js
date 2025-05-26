require('dotenv').config();

function getEnv(name, required = true, def = undefined) {
    const value = process.env[name];
    if (required && (!value || value === "")) {
        throw new Error(`[CONFIG] ENV ${name} is missing!`);
    }
    return value === undefined ? def : value;
}

function getEnvBool(name, def = false) {
    const val = process.env[name];
    if (val === undefined) return def;
    return val === "1" || val?.toLowerCase() === "true";
}

module.exports = {
    telegram: {
        token: getEnv('TELEGRAM_TOKEN'),
        chatids: getEnv('TELEGRAM_CHATID').split(',').map(s => s.trim()),
    },
    discord: {
        enabled: getEnvBool('ENABLE_DISCORD', false),
        webhooks: (process.env.DISCORD_WEBHOOK_URLS || '').split(',').map(s => s.trim()).filter(Boolean)
    },
    twitch: {
        enabled: getEnvBool('ENABLE_TWITCH', true),
        client_id: getEnv('TWITCH_CLIENT_ID', false),
        client_secret: getEnv('TWITCH_CLIENT_SECRET', false),
        streamers: (process.env.TWITCH_STREAMERS || '').split(',').map(s => s.trim()).filter(Boolean),
    },
    kick: {
        enabled: getEnvBool('ENABLE_KICK', true),
        client_id: getEnv('KICK_CLIENT_ID', false),
        client_secret: getEnv('KICK_CLIENT_SECRET', false),
        streamers: (process.env.KICK_STREAMERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    },
    message_template: process.env.MESSAGE_TEMPLATE ||
        `🟢 Platform: *{platform}*\n👤 Streamer: *{user_name}*\n🎮 Currently playing: *{game_name}*\n👀 Viewers: *{viewer_count}*\n\n🔴 [Watch here]({user_url})`,
    disable_web_page_preview: getEnvBool('DISABLE_WEB_PAGE_PREVIEW', false),
    check_interval: Number(process.env.CHECK_INTERVAL_MS) || 60000
};