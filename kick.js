const axios = require('axios');
const logger = require('./logger');
const config = require('./config');
const { notifyAll } = require('./notifier');

let kickToken = null;
let kickTokenExpiry = 0;
let lastLiveStatus = {};

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
        kickTokenExpiry = Date.now() + (response.data.expires_in * 1000) - (5 * 60 * 1000);
        return kickToken;
    } catch (err) {
        logger.error('[KICK] Token-Fehler:', err.response?.data || err.message, err.response?.status);
        return null;
    }
}

async function getValidKickToken() {
    if (!kickToken || Date.now() > kickTokenExpiry) {
        return await getKickAccessToken();
    }
    return kickToken;
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

async function checkKickStreams() {
    if (!config.kick.enabled || config.kick.streamers.length === 0) return;
    const token = await getValidKickToken();
    if (!token) {
        logger.error('[KICK] Kein gültiger Access Token!');
        return;
    }
    await Promise.all(config.kick.streamers.map(async username => {
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
                logger.warn(`[KICK] 404 Not Found für ${username}.`);
                lastLiveStatus[username] = false;
                return;
            }
            if (channelData.stream && channelData.stream.is_live) {
                if (!lastLiveStatus[username]) {
                    notifyAll(
                        formatMessage('Kick', {
                            user_name: username,
                            game_name: (channelData.category && channelData.category.name) ? channelData.category.name : (channelData.stream_title || 'Unknown'),
                            viewer_count: channelData.stream.viewer_count || 0,
                            thumbnail_url: channelData.stream.thumbnail || '',
                            user_url: `https://kick.com/${username}`
                        }),
                        {
                            platform: 'Kick',
                            status: 'Online',
                            streamer: username,
                            viewers: channelData.stream.viewer_count || 0,
                            url: `https://kick.com/${username}`
                        }
                    );
                    logger.info(`[KICK] Online-Benachrichtigung gesendet: ${username}`);
                }
                lastLiveStatus[username] = true;
            } else if (lastLiveStatus[username]) {
                notifyAll(
                    `🔴 Kick-Streamer *${username}* ist jetzt offline.`,
                    {
                        platform: 'Kick',
                        status: 'Offline',
                        streamer: username,
                        url: `https://kick.com/${username}`
                    }
                );
                logger.info(`[KICK] Offline-Benachrichtigung gesendet: ${username}`);
                lastLiveStatus[username] = false;
            }
        } catch (err) {
            if (err.response) {
                const status = err.response.status;
                if (status === 401) {
                    logger.error(`[KICK] 401 Unauthorized für ${username}.`);
                } else if (status === 403) {
                    logger.error(`[KICK] 403 Forbidden für ${username}.`);
                } else if (status === 404) {
                    logger.error(`[KICK] 404 Not Found für ${username}.`);
                } else {
                    logger.error(`[KICK] Fehler für ${username}: Status ${status} – ${err.response.statusText}`);
                }
            } else {
                logger.error(`[KICK] Netzwerkfehler für ${username}:`, err.message);
            }
        }
    }));
}

module.exports = { checkKickStreams };