# StreamerNotify

A bot that monitors the status of Twitch and Kick streams and sends notifications via Telegram.

## Features

- Monitors multiple Twitch and Kick streamers simultaneously.
- Sends customizable Telegram notifications when a streamer goes live.
- Platform support can be enabled or disabled individually via environment variables.
- Dockerized for hassle-free deployment.

## Prerequisites

- Docker
- Docker Compose

## Cloning the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/revunix/StreamerNotify.git
cd StreamerNotify
```

## Configuration

Edit the `docker-compose.yml` file to include your environment variables:

```yaml
services:
  app:
    container_name: StreamerNotify
    build: .
    environment:
      TELEGRAM_TOKEN: "your_telegram_bot_token"
      TELEGRAM_CHATID: "your_telegram_chat_id"
      # Twitch settings
      ENABLE_TWITCH: "true"                        # Set to "false" to disable Twitch monitoring
      TWITCH_CLIENT_ID: "your_twitch_client_id"
      TWITCH_CLIENT_SECRET: "your_twitch_client_secret"
      TWITCH_STREAMERS: "streamer1,streamer2"
      # Kick settings
      ENABLE_KICK: "true"                          # Set to "false" to disable Kick monitoring
      KICK_CLIENT_ID: "your_kick_client_id"
      KICK_CLIENT_SECRET: "your_kick_client_secret"
      KICK_STREAMERS: "streamerA,streamerB"
      # Message template (customize the notification)
      MESSAGE_TEMPLATE: |
        🟢 Platform: *{platform}*
        👤 Streamer: *{user_name}*
        🎮 Currently playing: *{game_name}*
        👀 Viewers: *{viewer_count}*

        🔴 [Watch here]({user_url})
      DISABLE_WEB_PAGE_PREVIEW: "true"
    network_mode: bridge
    restart: unless-stopped
```

### Environment Variables

| Variable                   | Description                                               |
|----------------------------|-----------------------------------------------------------|
| TELEGRAM_TOKEN             | Telegram Bot API token                                    |
| TELEGRAM_CHATID            | Telegram chat/channel ID                                  |
| ENABLE_TWITCH              | Enable Twitch monitoring ("true" or "false")              |
| TWITCH_CLIENT_ID           | Twitch API client ID                                      |
| TWITCH_CLIENT_SECRET       | Twitch API client secret                                  |
| TWITCH_STREAMERS           | Comma-separated Twitch streamer usernames                 |
| ENABLE_KICK                | Enable Kick monitoring ("true" or "false")                |
| KICK_CLIENT_ID             | Kick API client ID                                        |
| KICK_CLIENT_SECRET         | Kick API client secret                                    |
| KICK_STREAMERS             | Comma-separated Kick streamer usernames (lowercase)       |
| MESSAGE_TEMPLATE           | Telegram message template (see above for placeholders)    |
| DISABLE_WEB_PAGE_PREVIEW   | "true" to disable Telegram link previews                  |

#### Placeholders for `MESSAGE_TEMPLATE`:
- `{platform}`: Platform name (Twitch/Kick)
- `{user_name}`: Streamer username
- `{game_name}`: Current game/category
- `{viewer_count}`: Number of viewers
- `{user_url}`: URL to the stream

## Running the Application

### With Docker Compose

1. Build and start the container:
    ```bash
    docker compose -p StreamerNotify up -d --build
    ```

2. Stop the container:
    ```bash
    docker compose -p StreamerNotify down
    ```

## License

This project is licensed under the GPL-3.0 License. See the `LICENSE` file for more details.
