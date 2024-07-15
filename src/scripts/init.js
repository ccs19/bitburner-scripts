const SCHEDULER = "/scripts/scheduler/scheduler.js";
const AUTO_ROOT = "/scripts/util/auto-root.js";
const SYNC_ALL = "/scripts/test/sync-all.js";
const HACK = "/scripts/hack/deploy-hack-v2.js";
const IPV_RANDOM = "/scripts/ipvgo/random.js";
const BUY_SERVERS = "/scripts/servers/buy-servers.js";

const SCHEDULER_DEBUG = "/scripts/test/scheduler-debug.js";

const DATA_FILES = [
  "/data/server-list/player-servers.json",
  "/data/server-list/server-hostnames.json",
  "/data/server-list/server-list.json",
  "/data/stocks/stocks.json",
  "/scripts/scheduler/data/peek-jobs.json",
];

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  for (const file of DATA_FILES) {
    ns.rm(file, "home");
  }
  for (var i = 1; i <= 20; i++) {
    while (ns.readPort(i) !== "NULL PORT DATA") {}
  }

  await ns.sleep(1000);
  start(ns, IPV_RANDOM);
  start(ns, BUY_SERVERS);
  start(ns, SCHEDULER);
  start(ns, AUTO_ROOT);
  start(ns, SYNC_ALL);

  await ns.sleep(5000);
  //ns.exec(SCHEDULER_DEBUG, "home", 1);
  // Always last. May use all memory.
  start(ns, HACK);
}

/**
 * @param {import("NS").NS} ns
 * @param {string} script
 */
function start(ns, script) {
  const options = {
    threads: 1,
    preventDuplicates: true,
  };
  ns.exec(script, "home", options);
}
