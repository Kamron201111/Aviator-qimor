// bot.js
// Telegraf-based Telegram bot — demo aviator simulator
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { randomMultiplier, resolveRound } = require('./simulator');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Set TELEGRAM_BOT_TOKEN in .env or environment variables');
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// In-memory user store (for demo). Replace with DB for persistence.
const users = new Map();

// Default starting balance for new users
const DEFAULT_BALANCE = 1000;

function ensureUser(ctx) {
  const id = ctx.from.id;
  if (!users.has(id)) {
    users.set(id, {
      balance: DEFAULT_BALANCE,
      stats: { bets: 0, wins: 0, losses: 0, profit: 0 },
      auto: null, // { intervalId, bet, cashout, stopLoss, targetProfit }
    });
  }
  return users.get(id);
}

bot.start((ctx) => {
  const u = ensureUser(ctx);
  ctx.reply(
    `Salom, ${ctx.from.first_name || 'player'}!\n` +
      `Aviator simulatorga xush kelibsiz.\n` +
      `Hisobingiz: ${u.balance} credits.\n\n` +
      `Buyruqlar:\n` +
      `/balance - balansni ko'rsatish\n` +
      `/deposit <sum> - demo balansga qo'shish\n` +
      `/bet <sum> <cashout> - bir marta tikish (masalan: /bet 10 2.5)\n` +
      `/auto start <sum> <cashout> [stopLoss] [targetProfit] - avtomatik tikish\n` +
      `/auto stop - avtomatikni to'xtatish\n` +
      `/stats - statistikani ko'rsatish\n` +
      `/help - yordam`
  );
});

bot.command('help', (ctx) => {
  ctx.reply('Qoʻshimcha yordam: /start, /balance, /deposit, /bet, /auto, /stats');
});

bot.command('balance', (ctx) => {
  const u = ensureUser(ctx);
  ctx.reply(`Sizning balans: ${u.balance.toFixed(2)} credits`);
});

bot.command('deposit', (ctx) => {
  const u = ensureUser(ctx);
  const parts = ctx.message.text.split(/\s+/);
  const amount = parseFloat(parts[1]);
  if (!amount || amount <= 0) return ctx.reply('Iltimos musbat raqam kiriting: /deposit 100');
  u.balance += amount;
  ctx.reply(`+${amount.toFixed(2)} qo'shildi. Yangi balans: ${u.balance.toFixed(2)}`);
});

bot.command('bet', (ctx) => {
  const u = ensureUser(ctx);
  const parts = ctx.message.text.split(/\s+/);
  const bet = parseFloat(parts[1]);
  const cashout = parseFloat(parts[2]);
  if (!bet || bet <= 0 || !cashout || cashout <= 1) {
    return ctx.reply('Foydalanish: /bet <sum> <cashout> (masalan: /bet 5 2.0)');
  }
  if (bet > u.balance) return ctx.reply('Balansda yetarli mablagʻ yoʻq.');
  const res = resolveRound(bet, cashout);
  u.balance += res.profit;
  u.stats.bets += 1;
  if (res.win) {
    u.stats.wins += 1;
  } else {
    u.stats.losses += 1;
  }
  u.stats.profit += res.profit;
  ctx.reply(
    `Round natijasi:\n` +
      `Multiplikator: ${res.multiplier}\n` +
      `${res.win ? 'YUTDINGIZ' : 'YOʻQOTDINGIZ'} ${res.profit >= 0 ? '+' : ''}${res.profit.toFixed(2)}\n` +
      `Balans: ${u.balance.toFixed(2)}`
  );
});

// /auto start 1 2.0 50 200  (bet, cashout, stopLoss, targetProfit)
bot.command('auto', (ctx) => {
  const u = ensureUser(ctx);
  const parts = ctx.message.text.split(/\s+/);
  const action = parts[1];
  if (!action) return ctx.reply('Foydalanish: /auto start <bet> <cashout> [stopLoss] [targetProfit] OR /auto stop');
  if (action === 'stop') {
    if (u.auto && u.auto.intervalId) {
      clearInterval(u.auto.intervalId);
      u.auto = null;
      return ctx.reply('Avtomatik tikish toʻxtatildi.');
    } else {
      return ctx.reply('Hech qanday avtomatik jarayon yoʻq.');
    }
  }
  if (action === 'start') {
    const bet = parseFloat(parts[2]);
    const cashout = parseFloat(parts[3]);
    const stopLoss = parts[4] ? parseFloat(parts[4]) : null; // stop when loss reaches this amount from starting balance
    const targetProfit = parts[5] ? parseFloat(parts[5]) : null; // stop when profit reaches this
    if (!bet || bet <= 0 || !cashout || cashout <= 1) {
      return ctx.reply('Foydalanish: /auto start <bet> <cashout> [stopLoss] [targetProfit]');
    }
    if (bet > u.balance) return ctx.reply('Balansda yetarli mablagʻ yoʻq.');

    if (u.auto && u.auto.intervalId) {
      clearInterval(u.auto.intervalId);
      u.auto = null;
    }

    const startingBalance = u.balance;
    const intervalId = setInterval(() => {
      if (bet > u.balance) {
        clearInterval(intervalId);
        u.auto = null;
        return ctx.telegram.sendMessage(ctx.chat.id, 'Balans tugadi, avtomatik toʻxtatildi.');
      }
      const res = resolveRound(bet, cashout);
      u.balance += res.profit;
      u.stats.bets += 1;
      if (res.win) u.stats.wins += 1;
      else u.stats.losses += 1;
      u.stats.profit += res.profit;

      // check stop conditions
      const lossFromStart = startingBalance - u.balance;
      const profitFromStart = u.balance - startingBalance;
      if ((stopLoss && lossFromStart >= stopLoss) || (targetProfit && profitFromStart >= targetProfit)) {
        clearInterval(intervalId);
        u.auto = null;
        return ctx.telegram.sendMessage(
          ctx.chat.id,
          `Avtomatik to'xtadi. Soʻngi natija: multiplier=${res.multiplier}, balans=${u.balance.toFixed(2)}`
        );
      }
      // optionally send periodic updates or only on wins/losses
    }, 1200); // har 1.2s bir tikish; o'zgartiring kerak bo'lsa

    u.auto = { intervalId, bet, cashout, stopLoss, targetProfit };
    return ctx.reply(`Avtomatik ishga tushdi: bet=${bet}, cashout=${cashout}`);
  }

  ctx.reply('Nomaʼlum action. Foydalanish: /auto start|stop ...');
});

bot.command('stats', (ctx) => {
  const u = ensureUser(ctx);
  ctx.reply(
    `Statistika:\n` +
      `Bets: ${u.stats.bets}\n` +
      `Wins: ${u.stats.wins}\n` +
      `Losses: ${u.stats.losses}\n` +
      `Net profit: ${u.stats.profit.toFixed(2)}\n` +
      `Balans: ${u.balance.toFixed(2)}`
  );
});

bot.launch().then(() => {
  console.log('Bot started');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
