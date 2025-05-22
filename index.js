const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Helper to read environment variables
function getEnv(name, required = true) {
    const value = process.env[name];
    if (required && (!value || value === "")) {
        console.error(`[ERROR] ENV ${name} is missing!`);
        process.exit(1);
    }
    return value;
}

// Boolean ENV parsing helper (accepts "true"/"1" as true)
function getEnvBool(name, def = false) {
    const val = process.env[name];
    if (val === undefined) return def;
    return val === "1" || val?.toLowerCase() === "true";
}

// Configuration from environment
const config = {
    telegram: {
        token: getEnv('TELEGRAM_TOKEN'),
        chatid: getEnv('TELEGRAM_CHATID')
    },
    twitch: {
        enabled: getEnvBool('ENABLE_TWITCH', true),
        client_id: getEnv('TWITCH_CLIENT_ID', false),
        client_secret: getEnv('TWITCH_CLIENT_SECRET', false),
        streamers: (process.env.TWITCH_STREAMERS || '').split(',').map(s => s.trim()).filter(Boolean)
    },
    kick: {
        enabled: getEnvBool('ENABLE_KICK', true),
        client_id: getEnv('KICK_CLIENT_ID', false),
        client_secret: getEnv('KICK_CLIENT_SECRET', false),
        streamers: (process.env.KICK_STREAMERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    },
    message_template: process.env.MESSAGE_TEMPLATE ||
        `🟢 Platform: *{platform}*\n👤 Streamer: *{user_name}*\n🎮 Currently playing: *{game_name}*\n👀 Viewers: *{viewer_count}*\n\n🔴 [Watch here]({user_url})`,
    disable_web_page_preview: getEnvBool('DISABLE_WEB_PAGE_PREVIEW', false)
};

const bot = new TelegramBot(config.telegram.token, { polling: false });

let liveTwitchStreamers = new Set();
let liveKickStreamers = new Set();
let kickToken = null;
let kickTokenExpiry = 0;

async function getKickAccessToken() {
    try {
        const params = new URLSearchParams();
        params.append('client_id', config.kick.client_id);
        params.append('client_secret', config.kick.client_secret);
        params.append('grant_type', 'client_credentials');
        const response = await axios.post(
            'https://id.kick.com/oauth/token',
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        kickToken = response.data.access_token;
        kickTokenExpiry = Date.now() + (response.data.expires_in * 1000) - (5 * 60 * 1000); // 5min buffer
        return kickToken;
    } catch (err) {
        console.error('[KICK] Error fetching token:', err.response?.data || err.message, err.response?.status);
        return null;
    }
}

async function getValidKickToken() {
    if (!kickToken || Date.now() > kickTokenExpiry) {
        return await getKickAccessToken();
    }
    return kickToken;
}

async function getTwitchAccessToken() {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: config.twitch.client_id,
                client_secret: config.twitch.client_secret,
                grant_type: 'client_credentials'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('[TWITCH] Error fetching token:', error.response?.data || error.message);
        return null;
    }
}

async function checkTwitchStreams(token) {
    try {
        const { data } = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': config.twitch.client_id,
                'Authorization': `Bearer ${token}`
            },
            params: { user_login: config.twitch.streamers }
        });

        const liveStreams = data.data || [];

        for (const stream of liveStreams) {
            const { user_name, game_name, viewer_count, thumbnail_url } = stream;
            if (!liveTwitchStreamers.has(user_name)) {
                liveTwitchStreamers.add(user_name);
                sendTelegramMessage(formatMessage('Twitch', {
                    user_name,
                    game_name,
                    viewer_count,
                    thumbnail_url: thumbnail_url.replace('{width}', '320').replace('{height}', '180'),
                    user_url: `https://www.twitch.tv/${user_name}`
                }));
            }
        }
        for (const streamer of Array.from(liveTwitchStreamers)) {
            if (!liveStreams.some(stream => stream.user_name === streamer)) {
                liveTwitchStreamers.delete(streamer);
            }
        }
    } catch (error) {
        console.error('[TWITCH] Error checking streams:', error.response?.data || error.message);
    }
}

async function checkKickStreams() {
    const token = await getValidKickToken();
    if (!token) {
        console.error('[KICK] No valid access token!');
        return;
    }
    for (const username of config.kick.streamers) {
        try {
            const headers = {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'user-agent': 'KICK/1.0.13 Dalvik/2.1.0 (Linux; U; Android 13; Pixel 6 Pro Build/TQ1A.221205.011)'
            };
            const resp = await axios.get(
                `https://api.kick.com/public/v1/channels?slug=${username}`,
                { headers }
            );
            const channelData = resp.data.data && resp.data.data.length > 0 ? resp.data.data[0] : null;
            if (!channelData) {
                console.error(`[KICK] 404 Not Found for ${username} – does not exist.`);
                liveKickStreamers.delete(username);
                continue;
            }
            if (channelData.stream && channelData.stream.is_live) {
                if (!liveKickStreamers.has(username)) {
                    liveKickStreamers.add(username);
                    sendTelegramMessage(formatMessage('Kick', {
                        user_name: username,
                        game_name: (channelData.category && channelData.category.name) ? channelData.category.name : (channelData.stream_title || 'Unknown'),
                        viewer_count: channelData.stream.viewer_count || 0,
                        thumbnail_url: channelData.stream.thumbnail || '',
                        user_url: `https://kick.com/${username}`
                    }));
                }
            } else {
                liveKickStreamers.delete(username);
            }
        } catch (err) {
            if (err.response) {
                const status = err.response.status;
                if (status === 401) {
                    console.error(`[KICK] 401 Unauthorized for ${username} – check client ID/secret and token!`);
                } else if (status === 403) {
                    console.error(`[KICK] 403 Forbidden for ${username} – maybe IP blocked or user not visible.`);
                } else if (status === 404) {
                    console.error(`[KICK] 404 Not Found for ${username} – does not exist.`);
                } else {
                    console.error(`[KICK] Error for ${username}: Status ${status} – ${err.response.statusText}`);
                }
            } else {
                console.error(`[KICK] Network error for ${username}:`, err.message);
            }
        }
    }
}

function formatMessage(platform, { user_name, game_name, viewer_count, thumbnail_url, user_url }) {
    return config.message_template
        .replace('{platform}', platform)
        .replace('{user_name}', user_name)
        .replace('{game_name}', game_name ?? 'Unknown')
        .replace('{viewer_count}', viewer_count ?? '0')
        .replace('{thumbnail_url}', thumbnail_url ?? '')
        .replace('{user_url}', user_url);
}

function sendTelegramMessage(message) {
    bot.sendMessage(config.telegram.chatid, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: config.disable_web_page_preview
    }).catch(err => {
        console.error("[TELEGRAM] Error sending message:", err.message);
    });
}

async function checkAllStreamers() {
    try {
        if (config.twitch.enabled && config.twitch.streamers.length > 0 && config.twitch.client_id && config.twitch.client_secret) {
            const twitchToken = await getTwitchAccessToken();
            if (twitchToken) await checkTwitchStreams(twitchToken);
            else console.error('[TWITCH] No access token!');
        }
        if (config.kick.enabled && config.kick.streamers.length > 0 && config.kick.client_id && config.kick.client_secret) {
            await checkKickStreams();
        }
    } catch (error) {
        console.error('[FATAL] Error in main check:', error);
    }
}

// Main loop: run once and then every minute
(async () => {
    await checkAllStreamers();
    setInterval(checkAllStreamers, 60000);
})();

// Keep alive
setInterval(() => {}, 1000);
