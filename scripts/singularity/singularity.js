import { backdoor } from "scripts/singularity/backdoor";
import { startJob } from "scripts/singularity/job";

const BACKDOOR_SCRIPT = "scripts/singularity/backdoor.js";
const JOB_SCRIPT = "scripts/singularity/job.js";
const CRIME_SCRIPT = "scripts/singularity/crime.js";
const FACTION_WORK_SCRIPT = "scripts/singularity/faction.js";
const FACTION_JOIN_SCRIPT = "scripts/singularity/join-faction.js";

/**
 * @type {import("NS").NS} ns
 */
let ns;

/**
 * @param {import("NS").NS} _ns
 **/
export async function main(_ns) {
  ns = _ns;
  while (true) {
    await doBackdoor();
    await doJob();
    await ns.sleep(10000);
  }
}

let needsBackdoor = true;

async function doBackdoor() {
  backdoorTargets = await backdoor(ns, backdoorTargets);
}

async function doJob() {
  await startJob(ns, "ecorp");
}
