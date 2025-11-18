import { NS } from "NS";



/** 
 * Find factions that offer a specific augment.
 */
export async function main(ns : NS) {
    const augmentName = ns.args.join(" ");
    const factions = ns.singularity.getAugmentationFactions(augmentName);
    ns.tprint(`\n\n\tFactions offering "${augmentName}":\n\t----------\n` +
        `\t${factions.join("\n\t")}\n\n`);
}


