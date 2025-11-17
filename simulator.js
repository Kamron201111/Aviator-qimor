// simulator.js
// Oddiy Aviator multiplikator generatsiyasi va bitta roundni tekshirish
module.exports = {
  randomMultiplier,
  resolveRound,
};

function randomMultiplier() {
  // heavy-tail distribution: inverse transform with power to get long tail
  // results >= 1.00, rounded to 2 decimals, clamp to 1000 for safety
  const r = Math.random();
  const m = Math.max(1.0, Math.pow(1 / (1 - r), 0.9));
  return Math.round(Math.min(m, 1000) * 100) / 100;
}

function resolveRound(bet, cashoutMultiplier) {
  const m = randomMultiplier();
  const win = m >= cashoutMultiplier;
  const profit = win ? +(bet * (cashoutMultiplier - 1)).toFixed(2) : -Math.min(bet, bet);
  return {
    multiplier: m,
    win,
    profit,
  };
}
