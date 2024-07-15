import { readServers } from "scripts/util/common";

import {
  readScheduleTaskByOwner,
  getId,
  scheduleTaskBatch,
} from "scripts/scheduler/schedule-service";

const GROW_SCRIPT = "/scripts/hack/do-grow.js";
const WEAKEN_SCRIPT = "/scripts/hack/do-weaken.js";
const HACK_SCRIPT = "/scripts/hack/do-hack.js";
const LOG_FILE = "/scripts/hack/data/hack-log.txt";

const OWNER = "deployhackv2";

// Action types
const HACK = "HACK";
const WEAKEN = "WEAKEN";
const GROW = "GROW";

const TARGET_HACK_MONEY_PERCENT = 0.9;
const WEAK_PER_THREAD = 0.05;

let FALLBACK_GROW_THREADS = 100;
const FALLBACK_HACK_THREADS = 50;

const sleepTimeSeconds = 5;
const sleepTimeMs = sleepTimeSeconds * 1000;
const checkNewHackableServersSeconds = 60;

let HACK_THRESHOLD = 1;

/**
 * @type {import("BB").HackJobMap}
 * */
let running = {};
let targets = new Map();

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  if (ns.args.length > 0) {
    HACK_THRESHOLD = Number(ns.args[0]);
  }
  FALLBACK_GROW_THREADS = ns.getHackingLevel();
  FALLBACK_GROW_THREADS =
    FALLBACK_GROW_THREADS < 10 ? 10 : FALLBACK_GROW_THREADS;
  const hackableServers = readServers(ns, true, HACK_THRESHOLD);
  ns.tprint(`Found ${hackableServers.length} servers to hack`);
  initHackWeakenGrow(ns, hackableServers);
  await startHackingAway(ns, hackableServers);
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} servers
 */
async function startHackingAway(ns, servers) {
  var i = 0;
  while (true) {
    const tasks = [];
    assignHack(ns, tasks);
    assignWeaken(ns, tasks);
    assignGrow(ns, tasks);
    if (tasks.length > 0) {
      scheduleTaskBatch(ns, tasks);
    }
    await ns.sleep(sleepTimeMs);
    printServerState(ns);
    checkCompletions(ns);
    // print report every printReportTime seconds
    i += sleepTimeSeconds;
    if (i % checkNewHackableServersSeconds === 0) {
      await checkForNewHackableServers(ns, servers);
      i = 0;
    }
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} servers
 * */
async function checkForNewHackableServers(ns, servers) {
  const allServers = readServers(ns, true, HACK_THRESHOLD);
  const existingServers = new Set(servers.map((s) => s.hostname));
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
    servers.push(...Array.from(newServers));
  }
}

/**
 * @param {import("NS").NS} ns
 */
function assignHack(ns, tasks) {
  const hostNames = Object.keys(running);
  for (const key of hostNames) {
    const hack = running[key].hack;
    if (hack.pendingThreads > 0) {
      const task = executeType(ns, HACK, hack, key);
      if (task) {
        tasks.push(task);
      }
    }
  }
}

/**
 * @param {import("NS").NS} ns
 */
function assignWeaken(ns, tasks) {
  const hostNames = Object.keys(running);
  for (const key of hostNames) {
    const weaken = running[key].weaken;
    if (weaken.pendingThreads > 0) {
      const task = executeType(ns, WEAKEN, weaken, key);
      if (task) {
        tasks.push(task);
      }
    }
  }
}

/**
 * @param {import("NS").NS} ns
 */
