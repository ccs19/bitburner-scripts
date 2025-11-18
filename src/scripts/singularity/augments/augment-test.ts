import { getAvailableAugments } from "./augment-util";

export async function main(ns) {
    ns.tprint("\n " + JSON.stringify(getAvailableAugments(ns), null, 2));
    
}