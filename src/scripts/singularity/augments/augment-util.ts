import { AugmentDefinition, PurchaseableAugment } from "BB";
import { NS } from "NS";


const AUGMENTS_FILE = "/scripts/singularity/data/augments.json";

export function readAugmentsFile(ns: NS): AugmentDefinition {
    const data = ns.read(AUGMENTS_FILE);
    return JSON.parse(data) as AugmentDefinition;
}

export function getAvailableAugments(ns: NS): PurchaseableAugment[] {
    const factions = ns.getPlayer().factions;
    const ownedAugments = ns.singularity.getOwnedAugmentations(true);
    const allAugmentNames = factions.flatMap(faction => 
        ns.singularity.getAugmentationsFromFaction(faction));
    const uniqueAugmentNames = Array.from(new Set(allAugmentNames));
    const availableAugments: PurchaseableAugment[] = [];

    for(const augmentName of uniqueAugmentNames) {
        // If we own it, skip. The only exception to this looks like NeuroFlux Governor,
        // which we manually handle after this. 
        if(ownedAugments.includes(augmentName)) {
            continue;
        }
        const potentialFactions = getJoinedFactionsForAugment(ns, augmentName);
        if(potentialFactions.length === 0) {
            continue;
        }
        if(meetsAugmentRequirements(ns, augmentName)) {
            availableAugments.push({
                factions: potentialFactions,
                name: augmentName,
                price: ns.singularity.getAugmentationPrice(augmentName),
                repRequirement: ns.singularity.getAugmentationRepReq(augmentName)
            });
        }
    }
    const neuroFlexName = "NeuroFlux Governor";
    const potentialFactions = getJoinedFactionsForAugment(ns, neuroFlexName);
    if(potentialFactions.length > 0 && meetsAugmentRequirements(ns, neuroFlexName)) {
        availableAugments.push({
            factions: potentialFactions,
            name: neuroFlexName,
            price: ns.singularity.getAugmentationPrice(neuroFlexName),
            repRequirement: ns.singularity.getAugmentationRepReq(neuroFlexName)
        });
    }
    return availableAugments;
}

export function getSortedAugmentsByPrice(ns: NS): PurchaseableAugment[] {
    return getAvailableAugments(ns)
    .sort((a, b) => {
        const priceA = ns.singularity.getAugmentationPrice(a.name);
        const priceB = ns.singularity.getAugmentationPrice(b.name);
        return priceA - priceB;
    });
}

export function meetsAugmentRequirements(ns: NS, augmentName: string): boolean {
    const joinedFactions = getJoinedFactionsForAugment(ns, augmentName);
    if(joinedFactions.length === 0) {
        return false;
    }
    return meetsRequiredAugmentReputation(ns, augmentName, joinedFactions)
        && meetsMoneyRequirement(ns, augmentName)
        && hasAugmentPrerequisites(ns, augmentName);
}

function meetsRequiredAugmentReputation(ns: NS, augmentName: string, joinedFactions: string[]): boolean {
    const repReq = ns.singularity.getAugmentationRepReq(augmentName);
    for(const faction of joinedFactions) {
        const factionRep = ns.singularity.getFactionRep(faction);
        if(factionRep >= repReq) {
            return true;
        }
    }
    return false;
}

function meetsMoneyRequirement(ns: NS, augmentName: string): boolean {
    const augmentPrice = ns.singularity.getAugmentationPrice(augmentName);
    const playerMoney = ns.getPlayer().money;
    return playerMoney >= augmentPrice;
}

function getJoinedFactionsForAugment(ns: NS, augmentName: string): string[] {
    const factions = ns.getPlayer().factions;
    const offeringFactions = ns.singularity.getAugmentationFactions(augmentName);
    return factions.filter(faction => offeringFactions.includes(faction));
}

function hasAugmentPrerequisites(ns: NS, augmentName: string): boolean {
    const augmentInfo = ns.singularity.getAugmentationPrereq(augmentName);
    const ownedAugments = ns.singularity.getOwnedAugmentations(true);
    for(const req of augmentInfo) {
        if(!ownedAugments.includes(req)) {
            return false;
        }
    }
    return true;
}