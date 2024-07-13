/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  let g = ns.getServerGrowth("foodnstuff");
  ns.tprint(`foodnstuff growth: ${g}`);
  g = ns.getServerGrowth("crush-fitness");
  ns.tprint(`crush-fitness growth: ${g}`);
  ns.formulas;
}
