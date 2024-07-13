import {
  readPlayerServers,
  readServers,
  pidIsRunning,
  readBotServers,
} from "scripts/util/common";

const GROW_SCRIPT = "/scripts/hack/do-grow.js";
const WEAKEN_SCRIPT = "/scripts/hack/do-weaken.js";
const HACK_SCRIPT = "/scripts/hack/do-hack.js";
const CONSTANTS = "/scripts/hack/hack-constants.js";

// Action types
const HACK = "HACK";
const WEAKEN = "WEAKEN";
const GROW = "GROW";

const FILES = [GROW_SCRIPT, WEAKEN_SCRIPT, HACK_SCRIPT, CONSTANTS];
const TARGET_HACK_MONEY_PERCENT = 0.75;
const WEAK_PER_THREAD = 0.05;
const MAX_HOME_RAM = 0.8;

let GROW_COST;
let WEAKEN_COST;
let HACK_COST;

const FALLBACK_GROW_THREADS = 100;
const FALLBACK_HACK_THREADS = 20;

const sleepTimeSeconds = 10;
const sleepTimeMs = sleepTimeSeconds * 1000;
const printReportTime = 30;
const checkNewHackableServersSeconds = 60;

let pServerAvailability = new Map();

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const servers = readServers(ns, true);
  let playerServers = readBotServers(ns);
  ns.tprint(`Found ${servers.length} servers to hack`);
  //killAll(ns, playerServers);
  uploadHackFiles(ns, playerServers);
  initCosts(ns);
  initPlayerServerAvailability(ns, playerServers);
  await startHackingAway(ns, servers, playerServers);
}

/**
 * Initialize the availability of each player server.
 * This calculates the maximum number of threads that can be run for each script type
 * assuming that the server is running no other scripts.
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} playerServers
 * @returns {void}
 * */
function initPlayerServerAvailability(ns, playerServers) {
  playerServers.forEach((server) => {
    recalculatePlayerServerAvailability(ns, server.hostname);
  });
}

/**
 * Find the maximum number of threads that can be run for a script.
 * @param {number} scriptCost
 * @param {number} ram
 * @returns {number}
 * */
function findMaxThreads(scriptCost, ram) {
  if (ram <= 0) {
    return 0;
  }
  return Math.floor(ram / scriptCost);
}

/**
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} playerServers
 */
function uploadHackFiles(ns, playerServers) {
  for (const server of playerServers) {
    const success = ns.scp(FILES, server.hostname, "home");
    if (!success) {
      ns.tprintf("Failed to upload hack files to %s", server.hostname);
    }
  }
}

/**
 * @param {import("NS").NS} ns
 */
function initCosts(ns) {
  GROW_COST = ns.getScriptRam(GROW_SCRIPT);
  WEAKEN_COST = ns.getScriptRam(WEAKEN_SCRIPT);
  HACK_COST = ns.getScriptRam(HACK_SCRIPT);
}

let running = new Set();
let targets = new Map();

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} playerServers
 * @param {import("NS").Server[]} servers
 */
async function startHackingAway(ns, servers, playerServers) {
  initHackWeakenGrow(ns, servers);

  var i = 0;

  while (true) {
    assignHack(ns);
    assignWeaken(ns);
    assignGrow(ns);
    await ns.sleep(sleepTimeMs);
    checkCompletions(ns);
    if (i % printReportTime === 0) {
      //printServerState(ns);
    }
    // print report every printReportTime seconds
    i += sleepTimeSeconds;
    if (i % checkNewHackableServersSeconds === 0) {
      checkForNewHackableServers(ns, servers);
    }
  }
}

function checkForNewHackableServers(ns, servers) {
  const allServers = readServers(ns, true);
  const existingServers = new Set(targets.keys());
  const newServers = new Set();
  allServers.forEach((server) => {
    if (!existingServers.has(server.hostname)) {
      newServers.add(server);
    }
  });
  if (newServers.size > 0) {
    ns.tprintf(
      "Found %d new servers to hack %s",
      newServers.size,
      Array.from(newServers)
        .map((s) => s.hostname)
        .join(", ")
    );
    initHackWeakenGrow(ns, Array.from(newServers));
  }
}

/**
 * @param {import("NS").NS} ns
 */
