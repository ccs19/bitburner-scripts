const VALUES = {
  T1: 8,
  T2: 16,
  T3: 32,
  T4: 64,
  T5: 128,
  T6: 256,
  T7: 512,
  T8: 1024,
  T9: 2048,
  T10: 4096,
  T11: 8192,
  T12: 16384,
  T13: 32768,
  T14: 65536,
  T15: 131072,
  T16: 262144,
  T17: 524288,
  T18: 1048576,
};
/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const args = ns.args.map((arg) => arg.toString().toUpperCase());
  const tier = args.filter((arg) => arg.toString().startsWith("T"))[0];
  const isPrint = args.indexOf("PRINT") > -1 || args.indexOf("P") > -1;
  const isBuy = args.indexOf("BUY") > -1 || args.indexOf("B") > -1;
  const usage = `Usage: run upgrade-servers.js T1|T2|T3|T4|T5|T6|T7|T8|T9|T10|T11|T12|T13|T14|T15|T16|T17|T18 [print|p] [buy|b]`;
  if (!tier || !VALUES[tier]) {
    ns.tprint(usage);
    return;
  }
  if (!isPrint && !isBuy) {
    ns.tprint(usage);
    return;
  }

  const value = VALUES[tier];
  const servers = readPlayerServers(ns);
  if (isPrint) {
    let total = 0;
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      let _upgradeCost = ns.getPurchasedServerUpgradeCost(server, value);
      total += _upgradeCost;
      const upgradeCost = ns.formatNumber(_upgradeCost);
      const currentRam = ns.formatRam(ns.getServerMaxRam(server));
      const upgradeRam = ns.formatRam(value);
      ns.tprintf(`${server} \t ${currentRam} -> ${upgradeRam}`);
    }
    const totalCost = ns.formatNumber(total);
    ns.tprintf(`Total upgrade cost: ${totalCost}`);
  } else if (isBuy) {
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const success = ns.upgradePurchasedServer(server, value);
      ns.tprint(
        `Upgraded server ${server} to ${tier} with success: ${success}`
      );
    }
  }
}

/**
 * @param {import("NS").NS} ns
 */
function readPlayerServers(ns) {
  const servers = ns.getPurchasedServers();
  return servers;
}
