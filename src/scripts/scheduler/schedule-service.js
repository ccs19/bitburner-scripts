const ID_RANGE = [0, 10000000];

const SCHEDULE_IN_PORT = 9;
const SCHEDULE_OUT_PORT = 10;

const JOB_CACHE_TIME = 1000 * 30; // 30 seconds
let CACHED_JOBS = undefined;
let LAST_JOB_FETCH_TIME;

/**
 *
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduleTaskRequest} request
 * @returns {Promise<import("BB").ScheduleTaskRequest>} The tasks that were scheduled with an ID assigned.
 */
export async function scheduleTask(ns, request) {
  const scheduled = await scheduleTaskBatch(ns, [request]);
  if (scheduled.length === 0) {
    return null;
  }
  return scheduled[0];
}

/**
 * Schedule multiple tasks at once. See scheduleTask.
 * @param {import("NS").NS} ns
 * @param {import("BB").ScheduleTaskRequest[]} tasks
 * @returns {Promise<import("BB").ScheduleTaskRequest[]>} The tasks that were scheduled with an ID assigned.
 */
export async function scheduleTaskBatch(ns, tasks) {
  // Get a handle to the input port
  const portHandle = ns.getPortHandle(SCHEDULE_IN_PORT);
  const toSchedule = [];
  for (const task of tasks) {
    validateTask(ns, task);
    task.id = task.id || getId();
    task.sourceHost = ns.getHostname();
    toSchedule.push(task);
  }
  if (toSchedule.length === 0) {
    return [];
  }

  if (portHandle.full()) {
    ns.printf("Scheduler port is full. Waiting 5 seconds to try again.");
    await ns.sleep(5000);
  }
  ns.writePort(SCHEDULE_IN_PORT, toSchedule);
  return toSchedule;
}

function validateTask(ns, task) {
  if (task.script === undefined || task.script === null || task.script === "") {
    throw new Error("script is required for scheduler");
  }
  if (!ns) {
    throw new Error("ns is required for scheduler");
  }
}

/**
 * Return a scheduled task by id. If the task is not found, return null.
 * If the task was recently scheduled or the scheduler isn't running, it may not be available.
 * @param {import("NS").NS} ns
 * @param {string} id
 * @returns {import("BB").ScheduleResponse | null}
 */
export function readScheduleTask(ns, id) {
  const jobs = readRunningJobs(ns);
  if (jobs === null || jobs[id] === undefined) {
    return null;
  }
  const job = jobs[id];
  return buildScheduleResponse(job, id);
}

/**
 * Convert a RunningJob to a ScheduleResponse
 * @param {import("BB").RunningJob} job
 * @param {string} id
 * @returns
 */
function buildScheduleResponse(job, id) {
  return {
    id: String(id),
    tasks: job.tasks,
    status: job.status,
    attributes: job.attributes,
    lastUpdated: job.lastUpdated,
    requestedThreads: job.requestedThreads,
    runningThreads: job.remainingThreads,
    completedThreads: job.requestedThreads - job.remainingThreads,
    type: job.type,
  };
}

/**
 * Read scheduled tasks by owner. An owner is the entity that requested the task.
 * @param {import("NS").NS} ns
 * @param {string} owner
 */
export function readScheduleTaskByOwner(ns, owner) {
  const jobs = readRunningJobs(ns);
  if (jobs === null) {
    return {};
  }
  const result = {};
  Object.keys(jobs).forEach((key) => {
    const job = jobs[key];
    if (job.owner === owner) {
      result[key] = buildScheduleResponse(job, String(key));
    }
  });
  return result;
}

/**
 * Read the current running jobs from the scheduler.
 * @param {import("NS").NS} ns
 * @param {boolean} invalidate Invalidate cached data
 * @returns {import("BB").RunningJobs | null}
 */
function readRunningJobs(ns, invalidate = false) {
  if (invalidate || isExpired() || CACHED_JOBS === undefined) {
    const data = ns.peek(SCHEDULE_OUT_PORT);
    if (data === "NULL PORT DATA") {
      CACHED_JOBS = undefined;
      return null;
    }
    CACHED_JOBS = data;
    LAST_JOB_FETCH_TIME = new Date().getTime();
  }
  return CACHED_JOBS;
}

/**
 * Return a random ID for a task.
 * May be used to generate unique ids for tasks if needed (e.g. when queuing batches of tasks). If not,
 * the scheduler will generate an id for you.
 * @returns {string} A unique id
 */
export function getId() {
  return crypto
    .getRandomValues(new Uint32Array(2))
    .reduce((acc, val) => acc + val.toString(16).padStart(8, "0"), "");
}
function isExpired() {
  if (
    !LAST_JOB_FETCH_TIME ||
    CACHED_JOBS === null ||
    new Date().getTime() - LAST_JOB_FETCH_TIME > JOB_CACHE_TIME
  ) {
    return true;
  }
  return false;
}