function assignHack(ns) {
  let hackTargets = [];
  targets.forEach((value, key) => {
    if (value.hack && value.hack.targetThreads > 0) {
      hackTargets.push(value.hack);
    }
  });
  // sort by skill level with easiest hack first
  hackTargets = hackTargets.sort((a, b) => a.reqSkill - b.reqSkill);
  hackTargets.forEach((hackObject) => {
    executeType(ns, HACK, hackObject);
  });
}

/**
 * @param {import("NS").NS} ns
 */
function assignWeaken(ns) {
  let weakenTargets = [];
  targets.forEach((value, key) => {
    if (value.weaken && value.weaken.targetThreads > 0) {
      weakenTargets.push(value.weaken);
    }
  });
  // sort by skill level with easiest hack first
  weakenTargets = weakenTargets.sort((a, b) => a.reqSkill - b.reqSkill);
  weakenTargets.forEach((hackObject) => {
    executeType(ns, WEAKEN, hackObject);
  });
}

/**
 * @param {import("NS").NS} ns
 */
function assignGrow(ns) {
  let growTargets = [];
  targets.forEach((value, key) => {
    if (value.grow && value.grow.targetThreads > 0) {
      growTargets.push(value.grow);
    }
  });

  // sort by skill level with easiest hack first
  growTargets = growTargets.sort((a, b) => a.reqSkill - b.reqSkill);
  growTargets.forEach((hackObject) => {
    executeType(ns, GROW, hackObject);
  });
}

/**
 * @param {import("NS").NS} ns
 * @param {string} actionType
 */
function executeType(ns, actionType, targetDefinition) {
  if (targetDefinition.currentThreads >= targetDefinition.targetThreads) {
    return;
  }
  const targetScript =
    actionType === HACK
      ? HACK_SCRIPT
      : actionType === WEAKEN
      ? WEAKEN_SCRIPT
      : GROW_SCRIPT;
  const targetThreads =
    targetDefinition.targetThreads - targetDefinition.currentThreads;
  const availableServers = findAvailableServers(
    ns,
    targetThreads,
    actionType,
    targetDefinition.hostName
  );
  availableServers.forEach((server) => {
    const pid = ns.exec(
      targetScript,
      server.serverHost,
      server.threads,
      targetDefinition.hostName,
      server.threads
    );
    if (pid === 0) {
      ns.tprintf(
        "Failed to start script %s on %s",
        targetScript,
        server.serverHost
      );
      return;
    }
    addRunningProcess(
      ns,
      ns.getServer(server.serverHost),
      ns.getServer(targetDefinition.hostName),
      pid,
      server.threads,
      ns.getScriptRam(targetScript)
    );
    recalculatePlayerServerAvailability(ns, server.serverHost);
    targetDefinition.currentThreads += server.threads;
  });
}

function findAvailableServers(ns, targetThreads, actionType, targetHostname) {
  let availableServers = [];
  let threadsRemaining = targetThreads;
  pServerAvailability.forEach((serverAvailability, serverHost) => {
    if (threadsRemaining <= 0) {
      return;
    }
    let pServerThreads = 0;
    switch (actionType) {
      case HACK:
        pServerThreads = serverAvailability.tHack;
        break;
      case WEAKEN:
        pServerThreads = serverAvailability.tWeaken;
        break;
      case GROW:
        pServerThreads = serverAvailability.tGrow;
        break;
    }
    if (pServerThreads > 0) {
      if (pServerThreads < threadsRemaining) {
        threadsRemaining -= pServerThreads;
        availableServers.push({ serverHost, threads: pServerThreads });
      } else if (
        pServerThreads >= threadsRemaining ||
        pServerThreads === threadsRemaining
      ) {
        availableServers.push({ serverHost, threads: threadsRemaining });
        threadsRemaining = 0;
      }
    }
  });
  return availableServers;
}

/**
 * @param {import("NS").NS} ns
 */
function checkCompletions(ns) {
  if (running.size === 0) {
    return;
  }
  const tempRunning = new Set(running);
  running.forEach((runningObject) => {
    if (pidIsRunning(ns, runningObject.pid, runningObject.playerHost)) {
      return;
    }
    recalculatePlayerServerAvailability(ns, runningObject.playerHost);
    reCalculateForHackTarget(ns, runningObject);
    tempRunning.delete(runningObject);
  });
  running = tempRunning;
}
/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} servers
 */
