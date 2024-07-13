import { readServers, getPortOpenTools } from "scripts/util/common";

let ownEverything = false;

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  while (ownEverything === false) {
    const portOpenTools = getPortOpenTools(ns);
    const { rootCandidates, cantRootYet } = await findRootCandidates(
      ns,
      portOpenTools
    );
    if (rootCandidates.length === 0 && cantRootYet.length === 0) {
      ownEverything = true;
    } else if (rootCandidates.length > 0) {
      for (const server of rootCandidates) {
        ns.tprint(`Rooting ${server.hostname}`);
        portOpenTools.forEach((tool) => {
          tool(server.hostname);
        });
        ns.nuke(server.hostname);
      }
    }
    await ns.sleep(5000);
  }
  ns.tprint("Rooted all servers!");
}

async function findRootCandidates(ns, portOpenTools) {
  let servers = readServers(ns, false);
  let rootCandidates = [];
  let cantRootYet = [];
  for (const server of servers) {
    if (server.hasAdminRights) {
      continue;
    } else if (isRootCandidate(ns, server, portOpenTools.length)) {
      rootCandidates.push(server);
    } else {
      cantRootYet.push(server);
    }
  }
  return { rootCandidates, cantRootYet };
}

/**
 * @param {import("NS").NS} ns
 * @param {import("NS").Server} server
 * @param {number} numTools
 * @returns boolean
 */
function isRootCandidate(ns, server, numTools) {
  if (server.numOpenPortsRequired > numTools) {
    return false;
  }
  return true;
}
