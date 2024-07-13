const SERVER_PREFIX = "pserv-";

/**
 *
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const ram = 8;
  let i = findServerIndex(ns);
  while (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    // Check if we have enough money to purchase a server
    if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
      let hostname = ns.purchaseServer(SERVER_PREFIX + i, ram);
      ns.print(`Purchased server ${hostname}`);
    }
    await ns.sleep(1000);
  }
}

function findServerIndex(ns) {
  return ns.getPurchasedServers().length + 1;
}
