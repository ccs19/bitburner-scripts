// @ts-ignore
import { readServers } from "/scripts/util/common";

/** @param {import("NS").NS} ns */
export async function main(ns) {
  const servers = readServers(ns, true);
  ns.tprintf("%s", servers.length);
}
