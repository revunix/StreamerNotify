# StreamerNotify

**StreamerNotify** is a Node.js service to monitor streamers on Twitch and Kick, sending notifications via Telegram **and** Discord.  
Ideal for running in Docker to automatically receive alerts when your favorite streamers go live!

---

## Features

- Monitor multiple Twitch and Kick streamers in parallel
- Notifications via Telegram (bot) and Discord (webhook)
- Colorful, readable logs (with Chalk)
- Built-in `/health` HTTP endpoint for service monitoring
- Easy configuration via Docker Compose environment variables
- Modular, easily extendable, and Docker-ready

---

## Example Notification

```
👤 Streamer: *roshtein*
🎮 Currently playing: *Slots & Casino*
👀 Viewers: *12502*

🔴 [Watch on Kick](https://kick.com/roshtein)
```

---

## Quickstart

### 1. Clone the repository

```bash
git clone https://github.com/revunix/StreamerNotify.git
cd streamernotify
```

### 2. Adjust Configuration (in `docker-compose.yml`)

All configuration is managed via environment variables inside your `docker-compose.yml`.  

**Example section:**
```yaml
    environment:
      TELEGRAM_TOKEN: "YOUR_TELEGRAM_TOKEN"
      TELEGRAM_CHATID: "YOUR_TELEGRAM_CHAT_ID"
      ENABLE_TWITCH: "true"
      TWITCH_CLIENT_ID: "YOUR_TWITCH_CLIENT_ID"
      TWITCH_CLIENT_SECRET: "YOUR_TWITCH_CLIENT_SECRET"
      TWITCH_STREAMERS: "YOUR_TWITCH_STREAMERS,YOUR_TWITCH_STREAMERS_2"
      ENABLE_KICK: "true"
      KICK_CLIENT_ID: "YOUR_KICK_CLIENT_ID"
      KICK_CLIENT_SECRET: "YOUR_KICK_CLIENT_SECRET"
      KICK_STREAMERS: "YOUR_KICK_STREAMERS,YOUR_KICK_STREAMERS_2"
      ENABLE_DISCORD: "true"
      DISCORD_WEBHOOK_URLS: "YOUR_DISCORD_WEBHOOK_URL"
      MESSAGE_TEMPLATE: |
        👤 Streamer: *{user_name}*
        🎮 Currently playing: *{game_name}*
        👀 Viewers: *{viewer_count}*

        🔴 [Watch on {platform}]({user_url})
```

**Notes:**
- Multiple chat IDs, streamer names, or webhook URLs are comma-separated.
- The `MESSAGE_TEMPLATE` can be customized. Use `{user_name}`, `{game_name}`, `{viewer_count}`, `{platform}`, and `{user_url}` as placeholders.
- All environment variables can be set directly in `docker-compose.yml` under the `environment` section.

---

### 3. Build & Run

```bash
docker compose up -d --build
```

---

### 4. Health Check

The service exposes a health endpoint for monitoring:

```
GET http://localhost:3000/health
```

---

## Configuration Reference

| Variable                | Description                                                      | Required        |
|-------------------------|------------------------------------------------------------------|-----------------|
| TELEGRAM_TOKEN          | Telegram bot token                                               | Yes (for Telegram) |
| TELEGRAM_CHATID         | Chat ID(s) to send notifications to (comma-separated)            | Yes (for Telegram) |
| ENABLE_TWITCH           | Enable Twitch notifications ("true"/"false")                     | Optional (default: true) |
| TWITCH_CLIENT_ID        | Twitch API client ID                                             | Yes (for Twitch) |
| TWITCH_CLIENT_SECRET    | Twitch API secret                                                | Yes (for Twitch) |
| TWITCH_STREAMERS        | Twitch streamer usernames (comma-separated, case-sensitive)      | Yes (for Twitch) |
| ENABLE_KICK             | Enable Kick notifications ("true"/"false")                       | Optional (default: true) |
| KICK_CLIENT_ID          | Kick API client ID (*optional, depends on implementation*)       | Yes (for Kick)   |
| KICK_CLIENT_SECRET      | Kick API secret (*optional, depends on implementation*)          | Yes (for Kick)   |
| KICK_STREAMERS          | Kick streamer usernames (comma-separated, lowercase)             | Yes (for Kick)   |
| ENABLE_DISCORD          | Enable Discord notifications ("true"/"false")                    | Optional (default: false) |
| DISCORD_WEBHOOK_URLS    | Discord webhook URL(s) (comma-separated)                         | Yes (for Discord)|
| CHECK_INTERVAL_MS       | How often to check for live status (in milliseconds)             | Optional (default: 60000) |
| MESSAGE_TEMPLATE        | Notification message template (see above for placeholders)        | Optional        |

---

## Logging

- Logs are colorized for readability (INFO, WARN, ERROR, etc.).
- You can set `LOG_LEVEL` (e.g. "info", "debug") via environment variables if needed.

---

## Health Endpoint

- The service listens on port 3000 for `/health` requests.
- Useful for Docker healthchecks and uptime monitoring.

---

## Extending

- To add more notification targets (e.g. Slack), see `notifier.js`.
- To customize notifications, adjust the `MESSAGE_TEMPLATE`.

---

## License

MIT

---

**Questions or suggestions?**  
Open an [issue](https://github.com/revunix/StreamerNotify/issues) or submit a pull request!
