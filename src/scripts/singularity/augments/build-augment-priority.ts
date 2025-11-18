/** 
 * Builds augment priority list. 
 * This is done by examining the augments in augments.json
 * and does a quick and dirty priority assignment based on
 * the augment's benefits/cost ratio. 
 * 
 * Weight variables are hard-coded but can be adjusted as needed.
 * 
 * TODO Not complete. Probably don't really need this.
 */

import { NS } from "NS";
import { readAugmentsFile } from "./augment-util";
const AUGMENTS_FILE = "/scripts/singularity/data/augments.json";

// Hacking attributes
const HACK_CHANCE = 4.0;
const HACK_SPEED = 4.0;
const HACK_MONEY = 4.0;
const HACK_GROWTH = 4.0;
const HACK_EXP = 4.0;
// "Hacking" is chance/speed/money/growth. So weighted for all combined.
const HACKING = HACK_CHANCE + HACK_SPEED + HACK_MONEY + HACK_GROWTH + HACK_EXP;

// Physical attributes
const DEX_WEIGHT = 2.0;
const STR_WEIGHT = 2.0;
const DEF_WEIGHT = 2.0;
const AGI_WEIGHT = 2.0;

// Other
const CHA_WEIGHT = 2.0;
const COMPANY_REP_WEIGHT = 1.5;
const FACTION_REP_WEIGHT = 1.5;
//const INT_WEIGHT = 2.0;

const HACKNET_WEIGHT = 0.01;

// Not directly beneficial but enhances other things
const ZOE_WEIGHT = 100;
const STANEKS_WEIGHT = 100;


// Stuff for mini-games or other non-direct benefits
const MISC_WEIGHT = 0.1;

// Regex patterns for augments that are mini-game related
// Need to examine these as they come up
const MINI_GAMES_AUGMENTS = [
    "SoA.*",
]

// Special augments that get a high priority but have no direct benefits
const SPECIAL_AUGMENTS = [
    "The Red Pill",
    "violet Congruity Implant",
    "Neuroreceptor Management Implant",
    "The Blade's Simulacrum",
    "NeuroFlux Governor"
];
const SPECIAL_WEIGHT = 100;
// Excluded, because these are probably manually purchased before augment automation
const EXCLUDED_AUGMENTS = [
    "CashRoot Starter Kit"
];

let ns: NS;

export async function main(_ns: NS) {
    ns = _ns;
    const augmentsData = readAugmentsFile(ns);
    const augmentPriorities: { name: string; priority: number }[] = [];
    for (const [augmentName, augmentDetail] of Object.entries(augmentsData)) {
        if (EXCLUDED_AUGMENTS.includes(augmentName)) {
            continue;
        }
        let priority = 0;
        priority += (augmentDetail.hacking_chance ?? 0) * HACK_CHANCE;
        priority += (augmentDetail.hacking_grow ?? 0) * HACK_GROWTH;
        priority += (augmentDetail.hacking_speed ?? 0) * HACK_SPEED;
        priority += (augmentDetail.hacking_money ?? 0) * HACK_MONEY;
        priority += (augmentDetail.hacking_exp ?? 0) * HACK_EXP;
        priority += (augmentDetail.hacking ?? 0) * HACKING;
        priority += (augmentDetail.dexterity ?? 0) * DEX_WEIGHT;
        priority += (augmentDetail.strength ?? 0) * STR_WEIGHT;
        priority += (augmentDetail.defense ?? 0) * DEF_WEIGHT;
        priority += (augmentDetail.agility ?? 0) * AGI_WEIGHT;
        priority += (augmentDetail.charisma ?? 0) * CHA_WEIGHT;
        priority += (augmentDetail.company_rep ?? 0) * COMPANY_REP_WEIGHT;
        priority += (augmentDetail.faction_rep ?? 0) * FACTION_REP_WEIGHT;
        priority += (augmentDetail.hacknet_node_money ?? 0) * HACKNET_WEIGHT;
        priority += (augmentDetail.hacknet_node_core_cost ?? 0) * HACKNET_WEIGHT;
        priority += (augmentDetail.hacknet_node_level_cost ?? 0) * HACKNET_WEIGHT;
        priority += (augmentDetail.hacknet_node_ram_cost ?? 0) * HACKNET_WEIGHT;
        priority += (augmentDetail.strength ?? 0) * STR_WEIGHT;
        priority += (augmentDetail.defense ?? 0) * DEF_WEIGHT;
        priority += (augmentDetail.dexterity ?? 0) * DEX_WEIGHT;
        priority += (augmentDetail.agility ?? 0) * AGI_WEIGHT;
        priority += (augmentDetail.strength_exp ?? 0) * STR_WEIGHT * 0.1;
        priority += (augmentDetail.defense_exp ?? 0) * DEF_WEIGHT * 0.1;
        priority += (augmentDetail.dexterity_exp ?? 0) * DEX_WEIGHT * 0.1;
        priority += (augmentDetail.agility_exp ?? 0) * AGI_WEIGHT * 0.1;
        //priority += (augmentDetail.intelligence ?? 0) * INT_WEIGHT;   
        if(augmentName.startsWith("Stanek's")) {
            priority = STANEKS_WEIGHT;
        } else if(augmentName.startsWith("Z.O")) {
            priority = ZOE_WEIGHT;
        } else if(augmentName.match(new RegExp(MINI_GAMES_AUGMENTS.join("|"))) && priority === 0) {
            priority = MISC_WEIGHT;
        } else if(augmentName.startsWith("BLADE-51b") || augmentName.startsWith("EMS-4") || augmentName.startsWith("Hyperion Plasma")) {
            priority = 1;
        } else if(SPECIAL_AUGMENTS.includes(augmentName)) {
            priority = SPECIAL_WEIGHT;
        }
        if(priority === 0) {
            // Need to inspect these augments manually
            priority = 9999;
        }
        augmentPriorities.push({ name: augmentName, priority });
    }
    augmentPriorities.sort((a, b) => b.priority - a.priority);
    
    let priorityString = "\n\n=======================\nAugment Priority List:\n=======================\n";
    
    for (const augment of augmentPriorities) {
        const priorityTruncated = Math.round(augment.priority * 100) / 100;
        priorityString += `${augment.name}: ${priorityTruncated}\n`;
    }   
    ns.tprint(priorityString);
}

function canPurchase(ns: NS, augmentName: string): boolean {
    const player = ns.getPlayer();
    return false;
}