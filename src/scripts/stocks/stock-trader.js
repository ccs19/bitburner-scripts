let orders;
let cash;

const MAX_INVEST_PCT = 0.25;
const BUY_SELL_LONG_THRESHOLD = 0.55;
const BUY_SELL_SHORT_THRESHOLD = 0.45;

const STOCKS_FILE = "/data/stocks/stocks.json";

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  if (ns.args.indexOf("nobuy") > -1) {
    cash = 0;
    ns.tprintf("Not buying stocks");
  } else {
    cash = ns.getServerMoneyAvailable("home") * MAX_INVEST_PCT;
    ns.tprintf("Investing %s", ns.formatNumber(cash));
  }
  if (ns.fileExists(STOCKS_FILE)) {
    orders = JSON.parse(ns.read(STOCKS_FILE));
  } else {
    orders = {};
  }
  while (true) {
    for (const symbol of Object.keys(orders)) {
      const shares = orders[symbol];
      const longShares = shares.filter((share) => share.position === "L");
      sellLongStock(ns, symbol, longShares);
    }
    if (cash > 0) {
      buyLongStocks(ns);
    }
    await ns.stock.nextUpdate();
  }
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {string} symbol
 * @param {import("NS").StockOrderObject[]} shares
 */
function sellLongStock(ns, symbol, shares) {
  const sellLong = shouldSellLong(ns, symbol);
  let shareAmount = 0;
  for (const share of shares) {
    shareAmount += share.shares;
  }
  if (sellLong) {
    let soldPerShare = ns.stock.sellStock(symbol, shareAmount);
    if (soldPerShare === 0) {
      return;
    }
    cash += soldPerShare * shareAmount;
    ns.tprintf(
      "Selling long %s for %s profit",
      symbol,
      ns.formatNumber(ns.stock.getSaleGain(symbol, shareAmount, "Long"))
    );
    delete orders[symbol];
    ns.write(STOCKS_FILE, JSON.stringify(orders), "w");
    ns.tprintf("New cash available: %s", ns.formatNumber(cash));
  }
}
/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").StockOrderObject[]} shares
 */
function calculateInitialInvestment(ns, shares) {
  let total = 0;
  for (const share of shares) {
    total += share.price * share.shares;
  }
  return total;
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {string} symbol
 * @returns {boolean}
 */
function shouldSellLong(ns, symbol) {
  const forecast = ns.stock.getForecast(symbol);
  if (forecast <= BUY_SELL_LONG_THRESHOLD - 0.04) {
    return true;
  }
  return false;
}

/**
 * @param {import("NS").NS} ns
 * @returns {string[]} Best stocks to buy for long term
 */
function findBestBuyLong(ns) {
  const symbols = ns.stock.getSymbols();
  let best = [];
  for (const symbol of symbols) {
    const forecast = ns.stock.getForecast(symbol);
    if (forecast >= BUY_SELL_LONG_THRESHOLD) {
      best.push(symbol);
    }
  }
  best = best.sort((a, b) => {
    return ns.stock.getForecast(b) - ns.stock.getForecast(a);
  });
  return best;
}
/**
 *
 * @param {import("NS").NS} ns
 */
function buyLongStocks(ns) {
  if (cash < 0 && Object.keys(orders).length === 0) {
    ns.tprintf(
      "You ran out of money, you fool! You lost %s",
      ns.formatNumber(cash)
    );
    throw new Error("Out of money");
  }
  if (cash <= 0) {
    return;
  }
  const best = findBestBuyLong(ns);
  if (best.length === 0) {
    return;
  }
  let bought = false;
  for (const symbol of best) {
    if (cash === 0) {
      return;
    }
    if (cash < ns.stock.getPrice(symbol)) {
      continue;
    }
    const price = ns.stock.getPrice(symbol);
    let shares = Math.floor(cash / price);
    const maxShares = ns.stock.getMaxShares(symbol);
    const currentOwned = (orders[symbol] || []).reduce((acc, share) => {
      return acc + share.shares;
    }, 0);
    shares -= currentOwned;
    if (shares > maxShares) {
      shares = maxShares;
    }
    if (shares <= 0) {
      continue;
    }

    const buyPrice = ns.stock.buyStock(symbol, shares);
    if (buyPrice === 0) {
      continue;
    }
    ns.tprintf(
      "Buying %s shares of %s for %s (%s per share)",
      shares,
      symbol,
      ns.formatNumber(price * shares),
      ns.formatNumber(price)
    );
    cash -= price * shares;
    let order = orders[symbol] || [];
    order.push({
      position: "L",
      shares: shares,
      price: buyPrice,
    });
    bought = true;
    orders[symbol] = order;
  }
  if (bought) {
    ns.write(STOCKS_FILE, JSON.stringify(orders), "w");
    ns.tprintf("Cash available after buy: %s", ns.formatNumber(cash));
  }
}
