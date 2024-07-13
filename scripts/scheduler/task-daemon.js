let outPort = 0;
let completePort = 0;
/**
 * @type {import("NS").NetscriptPort}
 * */
let runningJobsHandle;
/**
 * @type {import("NS").NetscriptPort}
 */
let completionHandle;

/**
 * If a task has not been updated in this amount of time, it is checked for orphaned status.
 * If it is not currently running, it is marked as failed.
 * @type {number}
 */
const ORPHANED_TIMEOUT = 60 * 90; // 90 minutes

const SLEEP = 1000 * 5; // 5 seconds

/**
 * Notifies the scheduler of task completion.
 * args[0] - Running job port
 * args[1] - Notify completion port
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  initHandle(ns);
  clearQueues(ns);
  /**
   * @type {import("BB").RunningJobs}
   */

  while (true) {
    let runningJobs = runningJobsHandle.peek() || {};
    const keys = Object.keys(runningJobs);
    for (const key of keys) {
      const job = runningJobs[key];
      /**
       * @type {import("BB").ScheduledTask[]}
       */
      let tasks = job.tasks || [];
      let completions = [];
      for (const task of tasks) {
        checkTask(ns, task, key, completions);
      }
      if (completions.length > 0) {
        notifyCompletions(ns, completions);
      }
    }
    await ns.sleep(SLEEP);
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduledTask} task
 * @param {string} jobId
 * @param {import("BB").TaskCompletion[]} completions
 */
function checkTask(ns, task, jobId, completions) {
  if (checkCompleted(ns, task, jobId, completions)) {
    return;
  }
  if (checkOrphaned(ns, task, jobId, completions)) {
    return;
  }
}

/**
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduledTask} task
 * @param {string} jobId
 * @param {import("BB").TaskCompletion[]} completions
 * @returns boolean true if handled
 */
function checkCompleted(ns, task, jobId, completions) {
  if (task.status !== "RUNNING") {
    return false;
  }
  let processes = [];
  try {
    processes = ns.ps(task.runningHost);
  } catch (e) {
    ns.tprintf(`Error getting processes on ${task.runningHost}: ${e}`);
  }
  if (
    processes.length === 0 ||
    !processes.filter((p) => p.pid === task.pid).length
  ) {
    completions.push(markCompleted(task, jobId));
    return true;
  }
  return false;
}

/**
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduledTask} task
 * @param {string} jobId
   * @param {import("BB").TaskCompletion[]} completions

 * @returns boolean true if handled
 */
function checkOrphaned(ns, task, jobId, completions) {
  if (task.status === "PENDING") {
    return false;
  }
  const now = getSecSinceEpoch(new Date());
  if (now - getSecSinceEpoch(task.startTime) > ORPHANED_TIMEOUT) {
    ns.tprintf(`Task ${task.pid} on ${task.runningHost} has timed out.`);
    completions.push(markCompleted(task, jobId, "FAILED"));
    return true;
  }
  return false;
}

/**
 *
 * @param {import("BB").ScheduledTask} task
 * @param {string} jobId
 * @param {string} completionType
 * @param {boolean} prune
 * @returns {import("BB").TaskCompletion}
 */
function markCompleted(
  task,
  jobId,
  completionType = "COMPLETED",
  prune = false
) {
  return {
    pid: task.pid,
    endTime: new Date(),
    hostName: task.runningHost,
    jobId,
    completionType,
    prune,
  };
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("BB").TaskCompletion[]} completions
 */
function notifyCompletions(ns, completions) {
  completionHandle.write(completions);
}

/**
 *
 * @param {import("NS").NS} ns
 */
function initHandle(ns) {
  const portArg = ns.args[0];
  const completionPortArg = ns.args[1];
  if (portArg === undefined || completionPortArg === undefined) {
    throw new Error("Port not provided for task-daemon.js");
  }
  const port = Number(portArg.valueOf());
  const completionPort = Number(completionPortArg.valueOf());
  if (isNaN(port) || isNaN(completionPort)) {
    throw new Error(
      "Port must be an integer. Got " +
        portArg +
        " and " +
        completionPort +
        " instead."
    );
  }

  outPort = Number(port);
  runningJobsHandle = ns.getPortHandle(outPort);
  completionHandle = ns.getPortHandle(completionPort);
}

/**
 *
 * @param {Date} date
 * @returns {number}
 */
function getSecSinceEpoch(date) {
  if (!date) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.round(date.getTime() / 1000);
}

/**
 *
 * @param {import("NS").NS} ns
 */
function clearQueues(ns) {}
