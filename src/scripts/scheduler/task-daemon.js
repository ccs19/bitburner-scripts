import { isBlank } from "../util/string-util.js";

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
 * Tasks are never marked as orphaned if they are in PENDING status.
 * @type {number}
 */
const ORPHANED_TIMEOUT_SECS = 60 * 90; // 90 minutes

/** 
 * Time to sleep between checks of running jobs.
 * @type {number}
 */
const SLEEP = 1000 * 5; // 5 seconds

/**
 * Notifies the scheduler of task completion.
 * args[0] - Running job port
 * args[1] - Notify completion port
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  initHandle(ns);
  /**
   * @type {import("BB").RunningJobs}
   */
  // TODO what does this do?
  // Should be a function so it's clear.
  await monitorRunningJobs(ns);
}

/**
 * Start the monitoring loop. This checks running jobs for completion.
 *  
 * @param {import("NS").NS} ns
 */
async function monitorRunningJobs(ns) {
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
 * Checks a task for completion or orphaned status.
 * If 
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
 * Checks a task for completion. This is done by fetching all processes
 * on the host and checking if the task's PID exists. If it doesn't, we assume the task completed successfully.
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduledTask} task Task to check
 * @param {string} jobId The parent job ID
 * @param {import("BB").TaskCompletion[]} completions If task is completed, it is added to this array
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
    // If the task's process is not found on the host, it has completed
    !processes.filter((p) => p.pid === task.pid).length
  ) {
    completions.push(markCompleted(task, jobId));
    return true;
  }
  return false;
}

/**
 * Return true if a task is orphaned. An orphaned task is one that has not been
 * updated in ORPHANED_TIMEOUT_SECS and is not in a PENDING state.
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
  if (now - getSecSinceEpoch(task.startTime) > ORPHANED_TIMEOUT_SECS) {
    ns.tprintf(`Task ${task.pid} on ${task.runningHost} has timed out.`);
    completions.push(markCompleted(task, jobId, "FAILED"));
    return true;
  }
  return false;
}

/**
 * Updates a task to completed status.
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
 * Notifies the system of completed tasks. These are written to the completion port.
 * @param {import("NS").NS} ns
 * @param {import("BB").TaskCompletion[]} completions
 */
function notifyCompletions(ns, completions) {
  completionHandle.write(completions);
}

/**
 * Initiatlizes the running job and completion port handles.
 * @param {import("NS").NS} ns
 */
function initHandle(ns) {
  const portArg = ns.args[0];
  const completionPortArg = ns.args[1];
  if (isBlank(portArg) || isBlank(completionPortArg)) {
    ns.tprintf("Port not provided for task-daemon.js" + portArg + " "  +completionPortArg);
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
 * Returns the number of seconds since epoch for the given date.
 * @param {Date} date
 * @returns {number}
 */
function getSecSinceEpoch(date) {
  if (!date) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.round(date.getTime() / 1000);
}

