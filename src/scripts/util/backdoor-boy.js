import { readServers } from "./common";

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const terminalInput = document.getElementById("terminal-input");
  const servers = getServers(ns);
  if (servers.length === 0) {
    return;
  }
  for (const s of servers) {
    const path = getPath(ns, s.hostname);
    if (path.length === 0) {
      continue;
    }
    for (const p of path) {
      connect(terminalInput, p);
    }
    backdoor(terminalInput);
    let currentServer = ns.getServer(s.hostname);
    while (!currentServer.backdoorInstalled) {
      await ns.sleep(5000);
      currentServer = ns.getServer(s.hostname);
    }
    connect(terminalInput, "home");
  }
  connect(terminalInput, "home");
}

function connect(terminalInput, hostname) {
  terminalInput.value = "connect " + hostname;
  pressEnter(terminalInput);
}

function backdoor(terminalInput) {
  terminalInput.value = "backdoor";
  pressEnter(terminalInput);
}

function pressEnter(terminalInput) {
  // Get a reference to the React event handler.
  const handler = Object.keys(terminalInput)[1];

  // Perform an onChange event to set some internal values.
  terminalInput[handler].onChange({ target: terminalInput });

  // Simulate an enter press
  terminalInput[handler].onKeyDown({
    key: "Enter",
    preventDefault: () => null,
  });
}

/**
 *
 * @param {import("NS").NS} ns
 */
function getServers(ns) {
  const servers = readServers(ns);
  const needsBackdoor = [];
  for (const server of servers) {
    if (
      server.hostname !== "home" &&
      !server.purchasedByPlayer &&
      server.hasAdminRights &&
      ns.getHackingLevel() >= server.requiredHackingSkill &&
      !server.backdoorInstalled
    ) {
      needsBackdoor.push(server);
    }
  }
  return needsBackdoor;
}

/**
 *
 * @param {import("NS").NS} ns
 */
function getPath(ns, hostname) {
  let startServer = ns.getServer().hostname;
  let target = hostname;
  let [results, isFound] = findPath(
    ns,
    target.toString(),
    startServer,
    [],
    [],
    false
  );
  if (!isFound) {
    return [];
  } else {
    return results;
  }
}

/**
 *
 * @param {import("NS").NS} ns
 * @param {string} target
 * @param {string} serverName
 * @param {string[]} serverList
 * @param {string[]} ignore
 * @param {boolean} isFound
 * @returns
 */
function findPath(ns, target, serverName, serverList, ignore, isFound) {
  ignore.push(serverName);
  let scanResults = ns.scan(serverName);
  for (let server of scanResults) {
    if (ignore.includes(server)) {
      continue;
    }
    if (server === target) {
      serverList.push(server);
      return [serverList, true];
    }
    serverList.push(server);
    [serverList, isFound] = findPath(
      ns,
      target,
      server,
      serverList,
      ignore,
      isFound
    );
    if (isFound) {
      return [serverList, isFound];
    }
    serverList.pop();
  }
  return [serverList, false];
}
