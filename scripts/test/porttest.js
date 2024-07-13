/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const port = Number(ns.args[0].valueOf());
  const data = ns.args[1].toString();
  ns.writePort(port, data);
}
