const TASK_COMPLETE_PORT = 8;
const SCHEDULE_IN_PORT = 9;
const SCHEDULE_OUT_PORT = 10;

export async function main(ns) {
  const scheduleQueue = ns.getPortHandle(SCHEDULE_IN_PORT);
  const runningJobOutput = ns.getPortHandle(SCHEDULE_OUT_PORT);
  const completionOutput = ns.getPortHandle(TASK_COMPLETE_PORT);
}
