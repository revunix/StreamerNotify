const axios = require('axios');
const logger = require('./logger');
const config = require('./config');
const { notifyAll } = require('./notifier');

let twitchToken = null;
let twitchTokenExpiry = 0;
let lastLiveStatus = {};

/**
 * Holt einen gültigen Twitch-OAuth-Token (mit automatischer Erneuerung)
 */
async function getTwitchAccessToken(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: config.twitch.client_id,
                    client_secret: config.twitch.client_secret,
                    grant_type: 'client_credentials'
                },
                timeout: 5000
            });
            twitchToken = response.data.access_token;
            twitchTokenExpiry = Date.now() + (response.data.expires_in * 1000) - (5 * 60 * 1000);
            return twitchToken;
        } catch (error) {
            logger.warn(`[TWITCH] Token-Fehler (Versuch ${i+1}):`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, 2000 * (i + 1)));
        }
    }
    return null;
}

async function getValidTwitchToken() {
    if (!twitchToken || Date.now() > twitchTokenExpiry) {
        return await getTwitchAccessToken();
    }
    return twitchToken;
}

function formatMessage(stream) {
    return config.message_template
        .replace('{platform}', 'Twitch')
        .replace('{user_name}', stream.user_name)
        .replace('{game_name}', stream.game_name ?? 'Unknown')
        .replace('{viewer_count}', stream.viewer_count ?? '0')
        .replace('{thumbnail_url}', stream.thumbnail_url ?? '')
        .replace('{user_url}', `https://www.twitch.tv/${stream.user_name}`);
}

async function checkTwitchStreams() {
    if (!config.twitch.enabled || config.twitch.streamers.length === 0) return;
    const token = await getValidTwitchToken();
    if (!token) {
        logger.error('[TWITCH] Kein gültiger Access Token!');
        return;
    }
    try {
        const { data } = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': config.twitch.client_id,
                'Authorization': `Bearer ${token}`
            },
            params: { user_login: config.twitch.streamers }
        });

        const liveNow = new Set();
        (data.data || []).forEach(stream => {
            liveNow.add(stream.user_name);
            if (!lastLiveStatus[stream.user_name]) {
                // Streamer ist jetzt live!
                notifyAll(
                    formatMessage(stream),
                    {
                        platform: 'Twitch',
                        status: 'Online',
                        streamer: stream.user_name,
                        viewers: stream.viewer_count,
                        url: `https://www.twitch.tv/${stream.user_name}`
                    }
                );
                logger.info(`[TWITCH] Online-Benachrichtigung gesendet: ${stream.user_name}`);
                lastLiveStatus[stream.user_name] = true;
            }
        });

        // Offline-Detection
        for (const streamer of config.twitch.streamers) {
            if (lastLiveStatus[streamer] && !liveNow.has(streamer)) {
                notifyAll(
                    `🔴 Twitch-Streamer *${streamer}* ist jetzt offline.`,
                    {
                        platform: 'Twitch',
                        status: 'Offline',
                        streamer,
                        url: `https://www.twitch.tv/${streamer}`
                    }
                );
                logger.info(`[TWITCH] Offline-Benachrichtigung gesendet: ${streamer}`);
                lastLiveStatus[streamer] = false;
            }
        }
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logger.warn('[TWITCH] 401 Unauthorized, versuche Token zu erneuern...');
            twitchToken = null;
            await checkTwitchStreams();
        } else if (error.response && error.response.status === 504) {
            logger.warn('[TWITCH] 504 Gateway Timeout, versuche später erneut...');
        } else {
            logger.error('[TWITCH] Fehler beim Stream-Check:', error.response?.data || error.message);
        }
    }
}

module.exports = { checkTwitchStreams };