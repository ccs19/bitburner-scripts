/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  let stocks = ns.stock.getSymbols();
  for (let i = 0; i < stocks.length; i++) {
    if (ns.stock.getForecast(stocks[i]) >= 0.55) {
      ns.tprintf("%s %s", stocks[i], ns.stock.getForecast(stocks[i]));
    }
  }
  const symbols = ns.stock.getSymbols();
  let best = [];
  for (const symbol of symbols) {
    const forecast = ns.stock.getForecast(symbol);
    if (forecast >= 0.55) {
      best.push(symbol);
    }
  }
  best = best.sort((a, b) => {
    return ns.stock.getForecast(b) - ns.stock.getForecast(a);
  });
  ns.tprintf("%s", JSON.stringify(best));
  ns.tprintf("%s", ns.stock.getMaxShares("NTLK"));
}
