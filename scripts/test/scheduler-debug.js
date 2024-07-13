import {
  scheduleTask,
  readScheduleTask,
  readScheduleTaskByOwner,
} from "scripts/scheduler/schedule-service";

const target = "foodnstuff";
const owner = "scheduler-debug";
const threads = 1000000;

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  /*const request = {
    script: "/scripts/hack/do-grow.js",
  };
  const id = scheduleTask(
    ns,
    "/scripts/hack/do-grow.js",
    threads,
    "GROW",
    [target],
    undefined,
    owner
  );
  let run = true;
  while (run) {
    await ns.sleep(1000);
    let job = null;
    while (job === null) {
      job = readScheduleTask(ns, id);
      await ns.sleep(1000);
    }
    const owned = readScheduleTaskByOwner(ns, owner);
    if (job) {
      ns.tprint(`job ${job.id} has staus ${job.status}`);
    }
    if (owned) {
      const keys = Object.keys(owned);
      run = false;
      for (const key of keys) {
        // until all jobs have status of completed
        if (owned[key].status !== "COMPLETED") {
          run = true;
          break;
        }
      }
    }
  }
  ns.tprint("done");*/
}
