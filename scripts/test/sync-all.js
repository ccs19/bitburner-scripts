import { readBotServers } from "scripts/util/common";

/**
 * @param {import("NS").NS} ns
 */
export async function main(ns) {
  while (true) {
    const scripts = ns.ls("home").filter((f) => f.endsWith(".js"));
    const servers = readBotServers(ns);
    for (const server of servers) {
      for (const script of scripts) {
        const success = ns.scp(script, server.hostname, "home");
        if (!success) {
          ns.tprint(`Failed to scp ${script} to ${server.hostname}`);
          throw new Error("Failed to scp script to server");
        }
      }
    }
    await ns.sleep(5000);
  }
}
