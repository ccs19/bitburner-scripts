import { readServers } from "/scripts/scheduler/scheduler-util";

const TASK_DAEMON = "/scripts/scheduler/task-daemon.js";

const SCHEDULE_FILE = "/scripts/scheduler/data/schedule.json";

const TASK_COMPLETE_PORT = 8;
const SCHEDULE_IN_PORT = 9;
const SCHEDULE_OUT_PORT = 10;

/**
 * Prune running jobs with no remaining tasks after this many seconds.
 * This value is also passed to the task daemon to prune tasks.
 */
const COMPLETED_TIMEOUT = 120;

const HOME_RESERVED_PERCENT = 0.1;

/**
 * How often to fetch bot net servers in milliseconds.
 */

/**
 * @type {import("BB").RunningJobs}
 */
let RUNNING_JOBS = {};

/**
 * @type {import("NS").NetscriptPort}
 */
let scheduleQueue;

/**
 * @type {import("NS").NetscriptPort}
 */
let runningJobOutput;

/**
 * @type {import("NS").NetscriptPort}
 */
let completionOutput;

/**
 * Start the scheduler service. If the service was restarted, all 
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  scheduleQueue = ns.getPortHandle(SCHEDULE_IN_PORT);
  runningJobOutput = ns.getPortHandle(SCHEDULE_OUT_PORT);
  completionOutput = ns.getPortHandle(TASK_COMPLETE_PORT);
  scheduleQueue.clear();
  runningJobOutput.clear();
  completionOutput.clear();
  //checkDebug(ns);

  initializeTaskDaemon(ns);
  // Ah... the intention of this was that if the scheduler is restarted,
  // it could pick up where it left off.
  // Currently, it looks like it just clears everything out, which should be fine.
  // The scheduler takes into account available memory for each server, so 
  // any tasks currently running would just continue to run until they complete.
  //   
  //
  // Unclear if this works or not.
  // Should in theory be pretty easy to support, but would need a mechanism to 
  // lock the file on writes. Also
  // Also, need to ensure that only one instance of the scheduler is allowed.
  // I think there's already something in place for that, though.
  //readPersistedTasks(ns);
  ns.disableLog("scan");
  ns.disableLog("sleep");
  await ns.sleep(5000);
  while (true) {
    markCompletions(ns);
    pruneFinishedJobs(ns);
    let data = scheduleQueue.read();
    data = data === "NULL PORT DATA" ? [] : data;
    for (const task of data) {
      doSchedule(ns, task);
    }
    executeTasks(ns);
    runningJobOutput.clear();
    runningJobOutput.write(RUNNING_JOBS || {});
    await ns.sleep(1000);
  }
}

/** 
 * Initialize the task daemon if it is not already running.
 * The task daemon is responsible for monitoring running tasks and reporting
 * their completion status back to the scheduler.
 * See: task-daemon.js
 * @param {import("NS").NS} ns
 */
function initializeTaskDaemon(ns) {
  ns.exec(
    TASK_DAEMON,
    ns.getHostname(),
    {
      threads: 1,
      preventDuplicates: true,
    },
    SCHEDULE_OUT_PORT,
    TASK_COMPLETE_PORT,
    true
  );
}

/**
 * Read the completion output port and mark tasks as completed or orphaned. Prunes
 * tasks that are no longer running.
 * @param {import("NS").NS} ns
 */
function markCompletions(ns) {
  do {
    const data = completionOutput.read();
    if (data === "NULL PORT DATA") {
      break;
    }
    for (const completion of data) {
      const { pid, endTime, jobId, completionType, prune } = completion;
      const job = RUNNING_JOBS[jobId];
      if (!job) {
        continue;
      }
      let jobTasks = job.tasks;
      const task = jobTasks.find((t) => t.pid === pid);
      if (!task || task.status === "COMPLETED") {
        continue;
      } else if (prune) {
        job.tasks = handlePruneTask(jobTasks, pid, jobId);
      } else if (completionType === "COMPLETED") {
        task.endTime = endTime;
        task.status = "COMPLETED";
        handleCompletedTask(task, job, endTime);
      } else if (completionType === "ORPHANED") {
        task.endTime = endTime;
        task.status = "COMPLETED";
        handleOrphanedTask(task, job, endTime);
      }
    }
  } while (true);
}

/**
 * Remove a task from a job's task list. If no tasks remain in the parent job,
 * the job is removed from RUNNING_JOBS.
 * @param {import("BB").ScheduledTask[]} jobTasks The list of tasks in the job
 * @param {number} pid The pid of the task to remove
 * @param {string} jobId The id of the parent job
 * @returns {import("BB").ScheduledTask[]} The remaining tasks in the job
 */
