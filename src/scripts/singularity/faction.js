import { readConfig } from "scripts/singularity/config/sing-config";

/**
 * @type {import("NS").NS} ns
 */
let ns;

/**
 * Triggers working for a faction using singularity api.
 * @param {import("NS").NS} _ns
 * */
export async function main(_ns) {
  ns = _ns;

  while (true) {
    const config = readConfig(ns);
    if (!isFactionWork(config)) {
      return;
    }
    workForFaction(config);
    await ns.sleep(10000);
  }
}

/**
 * @param {import("BB").SingularityConfig} config
 * */
function isFactionWork(config) {
  return config.currentWorkType === "factionWork";
}

/**
 * @param {import("BB").SingularityConfig} config
 * */
function workForFaction(config) {
  if (alreadyWorkingForFaction(config)) {
    return;
  }
  const { factionWork } = config;

  if (!isFactionMember(factionWork)) {
    throw new Error(`Not a member of ${factionWork.factionName}`);
  }
  const success = ns.singularity.workForFaction(
    factionWork.factionName,
    factionWork.jobType,
    factionWork.focus
  );
  if (!success) {
    throw new Error(
      `Failed to work for ${factionWork.factionName} with job type ${factionWork.jobType}`
    );
  }
}

/**
 *
 * @param {import("BB").SingularityConfig} config
 * @returns
 */
function alreadyWorkingForFaction(config) {
  const { factionWork } = config;
  const task = ns.singularity.getCurrentWork();
  if (
    task.factionName === factionWork.factionName &&
    task.factionWorkType === factionWork.jobType &&
    ns.singularity.isFocused() === factionWork.focus
  ) {
    return true;
  }
  return false;
}

/**
 *
 * @param {import("BB").SngFactionWork} factionWork
 * @returns
 */
function isFactionMember(factionWork) {
  return ns.getPlayer().factions.includes(factionWork.factionName);
}
