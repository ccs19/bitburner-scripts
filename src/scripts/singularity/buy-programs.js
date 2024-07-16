/**
 * @type {import("NS").NS} ns
 */
let ns;

const programNames = [
  "AutoLink.exe",
  "ServerProfiler.exe",
  "DeepscanV1.exe",
  "DeepscanV2.exe",
  "Formulas.exe",
  "BruteSSH.exe",
  "FTPCrack.exe",
  "relaySMTP.exe",
  "HTTPWorm.exe",
  "SQLInject.exe",
];

export async function main(_ns) {
  ns = _ns;
  while (true) {
    const upgradesRemaining = buyUpgrades();
    if (!upgradesRemaining) {
      ns.tprintf("All programs purchased");
      return;
    }
    await ns.sleep(10000);
  }
}

function buyUpgrades() {
  let upgradesRemaining = false;
  upgradesRemaining = buyTorRouter();
  upgradesRemaining = buyPrograms();
  return upgradesRemaining;
}

function buyTorRouter() {
  if (ns.hasTorRouter()) {
    return false;
  }
  if (ns.singularity.purchaseTor()) {
    ns.tprintf("Purchased Tor Router");
    return true;
  }
}

function buyPrograms() {
  if (!ns.hasTorRouter()) {
    return true;
  }
  const programs = ns.singularity.getDarkwebPrograms();
  let programsRemaining = false;
  for (const program of programs) {
    if (!ns.fileExists(program)) {
      const purchased = ns.singularity.purchaseProgram(program);
      if (!purchased) {
        programsRemaining = true;
      }
    }
  }
  return programsRemaining;
}
