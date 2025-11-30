

import { NS } from "NS";
import { readAugmentsFile } from "./augment-util";
import { AugmentDefinition } from "BB";



/**
 * Find the top N factions that offer the most unpurchased augmentations.
 * args:
 * -T {number} topN - Number of top factions to display (default: 3)
 * -D {factionName} - Display detailed augment list for specified faction
 * @param ns 
 */
export async function main(ns: NS) {
    const arg0 = ns.args[0];
    let detailed = false;
    let detailFaction = "";
    let topN = 3;
    if (typeof arg0 === "string" && arg0 === "-D") {
        detailed = true;
        detailFaction = ns.args.slice(1).join(" ") as string || "";
    } else if (typeof arg0 === "string" && arg0 === "-T") {
        topN = parseInt(ns.args[1] as string) || 3;
    } else {
        ns.tprint("\nUsage : find-best-factions.js [-T {number}] [-D factionName]\n" +
            "\t-T {number} : Number of top factions to display (default: 3)\n" +
            "\t-D factionName : Display detailed augment list for specified faction\n");
        return;
    }

    const factions = fetchFactionAugmentCounts(ns);

    if (!detailed) {
        const sortedFactions = factions.slice(0, topN);
        ns.tprint(`\n\n\tTop ${topN} Factions by Unowned Augments:\n\t----------\n` +
            sortedFactions.map(([faction, augments]) => `\t${faction}: ${augments.length} unowned augments`).join("\n") +
            `\n\n`);
        return;
    }

    if (detailFaction === "") {
        ns.tprint("Please specify a faction name with -D option.");
        return;
    }
    const factionEntry = factions.find(([faction, _]) => faction === detailFaction);
    if (!factionEntry) {
        ns.tprint(`Faction "${detailFaction}" not found or has no unowned augments.`);
        return;
    }
    const [factionName, augmentList] = factionEntry;;
    let detailedStr = `\n\n\tUnowned Augments from "${factionName}":\n\t----------\n` +
        `\t${augmentList.join("\n\t")}\n\n`;
    detailedStr += `Faction Join Requirements:\n\t----------\n${findFactionJoinRequirements(ns, factionName)}\n\n`;    
    ns.tprint(detailedStr);
}


function fetchFactionAugmentCounts(ns: NS) {
    const augments = readAugmentsFile(ns);
    const ownedAugments = ns.singularity.getOwnedAugmentations(true);
    const factionAugmentCounts: { [faction: string]: string[]; } = {};
    const uniqueFactions = getUniqueFactions(augments);
    for (const faction of uniqueFactions) {
        const factionAugments = ns.singularity.getAugmentationsFromFaction(faction);
        const unownedAugments = factionAugments.filter(augment => !ownedAugments.includes(augment) && augments[augment]);
        factionAugmentCounts[faction] = unownedAugments;
    }
    const sortedFactions = Object.entries(factionAugmentCounts)
        .sort((a, b) => b[1].length - a[1].length);
    return sortedFactions;
}

function getUniqueFactions(augments: AugmentDefinition): string[] {
    const factionsSet = new Set<string>();
    for (const augmentDetail of Object.values(augments)) {
        if (augmentDetail.factions && augmentDetail.factions instanceof Array) {
            augmentDetail.factions.forEach(faction => factionsSet.add(faction));
        } else if (typeof augmentDetail.factions === "string") {
            factionsSet.add(augmentDetail.factions);
        }
    }
    return Array.from(factionsSet);
}

function findFactionJoinRequirements(ns: NS, factionName: string): string {    
    const requirements = ns.singularity.getFactionInviteRequirements(factionName);
    return JSON.stringify(requirements, null, 2);
}