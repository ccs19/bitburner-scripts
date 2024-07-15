/**
 * @type {import("NS").NS} ns
 */
let ns;

/**
 * js file so it will be uploaded
 */
const configFile = "/scripts/singularity/config/config.json";

/**
 *
 * @param {import("NS").NS} _ns
 * @returns {import("BB").SingularityConfig}
 */
export function readConfig(_ns) {
  ns = _ns;
  const str = ns.read(configFile);
  try {
    return JSON.parse(str);
  } catch (e) {
    ns.tprint(`Error reading config file: ${e}`);
    ns.tprintf("%s", str);
    throw e;
  }
}
