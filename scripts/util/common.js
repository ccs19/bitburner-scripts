const SERVER_FILE = "/data/server-list/server-list.json";
const HOSTNAME_FILE = "/data/server-list/server-hostnames.json";
const PLAYER_SERVER_FILE = "/data/server-list/player-servers.json";
const SERVER_LIST_SCRIPT = "/scripts/util/fetch-server-list.js";

/**
 * @param {import("NS").NS} ns
 * @param {number} pid
 * @param {string} host
 */
function pidIsRunning(ns, pid, host = "home") {
  const processes = ns.ps(host);
  return processes.some((p) => p.pid === pid);
}

/**
 * @param {import("NS").NS} ns
 * @param {string} argName
 * @returns {import("NS").ScriptArg}
 */
function getArg(ns, argName) {
  const args = ns.args;
  const index = args.indexOf(argName);
  if (index < 0) {
    return undefined;
  }
  return args[index];
}

/**
 * @param {import("NS").NS} ns
 * @param {string} argName
 * @returns {import("NS").ScriptArg}
 */
function getArgValue(ns, argName) {
  const args = ns.args;
  const index = args.indexOf(argName);
  if (index < 0) {
    return undefined;
  }
  if (index + 1 >= args.length) {
    return undefined;
  }
  return args[index + 1];
}

/**
 * @param {import("NS").NS} ns
 * @param {boolean} hackable Return only hackable servers
 * @param {number} hackThreshold The hacking skill modifier. Defaults to 1.
 * Returns servers with a required hacking skill less than
 * or equal to the player's hacking skill multiplied by this value.
 * For example, if the player's hacking skill is 1000 and the
 * hackThreshold is 0.5, then servers with a required hacking skill
 * of 500 or less will be returned.
 * @returns {import("NS").Server[]}
 */
function readServers(ns, hackable = false, hackThreshold = 1) {
  if (hackThreshold > 1) {
    hackThreshold = 1;
  }
  let hackingSkill = Math.floor(ns.getHackingLevel() * hackThreshold);
  if (hackingSkill < 1) {
    hackingSkill = 1;
  } else if (hackingSkill > ns.getHackingLevel()) {
    hackingSkill = ns.getHackingLevel();
  }
  const servers = fetchServers(ns);
  if (hackable) {
    const filtered = servers.filter(
      (/** @type {import("NS").Server} */ s) =>
        s.hostname !== "home" &&
        !s.purchasedByPlayer &&
        hackingSkill >= s.requiredHackingSkill &&
        s.moneyMax > 0 &&
        s.hasAdminRights
    );
    return filtered;
  }
  return servers;
}

/**
 * @param {import("NS").NS} ns
 * @returns {import("NS").Server[]}
 */
function readPlayerServers(ns) {
  return fetchServers(ns).filter((s) => s.purchasedByPlayer);
}

/**
 * @param {import("NS").NS} ns
 * @returns {import("NS").Server[]}
 */
function readBotServers(ns) {
  return fetchServers(ns).filter((s) => s.hasAdminRights);
}

/**
 * Returns an array of functions that can be used to open ports.
 * @param {import("NS").NS} ns
 * @returns {Function[]}
 */
function getPortOpenTools(ns) {
  let portOpenTools = [];
  if (ns.fileExists("BruteSSH.exe", "home")) {
    portOpenTools.push((serverName) => ns.brutessh(serverName));
  }
  if (ns.fileExists("FTPCrack.exe", "home")) {
    portOpenTools.push((serverName) => ns.ftpcrack(serverName));
  }
  if (ns.fileExists("relaySMTP.exe", "home")) {
    portOpenTools.push((serverName) => ns.relaysmtp(serverName));
  }
  if (ns.fileExists("HTTPWorm.exe", "home")) {
    portOpenTools.push((serverName) => ns.httpworm(serverName));
  }
  if (ns.fileExists("SQLInject.exe", "home")) {
    portOpenTools.push((serverName) => ns.sqlinject(serverName));
  }

  return portOpenTools;
}

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (Number(seconds) < 10 ? "0" : "") + seconds;
}

/**
 *
 * Fetch an array of all available servers. The "home" server will always be first in the list,
 * followed by player owned servers, then other servers.
 * @param {import("NS").NS} ns */
export function fetchServers(ns) {
  const neighbors = ns.scan();
  var processed = [];
  var toProcess = [];
  // List of servers
  var otherServers = [];
  var home = [];
  var playerOwned = [];
  var finalList = [];

  toProcess = toProcess.concat(neighbors);
  while (toProcess.length > 0) {
    const neighbor = toProcess.pop();
    const server = ns.getServer(neighbor);
    if (processed.indexOf(neighbor) >= 0) {
      continue;
    }
    if (server.hostname === "home") {
      home.push(server);
    } else if (server.purchasedByPlayer) {
      playerOwned.push(server);
    } else {
      otherServers.push(server);
    }

    let nNeighbors = ns.scan(server.hostname);
    for (var i = 0; i < nNeighbors.length; i++) {
      if (processed.indexOf(nNeighbors[i]) >= 0) {
        continue;
      }
      toProcess.push(nNeighbors[i]);
    }
    processed.push(server.hostname);
  }
  finalList = finalList.concat(home).concat(playerOwned).concat(otherServers);
  return finalList;
}

export {
  pidIsRunning,
  getArg,
  getArgValue,
  readServers,
  readPlayerServers,
  getPortOpenTools,
  readBotServers,
  millisToMinutesAndSeconds,
};
