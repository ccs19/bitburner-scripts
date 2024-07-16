import { readConfig } from "scripts/singularity/config/sing-config";

/**
 * @type {import("NS").NS} ns
 */
let ns;

export async function main(_ns) {
  ns = _ns;
  let factionsToJoin = readConfig(ns).factionAlwaysJoin;
  while (true) {
    const invitations = ns.singularity.checkFactionInvitations();
    for (const faction of invitations) {
      if (factionsToJoin.includes(faction)) {
        ns.singularity.joinFaction(faction);
      }
    }
    await ns.sleep(10000);
  }
}