function handlePruneTask(jobTasks, pid, jobId) {
  jobTasks = jobTasks.filter((t) => t.pid !== pid);
  if (jobTasks.length === 0) {
    delete RUNNING_JOBS[jobId];
  } else {
    RUNNING_JOBS[jobId].tasks = jobTasks;
  }
  return jobTasks;
}

/**
 * Mark a job as completed if all child tasks are completed. 
 */
function handleCompletedTask(task, job, endTime) {
  if (allTasksCompleted(job)) {
    job.endTime = endTime;
    job.status = "COMPLETED";
  }
}

/**
 * Handle an orphaned task. If all tasks in the parent job are orphaned, mark the job as failed.
 * If all tasks are completed or orphaned, mark the job as completed.
 *
 * @param {import("BB").ScheduledTask} task
 * @param {import("BB").RunningJob} job
 * @param {Date} endTime
 */
function handleOrphanedTask(task, job, endTime) {
  if (job.tasks.every((t) => t.status === "ORPHANED")) {
    job.endTime = endTime;
    job.status = "FAILED";
  } else if (allTasksCompleted(job)) {
    job.endTime = endTime;
    job.status = "COMPLETED";
  }
}

/**
 * Return true if all tasks in the job are completed or orphaned.
 *
 * @param {import("BB").RunningJob} job
 * @returns
 */
function allTasksCompleted(job) {
  if (job.remainingThreads > 0) {
    return false;
  }
  return job.tasks.every(
    (t) => t.status === "COMPLETED" || t.status === "ORPHANED"
  );
}

/**
 * Prune any jobs that have been completed for longer than COMPLETED_TIMEOUT.
 * "Completed" is any job with status COMPLETED or FAILED.
 * @param {import("NS").NS} ns
 */
function pruneFinishedJobs(ns) {
  const keys = Object.keys(RUNNING_JOBS);
  const now = getSecSinceEpoch(new Date());
  for (const key of keys) {
    const job = RUNNING_JOBS[key];
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      if (!job.endTime) {
        job.endTime = new Date();
        continue;
      }
      const endTimeSeconds = getSecSinceEpoch(getDate(job.endTime));
      if (now - endTimeSeconds > COMPLETED_TIMEOUT) {
        delete RUNNING_JOBS[key];
      }
    }
  }
}

/**
 *
 * @param {import ("NS").NS} ns
 * @param {import ("BB").ScheduleRequest} request
 * @returns
 */
function doSchedule(ns, request) {
  if (!request) {
    return;
  }

  if (RUNNING_JOBS[request.id]) {
    return;
  }
  const requestTime = request.requestTime || new Date();
  const runningJob = {
    script: request.script,
    type: request.type,
    requestedThreads: request.threads,
    remainingThreads: request.threads,
    sourceHost: request.sourceHost,
    estimatedRunTime: request.estimatedRunTime,
    args: request.args,
    tasks: [],
    status: "PENDING",
    requestTime,
    attributes: request.attributes,
    owner: request.owner,
    lastUpdated: new Date(),
  };
  RUNNING_JOBS[request.id] = runningJob;
}
/**
 * TODO Refactor. Lot of complexity here.
 * @param {import("NS").NS} ns
 */
function executeTasks(ns) {
  const keys = Object.keys(RUNNING_JOBS);
  for (const key of keys) {
    const servers = readServers(ns);
    const job = RUNNING_JOBS[key];
    if (isJobCompletelyHandled(job)) {
      continue;
    }
    const { startTime, type, script, args, estimatedRunTime, sourceHost } = job;
    const taskStartTime = new Date().getMilliseconds();
    if (!script) {
      ns.tprintf("Job %s is missing script", key);
      continue;
    }
    if (!sourceHost) {
      ns.tprintf("Job %s is missing source host", key);
      continue;
    }
    const scriptCost = ns.getScriptRam(script, sourceHost);
    const estimatedEndTimeMs = estimatedRunTime
      ? taskStartTime + estimatedRunTime
      : null;

    for (const s of servers) {
      if (job.remainingThreads <= 0) {
        break;
      }
      let maxRam = ns.getServer(s.hostname).maxRam;
      if (s.hostname === "home") {
        maxRam = maxRam * (1 - HOME_RESERVED_PERCENT);
      }
      const availableRam = maxRam - ns.getServer(s.hostname).ramUsed;
      const totalScriptCost = job.remainingThreads * scriptCost;
      let task;
      let threadsForThisServer = 0;
      if (availableRam < scriptCost) {
        continue;
      } else if (availableRam >= totalScriptCost) {
        // Machine can handle all threads
        threadsForThisServer = job.remainingThreads;
      } else if (availableRam > scriptCost) {
        // Machine may be able to handle at least some threads
        const threads = Math.floor(availableRam / scriptCost);
        if (threads < 1) {
          // Cannot run one thread, check next server
          continue;
        }
        threadsForThisServer = threads;
      }
      if (threadsForThisServer > 0) {
        task = buildTask({
          ...taskTemplate(job, estimatedEndTimeMs),
          threads: threadsForThisServer,
          runningHost: s.hostname,
          ramUsage: scriptCost * threadsForThisServer,
        });
        startTask(ns, task, key, job);
      }
    }
  }
}

