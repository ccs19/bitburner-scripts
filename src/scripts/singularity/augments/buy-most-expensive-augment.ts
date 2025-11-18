/**
 * Simple script that just buys all the most expensive augments until
 * we run out of money.
 */


import { NS } from "NS";
import { getSortedAugmentsByPrice } from "./augment-util";

let ns: NS;

export async function main(_ns: NS) {
    ns = _ns;
    buyMostExpensiveAugments();
}

function buyMostExpensiveAugments() {
    let availableAugments = getSortedAugmentsByPrice(ns);
    let breakCounter = 0;
    while(availableAugments.length > 0) {
        const augment = availableAugments[0];
        ns.singularity.purchaseAugmentation(augment.factions[0], augment.name);
        ns.tprint(`Purchased ${augment.name} for ${ns.nFormat(augment.price, "$0.00a")}`);
        availableAugments = getSortedAugmentsByPrice(ns);
        if(breakCounter++ > 100) {
            ns.tprint("Breaking out of infinite loop");
            break;
        }
    }
}

