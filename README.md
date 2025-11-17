```markdown
# Aviator Telegram Simulator Bot

Quick demo Telegram bot that simulates Aviator rounds. Works as a demo/training tool (no real money integration).

Setup:
1. Install Node.js 16+
2. Clone files and run:
   npm install
3. Create .env with:
   TELEGRAM_BOT_TOKEN=your_token_here
4. Start:
   npm start

Commands:
- /start - welcome and help
- /balance - show balance
- /deposit <sum> - add demo credits
- /bet <sum> <cashout> - single bet
- /auto start <bet> <cashout> [stopLoss] [targetProfit] - start auto-betting
- /auto stop - stop auto-betting
- /stats - show statistics

Notes:
- This is a demo. If you want persistence, add a database (SQLite/Postgres) and save per-user state.
- For real-money platform integration you must have the platform's official API and follow their terms. I cannot help bypass restrictions or do anything against platform rules.
```
