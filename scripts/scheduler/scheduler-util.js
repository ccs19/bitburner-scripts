/**
 * Return all servers with root access and memory.
 * @param {import("NS").NS} ns
 */
function readServers(ns) {
  const neighbors = scan(ns);
  var processed = [];
  var toProcess = [];
  // List of servers
  // Home is first because it is multi-core
  var results = [ns.getServer("home")];

  toProcess = toProcess.concat(neighbors);
  while (toProcess.length > 0) {
    const neighbor = toProcess.pop();
    const server = getServer(ns, neighbor);
    if (
      server.hostname !== "home" &&
      server.hasAdminRights &&
      server.maxRam > 0
    ) {
      results.push(server);
    }
    let nNeighbors = scan(ns, server.hostname);
    for (var i = 0; i < nNeighbors.length; i++) {
      if (processed.indexOf(nNeighbors[i]) >= 0) {
        continue;
      }
      toProcess.push(nNeighbors[i]);
    }
    processed.push(server.hostname);
  }
  return results;
}
/**
 * @param {import("NS").NS} ns
 */
function scan(ns, hostname = undefined) {
  return ns.scan(hostname);
}

/**
 * @param {import("NS").NS} ns
 */
function getServer(ns, hostname) {
  return ns.getServer(hostname);
}

export { readServers, scan, getServer };