function initHackWeakenGrow(ns, servers) {
  for (const server of servers) {
    initHackTargetServers(ns, server);
  }
}

function addRunningProcess(ns, playerServer, server, pid, threads, type) {
  const runningObject = {
    ...getRunningObject(playerServer, server, pid, threads),
    type,
  };
  running.add(runningObject);
  recalculatePlayerServerAvailability(ns, playerServer.hostname);
}

function getRunningObject(playerServer, server, pid, threads, memory) {
  return {
    playerHost: playerServer.hostname,
    serverHost: server.hostname,
    pid,
    threads,
    memory,
  };
}

/**
 * @param {import("NS").NS} ns
 * @param {string} serverHost
 */
function recalculatePlayerServerAvailability(ns, serverHost) {
  let ram = ns.getServerMaxRam(serverHost);
  if (ram <= 0) {
    return;
  }
  if (serverHost === "home") {
    ram = ram * MAX_HOME_RAM;
  }
  const availableRam = ram - ns.getServerUsedRam(serverHost);
  const weakenAvailability = findMaxThreads(WEAKEN_COST, availableRam);
  const growAvailability = findMaxThreads(GROW_COST, availableRam);
  const hackAvailability = findMaxThreads(HACK_COST, availableRam);
  const serverAvailability = {
    ram,
    availableRam,
    tWeaken: weakenAvailability,
    tGrow: growAvailability,
    tHack: hackAvailability,
  };
  pServerAvailability.set(serverHost, serverAvailability);
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").Server} server
 */
function initHackTargetServers(ns, server) {
  const minSecurity = server.minDifficulty;
  const maxMoney = server.moneyMax;
  const currentMoney = server.moneyAvailable;
  const currentSecurity = server.hackDifficulty;
  const hostName = server.hostname;
  const reqSkill = server.requiredHackingSkill;
  calculateTarget(
    currentSecurity,
    minSecurity,
    hostName,
    currentMoney,
    maxMoney,
    ns,
    server,
    reqSkill
  );
}

/**
 * @param {number} currentSecurity
 * @param {number} minSecurity
 * @param {string} hostName
 * @param {number} currentMoney
 * @param {number} maxMoney
 * @param {import("NS").NS} ns
 * @param {import("NS").Server} server
 * */
function calculateTarget(
  currentSecurity,
  minSecurity,
  hostName,
  currentMoney,
  maxMoney,
  ns,
  server,
  reqSkill
) {
  let readyToHack = true;
  let weakenThreadsRequired = 0;
  let growThreadsRequired = 0;
  let hackThreadsRequired = 0;
  let targetObj = {
    weaken: {},
    grow: {},
    hack: {},
    reqSkill,
  };

  if (currentSecurity > minSecurity) {
    readyToHack = false;
    const difference = currentSecurity - minSecurity;
    weakenThreadsRequired = Math.ceil(difference / WEAK_PER_THREAD);
    targetObj = {
      ...targetObj,
      weaken: {
        hostName,
        targetThreads: weakenThreadsRequired,
        currentThreads: 0,
        reqSkill,
      },
    };
  }
  if (currentMoney < maxMoney) {
    growThreadsRequired = calculcateGrowThreads(ns, server, maxMoney);
    targetObj = {
      ...targetObj,
      grow: {
        hostName,
        targetThreads: growThreadsRequired,
        currentThreads: 0,
        reqSkill,
      },
    };
    readyToHack = false;
  }
  if (readyToHack) {
    hackThreadsRequired = calculateHackThreadsRequired(ns, server);
    targetObj = {
      ...targetObj,
      hack: {
        hostName,
        targetThreads: hackThreadsRequired,
        currentThreads: 0,
        reqSkill,
      },
    };
  }
  targets.set(hostName, targetObj);
}

function calculateHackThreadsRequired(ns, server) {
  if (ns.fileExists("Formulas.exe")) {
    const hackPercent = ns.formulas.hacking.hackPercent(server, ns.getPlayer());
    return Math.ceil(TARGET_HACK_MONEY_PERCENT / hackPercent);
  } else {
    return FALLBACK_HACK_THREADS;
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {import("NS").Server} server
 * @param {number} maxMoney
 * @returns {number}
 * */
function calculcateGrowThreads(ns, server, maxMoney) {
  if (ns.fileExists("Formulas.exe")) {
    Math.ceil(
      ns.formulas.hacking.growThreads(server, ns.getPlayer(), maxMoney)
    );
  } else {
    return FALLBACK_GROW_THREADS;
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {Object} runningObject
 */
function reCalculateForHackTarget(ns, runningObject) {
  const server = ns.getServer(runningObject.serverHost);
  const minSecurity = server.minDifficulty;
  const maxMoney = server.moneyMax;
  const currentMoney = server.moneyAvailable;
  const currentSecurity = server.hackDifficulty;
  const hostName = server.hostname;
  const completedThreads = runningObject.threads;
  const reqSkill = server.requiredHackingSkill;
  const recalc = () =>
    calculateTarget(
      currentSecurity,
      minSecurity,
      hostName,
      currentMoney,
      maxMoney,
      ns,
      server,
      reqSkill
    );

  if (runningObject.type === HACK) {
    const hackState = findHackEntry(hostName);
    if (hackState) {
      hackState.currentThreads -= completedThreads;
      hackState.targetThreads -= completedThreads;
      if (hackState.targetThreads <= 0) {
        hackState.targetThreads = 0;
        recalc();
      }
    } else {
      recalc();
    }
    return;
  }
  if (runningObject.type === WEAKEN) {
    const weakenState = findWeakenEntry(hostName);
    if (weakenState) {
      weakenState.currentThreads -= completedThreads;
      weakenState.targetThreads -= completedThreads;
      if (weakenState.targetThreads <= 0) {
        weakenState.targetThreads = 0;
        recalc();
      }
    } else {
      recalc();
    }
    return;
  }
  if (runningObject.type === GROW) {
    const growState = findGrowEntry(hostName);
    if (growState) {
      growState.currentThreads -= completedThreads;
      growState.targetThreads -= completedThreads;
      if (growState.targetThreads <= 0) {
        growState.targetThreads = 0;
        recalc();
      }
    } else {
      recalc();
    }
    return;
  }
  recalc();
}

function findHackEntry(hostName) {
  return targets.get(hostName).hack;
}

function findWeakenEntry(hostName) {
  return targets.get(hostName).weaken;
}

function findGrowEntry(hostName) {
  return targets.get(hostName).grow;
}

/**
 * @param {import("NS").NS} ns
 */
function printServerState(ns) {
  printStateTable(ns);
  //printRunning(ns);
}

/**
 * @param {import("NS").NS} ns
 */
function printStateTable(ns) {
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "%25s | %9s | %9s | %9s | %9s | %9s | %9s | %5s",
    "Host",
    "Hack T",
    "T-Hack T",
    "Grow T",
    "T-Grow T",
    "Weaken T",
    "T-Weaken",
    "Skill"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------"
  );
  // @ts-ignore
  for (const [key, value] of targets) {
    const hackCurrent = value.hack?.currentThreads || "-";
    const hackTarget = value.hack?.targetThreads || "-";
    const growCurrent = value.grow?.currentThreads || "-";
    const growTarget = value.grow?.targetThreads || "-";
    const weakenCurrent = value.weaken?.currentThreads || "-";
    const weakenTarget = value.weaken?.targetThreads || "-";
    const hackReq = value?.reqSkill || "-";

    ns.tprintf(
      "%25s | %9s | %9s | %9s | %9s | %9s | %9s | %5s",
      key,
      hackCurrent,
      hackTarget,
      growCurrent,
      growTarget,
      weakenCurrent,
      weakenTarget,
      hackReq
    );
  }
}

/**
 * @param {import("NS").NS} ns
 */
function printRunning(ns) {
  ns.tprintf("-------------------------------------------------");
  ns.tprintf("Running State");
  ns.tprintf("-------------------------------------------------");
  ns.tprintf("%25s | %25s | %8s | %8s", "Source", "Target", "Threads", "Type");
  ns.tprintf("-------------------------------------------------");
  running.forEach((r) => {
    ns.tprintf(
      "%25s | %25s | %8s | %8s",
      r.playerHost,
      r.serverHost,
      r.threads,
      r.hack ? "Hack" : r.weaken ? "Weaken" : "Grow"
    );
  });
}
