import {
  scheduleTask,
  readScheduleTask,
  readScheduleTaskByOwner,
} from "scripts/scheduler/schedule-service";

const OWNER = "grind-levels";
const THREADS = 10000000;

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  let req = undefined;
  const target = ns.args[0];
  if (target === undefined) {
    ns.tprint("Usage: run grind-levels.js <target-hostname>");
    return;
  }
  let currentLevel = ns.getHackingLevel();
  while (true) {
    if (req === undefined) {
      req = getRequest(target);
      req = await scheduleTask(ns, req);
    } else {
      let res = readScheduleTask(ns, req.id);
      if (res === null) {
        // do nothing
      } else if (res.status === "COMPLETED") {
        let previousLevel = currentLevel;
        currentLevel = ns.getHackingLevel();
        //ns.tprintf("Gained %d hacking levels", currentLevel - previousLevel);
        req = undefined;
      }
    }
    await ns.sleep(1000);
  }
}

/**
 *
 * @returns {import ("BB").ScheduleTaskRequest}
 */
function getRequest(target) {
  return {
    script: "/scripts/hack/do-weaken.js",
    threads: THREADS,
    args: [target],
    owner: OWNER,
    daemon: false,
  };
}