/** 
 * Return a task template with default values.
 * @param {import("BB").RunningJob} job The parent job
 * @returns {import("BB").ScheduledTask} A task
 */
function taskTemplate(job, estimatedEndTimeMs) {
  return {
    sourceHost: job.sourceHost,
    script: job.script,
    type: job.type,
    args: job.args,
    startTime: job.startTime,
    status: "RUNNING",
    estimatedEndTime: new Date(estimatedEndTimeMs),
  }
}

/**
 * Start a task on the specified host.
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduledTask} task
 * @param {string} id
 * @param {import("BB").RunningJob} job
 */
function startTask(ns, task, id, job) {
  const successfulTasks = [];
  const { runningHost, script, threads, args } = task;
  if (!runningHost) {
    ns.tprintf("Task %s has no defined host", id);
  }
  if (!script) {
    ns.tprintf("Task %s has no defined script", id);
  }
  const pid = ns.exec(script, runningHost, threads, ...args);
  if (pid === 0) {
    ns.tprintf(
      "Failed to start task %s. Server %s, Threads %s, Memory %s, Memory Available %s",
      id,
      runningHost,
      threads,
      ns.getScriptRam(script, runningHost) * threads,
      ns.getServer(runningHost).maxRam - ns.getServer(runningHost).ramUsed
    );
  } else {
    task.pid = pid;
    successfulTasks.push(task);
  }
  if (job.tasks === undefined) {
    job.tasks = [];
  }
  job.tasks = job.tasks.concat(successfulTasks);
  job.status = "RUNNING";
  job.startTime = job.startTime ? job.startTime : new Date();
  job.lastUpdated = new Date();
  job.remainingThreads -= threads;
}

/**
 * Read persisted tasks from file.
 * Is this needed? Commented out reference to it exists in main(). What would be the use case?
 * @param {import("NS").NS} ns
 */
function readPersistedTasks(ns) {
  if (!ns.fileExists(SCHEDULE_FILE)) {
    RUNNING_JOBS = {};
    return;
  }
  const json = ns.read(SCHEDULE_FILE);
  RUNNING_JOBS = JSON.parse(json);
}

/**
 * Build a scheduled task.
 * @returns {import("BB").ScheduledTask}
 */
function buildTask({
  runningHost = undefined,
  pid = -1,
  script,
  threads,
  status = "PENDING",
  ramUsage,
  type,
  startTime,
  args = undefined,
}) {
  return {
    pid,
    runningHost,
    script,
    threads,
    // @ts-ignore
    status,
    ramUsage,
    startTime,
    args,
  };
}

/**
 * Clear all data.
 * @param {import("NS").NS} ns
 */
function checkDebug(ns, handles) {
  if (!ns.args.includes("debug")) {
    return;
  }
  ns.tprint("Clearing data");
  ns.rm(SCHEDULE_FILE);
  handles = [scheduleQueue, runningJobOutput, completionOutput];
  for (const handle of handles) {
    handle.clear();
  }
  //throw new Error("Debugging");
}

/**
 * If processes were loaded from file, date may be a string.
 * This function ensures that the date is returned as a Date object.
 * @param {any} date
 * @returns {Date}
 */
function getDate(date) {
  if (!date) {
    return null;
  }
  if (date instanceof Date) {
    return date;
  } else if (typeof date === "string" || typeof date === "number") {
    try {
      return new Date(date);
    } catch (e) {
      return new Date();
    }
  } else {
    return null;
  }
}

/**
 *
 * @param {Date} date
 * @returns {number}
 */
function getSecSinceEpoch(date) {
  return Math.round(date.getTime() / 1000);
}

function isJobCompletelyHandled(job) {
  return job.endTime ||
    job.remainingThreads <= 0 ||
    job.status === "COMPLETED" ||
    job.status === "FAILED";
}



