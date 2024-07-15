/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  const hostname = ns.args[0].toString();
  const threads = Number(ns.args[1]);
  const options = {
    threads: threads,
  };
  await ns.hack(hostname, options);
}
