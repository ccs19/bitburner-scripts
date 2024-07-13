import { getConnectPath } from "scripts/util/t-connect";

/**
 * @type {import("NS").NS} ns
 * */
let ns;

const YES = "backdoor";
const NO = "not-backdoor";
const DONE = "already-backdoor";

/**
 * Execute backdoor on faction machines.
 * @param {import("NS").NS} _ns
 * @param {string[]} backdoorTargets
 * @returns {Promise<string[]>} The list of machines that still need backdoor
 */
export async function backdoor(_ns, backdoorTargets) {
  ns = _ns;
  if (backdoorTargets.length === 0) {
    return backdoorTargets;
  }
  for (let target of backdoorTargets) {
    const status = canBackdoor(target);
    if (status === DONE) {
      backdoorTargets = backdoorTargets.filter((t) => t !== target);
      continue;
    } else if (status === NO) {
      continue;
    }
    const path = getConnectPath(ns, target);
    for (let server of path) {
      connect(server);
    }
    ns.singularity.purchaseAugmentation;
    ns.tprintf("Installing backdoor on %s", target);
    await ns.singularity.installBackdoor();
    backdoorTargets = backdoorTargets.filter((t) => t !== target);
    connect("home");
  }
  return backdoorTargets;
}

function canBackdoor(hostname) {
  const server = ns.getServer(hostname);
  if (server.backdoorInstalled) {
    return DONE;
  } else if (
    !server.hasAdminRights ||
    ns.getHackingLevel() < server.requiredHackingSkill
  ) {
    return NO;
  } else {
    return YES;
  }
}

function connect(hostname) {
  ns.singularity.connect(hostname);
}