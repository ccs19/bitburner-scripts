const SCHEDULE_OUT_PORT = 10;
const TASK_COMPLETE_PORT = 8;

const JOB_FILE = "/scripts/scheduler/data/peek-jobs.json";

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  let prune = false;
  if (ns.args.indexOf("prune") > -1) {
    prune = true;
  }
  let runningJobOutput = ns.getPortHandle(SCHEDULE_OUT_PORT);
  let completionOutput = ns.getPortHandle(TASK_COMPLETE_PORT);
  if (prune) {
    let runningPruned = 0;
    let completedPruned = 0;
    while (runningJobOutput.peek() !== "NULL PORT DATA") {
      runningJobOutput.read();
      runningPruned++;
    }
    while (completionOutput.peek() !== "NULL PORT DATA") {
      completionOutput.read();
      completedPruned++;
    }
    ns.tprint(
      `Pruned ${runningPruned} running jobs and ${completedPruned} completed jobs.`
    );
    return;
  }
  let jobs = runningJobOutput.peek();
  let completed = completionOutput.peek();
  jobs = jobs === "NULL PORT DATA" ? null : jobs;
  completed = completed === "NULL PORT DATA" ? null : completed;

  if (jobs === null) {
    ns.tprint("No jobs found.");
  }
  if (completed === null) {
    ns.tprint("No completed jobs found.");
  }

  if (jobs !== null) {
    const jobString = JSON.stringify(jobs, null, 2);
    ns.tprintf("--------");
    ns.tprintf("%s", jobString);
    ns.tprintf("--------");
    ns.write(JOB_FILE, JSON.stringify(jobs), "w");
  }
  if (completed !== null) {
    ns.tprintf("--------");
    ns.tprintf("%s", completed);
    ns.tprintf("--------");
  }
}
