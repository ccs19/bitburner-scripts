import { backdoor } from "scripts/singularity/backdoor";
import { readConfig } from "scripts/singularity/config/sing-config";
const BACKDOOR_SCRIPT = "scripts/singularity/backdoor.js";
const JOB_SCRIPT = "/scripts/singularity/job.js";
const CRIME_SCRIPT = "/scripts/singularity/crime.js";
const FACTION_WORK_SCRIPT = "/scripts/singularity/faction.js";
const FACTION_JOIN_SCRIPT = "/scripts/singularity/join-faction.js";

/**
 * @type {import("NS").NS} ns
 */
let ns;

let jobPid = 0;
let crimePid = 0;
let factionWorkPid = 0;

/**
 * @param {import("NS").NS} _ns
 **/
export async function main(_ns) {
  ns = _ns;
  while (true) {
    const config = readConfig(ns);
    doBackdoor();
    handleWorkType(config);
    await ns.sleep(10000);
  }
}

let needsBackdoor = true;

/**
 *
 * @param {import("BB").SingularityConfig} config
 */
function handleWorkType(config) {
  const workType = config.currentWorkType;

  if (workType === "companyWork") {
    doJob();
  } else if (workType === "crimeWork") {
    doCrime();
  } else if (workType === "factionWork") {
    doFactionWork();
  } else {
    killAllWork();
  }
}

async function doBackdoor() {
  //backdoorTargets = await backdoor(ns, backdoorTargets);
}

function doJob() {
  if (!jobPid) {
    killPid(crimePid);
    killPid(factionWorkPid);
    jobPid = ns.exec(JOB_SCRIPT, ns.getHostname());
    if (jobPid === 0) {
      ns.tprint("Failed to start job");
    } else {
      ns.tprint(`Doing job.`);
    }
  }
}

function doCrime() {
  if (!crimePid) {
    killPid(jobPid);
    killPid(factionWorkPid);
    crimePid = ns.exec(CRIME_SCRIPT, ns.getHostname());
    if (crimePid === 0) {
      ns.tprint("Failed to start crime");
    } else {
      ns.tprint(`Doing crime.`);
    }
  }
}

function doFactionWork() {
  //ns.exec(FACTION_WORK_SCRIPT, ns.getHostname());
}

function killAllWork() {
  killPid(jobPid);
  killPid(crimePid);
  killPid(factionWorkPid);
}

function killPid(pid) {
  if (pid > 0) {
    ns.kill(pid);
    pid = 0;
  }
}
