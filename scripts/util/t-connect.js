/**
 * Connects to a server via terminal manipulation.
 * Usage ./t-connect.js <hostname>
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const target = ns.args[0].toString();
  const terminalInput = document.getElementById("terminal-input");
  const path = getConnectPath(ns, target);
  if (path.length === 0) {
    ns.tprintf("No path from %s to %s", ns.getServer().hostname, target);
  }
  for (const p of path) {
    connect(terminalInput, p);
  }
}

function connect(terminalInput, hostname) {
  terminalInput.value = "connect " + hostname;
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
 * @param {string} hostname The target to find a path to
 * @returns {string[]} The path from the current server to the target server
 */
export function getConnectPath(ns, hostname) {
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
