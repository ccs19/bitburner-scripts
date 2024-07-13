/**
 * Only buy node or upgrades if they are N percent or less of available cash.
 * @type {number}
 */
const BUDGET = 0.05;

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  while (true) {
    checkBuyNodes(ns);
    const nodes = getNodes(ns);
    for (let i = 0; i < nodes; i++) {
      levelUpNode(ns, i);
      levelUpRam(ns, i);
      levelUpCores(ns, i);
    }
    await ns.sleep(30000);
  }
}

/**
 * @param {import("NS").NS} ns
 */
function getAvailableCash(ns) {
  return ns.getServerMoneyAvailable("home") * BUDGET;
}

/**
 * @param {import("NS").NS} ns
 */
function checkBuyNodes(ns) {
  while (getAvailableCash(ns) > ns.hacknet.getPurchaseNodeCost()) {
    const result = ns.hacknet.purchaseNode();
    if (result === -1) {
      break;
    }
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {number} node
 */
function levelUpNode(ns, node) {
  while (getAvailableCash(ns) > ns.hacknet.getLevelUpgradeCost(node)) {
    if (!ns.hacknet.upgradeLevel(node)) {
      break;
    }
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {number} node
 */
function levelUpRam(ns, node) {
  while (getAvailableCash(ns) > ns.hacknet.getRamUpgradeCost(node)) {
    if (!ns.hacknet.upgradeRam(node)) {
      break;
    }
  }
}

/**
 * @param {import("NS").NS} ns
   * @param {number} node
 
 */
function levelUpCores(ns, node) {
  while (getAvailableCash(ns) > ns.hacknet.getCoreUpgradeCost(node)) {
    if (!ns.hacknet.upgradeCore(node)) {
      break;
    }
  }
}

/**
 * @param {import("NS").NS} ns
 * @returns number
 */
function getNodes(ns) {
  return ns.hacknet.numNodes();
}
