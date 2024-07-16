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
  jobPid = findJobPid();
  crimePid = findCrimePid();
  factionWorkPid = findFactionWorkPid();
  while (true) {
    const config = readConfig(ns);
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

function doJob() {
  if (jobPid <= 0) {
    killPid(crimePid);
    killPid(factionWorkPid);
    jobPid = ns.exec(JOB_SCRIPT, ns.getHostname());
    if (jobPid === 0) {
      ns.tprintf("Failed to start job");
    } else {
      ns.tprintf(`Started job script.`);
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
  if (!factionWorkPid) {
    killPid(jobPid);
    killPid(crimePid);
    factionWorkPid = ns.exec(FACTION_WORK_SCRIPT, ns.getHostname());
    if (factionWorkPid === 0) {
      ns.tprint("Failed to start faction work");
    } else {
      ns.tprint(`Working for faction.`);
    }
  }
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

function findJobPid() {
  return findProcessPid(JOB_SCRIPT);
}

function findCrimePid() {
  return findProcessPid(CRIME_SCRIPT);
}

function findFactionWorkPid() {
  return findProcessPid(FACTION_WORK_SCRIPT);
}

function findProcessPid(script) {
  const processes = ns.ps(ns.getHostname());
  const process = processes.find((p) => {
    return p.filename === script || p.filename === script.substring(1);
  });
  return process ? process.pid : 0;
}