function assignGrow(ns, tasks) {
  const hostNames = Object.keys(running);
  for (const key of hostNames) {
    const grow = running[key].grow;
    if (grow.pendingThreads > 0) {
      const task = executeType(ns, GROW, grow, key);
      if (task) {
        tasks.push(task);
      }
    }
  }
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {string} actionType
 * @param {import("BB").HackJob} hackJob
 * @param {string} hostName
 * @returns {import("BB").ScheduleTaskRequest | undefined}
 */
function executeType(ns, actionType, hackJob, hostName) {
  let targetScript;
  const threads = hackJob.pendingThreads;
  const targetHost = hostName;
  const args = [hostName];
  switch (actionType) {
    case HACK:
      targetScript = HACK_SCRIPT;
      break;
    case WEAKEN:
      targetScript = WEAKEN_SCRIPT;
      break;
    case GROW:
      targetScript = GROW_SCRIPT;
      break;
    default:
      return;
  }
  const task = {
    id: getId(),
    script: targetScript,
    threads,
    type: actionType,
    args,
    attributes: {
      targetHostName: targetHost,
    },
    owner: OWNER,
  };
  hackJob.pendingThreads = 0;
  hackJob.jobs[task.id] = threads;
  hackJob.runningThreads += threads;
  // @ts-ignore
  return task;
}

/**
 * @param {import("NS").NS} ns
 */
function checkCompletions(ns) {
  const jobs = readScheduleTaskByOwner(ns, OWNER);
  const recalcHosts = new Set();
  for (const key in jobs) {
    const job = jobs[key];
    if (!isTaskCompletedOrFailed(job)) {
      continue;
    }

    const hostName = job.attributes.targetHostName;
    const type = job.type;
    const jobId = job.id;
    const threads = job.requestedThreads || 0;
    const hackJob = getJobByType(hostName, type);
    if (hackJob.jobs[jobId] === undefined) {
      continue;
    }
    if (hackJob.jobs[jobId] !== undefined) {
      delete hackJob.jobs[jobId];
      const keys = Object.keys(hackJob.jobs);
      hackJob.runningThreads = keys.reduce(
        (acc, key) => acc + hackJob.jobs[key],
        0
      );
      recalcHosts.add(hostName);
    }
  }
  if (recalcHosts.size !== 0) {
    recalcHosts.forEach((hostName) =>
      calculateTarget(ns, ns.getServer(hostName))
    );
  }
}

function getJobByType(hostName, type) {
  const job = running[hostName];
  switch (type) {
    case HACK:
      return job.hack;
    case WEAKEN:
      return job.weaken;
    case GROW:
      return job.grow;
    default:
      return null;
  }
}

function isTaskCompletedOrFailed(latestTask) {
  return latestTask.status === "COMPLETED" || latestTask.status === "FAILED";
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("NS").Server[]} servers
 */
function initHackWeakenGrow(ns, servers) {
  for (const server of servers) {
    calculateTarget(ns, server);
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {import("NS").Server} server
 * */
function calculateTarget(ns, server) {
  const minSecurity = server.minDifficulty;
  const maxMoney = server.moneyMax;
  const currentMoney = server.moneyAvailable;
  const currentSecurity = server.hackDifficulty;
  const reqSkill = server.requiredHackingSkill;
  const hostName = server.hostname;
  let readyToHack = true;
  let weakenRequired = false;
  let weakenThreadsRequired = 0;
  let growThreadsRequired = 0;
  let hackThreadsRequired = 0;

  const hackJobMap = running[hostName] || newEntry(reqSkill);
  if (currentSecurity > minSecurity) {
    readyToHack = false;
    weakenRequired = true;
    const difference = currentSecurity - minSecurity;
    const { runningThreads, pendingThreads } = hackJobMap.weaken;
    const currentThreads = (runningThreads || 0) + (pendingThreads || 0);
    weakenThreadsRequired =
      Math.ceil(difference / WEAK_PER_THREAD) - currentThreads;
    if (weakenThreadsRequired > 0) {
      hackJobMap.weaken.pendingThreads += weakenThreadsRequired;
    }
  }
  if (!weakenRequired && currentMoney < maxMoney) {
    readyToHack = false;
    const { runningThreads, pendingThreads } = hackJobMap.grow;
    const currentThreads = (runningThreads || 0) + (pendingThreads || 0);
    growThreadsRequired =
      calculcateGrowThreads(ns, server, maxMoney) - currentThreads;
    if (growThreadsRequired > 0) {
      hackJobMap.grow.pendingThreads += growThreadsRequired;
    }
  }
  if (readyToHack) {
    const { runningThreads, pendingThreads } = hackJobMap.hack;
    const currentThreads = (runningThreads || 0) + (pendingThreads || 0);
    hackThreadsRequired =
      calculateHackThreadsRequired(ns, server) - currentThreads;
    if (hackThreadsRequired > 0) {
      hackJobMap.hack.pendingThreads += hackThreadsRequired;
    }
  }
  running[hostName] = hackJobMap;
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
    return Math.ceil(
      ns.formulas.hacking.growThreads(server, ns.getPlayer(), maxMoney)
    );
  } else {
    return ns.getHackingLevel();
  }
}

/**
 * @param {import("NS").NS} ns
 */
function printServerState(ns) {
  //printStateTable(ns);
}

/**
 * @param {import("NS").NS} ns
 */
function printStateTable(ns) {
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "%25s | %9s | %9s | %9s | %5s",
    "Host",
    "Hack T",
    "Grow T",
    "Weaken T",
    "Skill"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------------"
  );
  ns.tprintf(
    "--------------------------------------------------------------------------------------------------------"
  );
  const hostNames = Object.keys(running);
  for (const key of hostNames) {
    const value = running[key];
    const hackCurrent = value.hack?.runningThreads || "-";
    const growCurrent = value.grow?.runningThreads || "-";
    const weakenCurrent = value.weaken?.runningThreads || "-";
    const hackReq = value?.hackSkill || "-";

    ns.tprintf(
      "%25s | %9s | %9s | %9s | %5s",
      key,
      hackCurrent,
      growCurrent,
      weakenCurrent,
      hackReq
    );
  }
}

function newEntry(hackSkill) {
  return {
    hackSkill,
    hack: {
      pendingThreads: 0,
      runningThreads: 0,
      jobs: {},
    },
    weaken: {
      pendingThreads: 0,
      runningThreads: 0,
      jobs: {},
    },
    grow: {
      pendingThreads: 0,
      runningThreads: 0,
      jobs: {},
    },
  };
}
