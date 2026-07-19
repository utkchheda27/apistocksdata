## Indian Stocks Pulse

Standalone scraper — **no Reddit posts, no custom subreddit, no Reddit API app**.  
Scrapes posts + comments from Indian market subs, scores sentiment, and DMs the digest to Telegram.

### Why no Reddit “Create App”?

Reddit’s [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) closed self-serve API keys. Personal scripts almost never get approved.  
This project reads public Reddit data via [Arctic Shift](https://arctic-shift.photon-reddit.com) instead — **no `REDDIT_CLIENT_ID` needed**.

### Flow

```
You (STOCKS list)
       │
  npm run scan
       │
  Arctic Shift (posts + comments)
  ┌────┴────────────────────────┐
  r/IndianStreetBets            │
  r/IndianStockMarket           │
  r/DalalStreetTalk             │
  └────┬────────────────────────┘
       │ filter by tickers
       │ score sentiment
       ▼
  Telegram DM
```

### Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) → copy the token  
2. Message your bot once  
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` → copy `message.chat.id`  
4. Configure env:

```bash
cp .env.example .env
# edit TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

5. Run:

```bash
npm install
npm run scan
```

Or pass tickers (max 10):

```bash
npm run scan -- RELIANCE TCS INFY HDFCBANK
```

Preview without Telegram:

```bash
npm run scan -- --dry-run RELIANCE TCS
```

### Env

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | yes* | Bot token (*unless `--dry-run`) |
| `TELEGRAM_CHAT_ID` | yes* | Your numeric chat id |
| `STOCKS` | no | Comma-separated watchlist |
| `REDDIT_USER_AGENT` | no | Optional request label |

### Schedule (optional)

```cron
0 9,15 * * 1-5 cd /path/to/apistocksdata && npm run scan
```
