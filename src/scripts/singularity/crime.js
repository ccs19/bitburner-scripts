import { readConfig } from "/scripts/singularity/config/sing-config";

const CRIME_FILE = "/scripts/singularity/data/crime.json";

/**
 * @type {import("NS").NS} ns
 */
let ns;
let crimeNames = [];

export async function main(_ns) {
  ns = _ns;
  loadCrimes();
  while (true) {
    const config = readConfig(ns);
    if (config.currentWorkType !== "crimeWork") {
      return;
    }
    doCrime(config);
    await ns.sleep(10000);
  }
}

/**
 *
 * @param {import("BB").SingularityConfig} config
 */
function doCrime(config) {
  const crimeName = config.crimeWork.crimeName;
  const focus = config.crimeWork.focus;
  const crime = crimeNames.find((c) => c === crimeName);
  if (!crime) {
    throw new Error(`Crime not found: ${crimeName}`);
  }
  let change = false;

  if (!ns.singularity.isBusy() || ns.singularity.isFocused() !== focus) {
    change = true;
  }
  if (!change && ns.singularity.getCurrentWork() !== null) {
    const currentWork = ns.singularity.getCurrentWork();
    change = currentWork.crimeType !== crimeName;
  }
  if (change) {
    ns.singularity.commitCrime(crime, focus);
  }
}

function loadCrimes() {
  const crimeStr = ns.read(CRIME_FILE);
  crimeNames = JSON.parse(crimeStr);
}
