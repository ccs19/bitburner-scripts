import { readServers, millisToMinutesAndSeconds } from "scripts/util/common";

let NS = null;

const HACK_SKILL = (ns) => ns.getHackingLevel();
const HACK_TIME = (ns, hostname) => ns.getHackTime(hostname);
const GROW_TIME = (ns, hostname) => ns.getGrowTime(hostname);
const WEAKEN_TIME = (ns, hostname) => ns.getWeakenTime(hostname);
const SORTS = {
  HOSTNAME: (a, b) => a.hostname.localeCompare(b.hostname),
  RAM: (a, b) => a.maxRam - b.maxRam,
  CORES: (a, b) => a.cpuCores - b.cpuCores,
  MONEY: (a, b) => a.moneyMax - b.moneyMax,
  ROOT: (a, b) => a.hasAdminRights - b.hasAdminRights,
  BACKDOOR: (a, b) => a.backdoorInstalled - b.backdoorInstalled,
  HACK_REQ: (a, b) => a.requiredHackingSkill - b.requiredHackingSkill,
  CAN_HACK: (a, b) =>
    (HACK_SKILL(NS) >= b.requiredHackingSkill ? 1 : 0) -
    (HACK_SKILL(NS) >= a.requiredHackingSkill ? 1 : 0),
  HACK_TIME: (a, b) => HACK_TIME(NS, a.hostname) - HACK_TIME(NS, b.hostname),
  GROW_TIME: (a, b) => GROW_TIME(NS, a.hostname) - GROW_TIME(NS, b.hostname),
  WEAKEN_TIME: (a, b) =>
    WEAKEN_TIME(NS, a.hostname) - WEAKEN_TIME(NS, b.hostname),
};

const PATH = "PATH";
const DEFAULT_SORT = "HOSTNAME";

/**
 * Describes all non user owned servers.
 * @param {import("NS").NS} ns */
export async function main(ns) {
  ns.getHackingLevel();
  NS = ns;
  let servers = readServers(ns, false);

  if (ns.args.indexOf("all") < 0) {
    servers = servers
      .filter((s) => s.hostname !== "home")
      .filter((s) => !s.purchasedByPlayer);
  }
  if (NS.args.indexOf(PATH) > -1 && ns.args.length > 1) {
    if (ns.args[0] === PATH && ns.args.length === 2) {
      displayPath(ns);
      return;
    } else {
      ns.tprint(
        "Path Usage: describe PATH <target> - Find path from start to target server"
      );
      return;
    }
  }
  let sort = ns.args[0] || DEFAULT_SORT;
  servers = servers.sort(SORTS[sort]);
  ns.tprintf(
    "%-20s %-10s %-10s %-10s %-10s %-10s %-10s %-10s %-8s %-8s %-8s %-8s %-8s\n",
    "Hostname",
    "RAM",
    "$ Max",
    "$ Current",
    "Root",
    "Backdoor",
    "Hack Req",
    "Can Hack",
    "HackTime",
    "GrowTime",
    "WeakTime",
    "WeakLvl",
    "Neighbors"
  );
  for (const server of servers) {
    ns.tprintf(
      "%-20s %-10s %-10s %-10s %-10s %-10s %-10s %-10s %-8s %-8s %-8s %-8s\n",
      server.hostname,
      ns.formatRam(server.maxRam),
      ns.formatNumber(server.moneyMax),
      ns.formatNumber(server.moneyAvailable),
      server.hasAdminRights,
      server.backdoorInstalled,
      server.requiredHackingSkill,
      ns.getHackingLevel() >= server.requiredHackingSkill ? "Yes" : "No",
      millisToMinutesAndSeconds(ns.getHackTime(server.hostname)),
      millisToMinutesAndSeconds(ns.getGrowTime(server.hostname)),
      millisToMinutesAndSeconds(ns.getWeakenTime(server.hostname)),
      ns.getServerMinSecurityLevel(server.hostname)
    );
  }
}

/**
 *
 * @param {import("NS").NS} ns
 */
function displayPath(ns) {
  let startServer = ns.getHostname();
  let target = ns.args[1];
  if (target === undefined) {
    ns.alert(
      "Usage: describe PATH <target> - Find path from current to target server"
    );
    return;
  }
  let [results, isFound] = findPath(
    ns,
    target.toString(),
    startServer,
    [],
    [],
    false
  );
  if (!isFound) {
    ns.alert("Server not found!");
  } else {
    ns.tprintf(results.join(" --> "));
  }
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {string} target
 * @param {string} serverName
 * @param {string[]} serverList
 * @param {string[]} ignore
 * @param {boolean} isFound
 * @returns
 */
function findPath(ns, target, serverName, serverList, ignore, isFound) {
  ignore.push(serverName);
  let scanResults = ns.scan(serverName);
  for (let server of scanResults) {
    if (ignore.includes(server)) {
      continue;
    }
    if (server === target) {
      serverList.push(server);
      return [serverList, true];
    }
    serverList.push(server);
    [serverList, isFound] = findPath(
      ns,
      target,
      server,
      serverList,
      ignore,
      isFound
    );
    if (isFound) {
      return [serverList, isFound];
    }
    serverList.pop();
  }
  return [serverList, false];
}
