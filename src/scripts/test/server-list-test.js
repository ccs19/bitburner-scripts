import { readServers } from "scripts/util/common";

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const servers = readServers(ns, true, 0.5);
  ns.tprintf("%s", servers.map((s) => s.hostname).join("\n"));
}
