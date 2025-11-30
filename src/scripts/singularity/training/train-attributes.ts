
/** 
 * Trains strength, defense, dex, agility, charisma to specified level
 * Usage: train-attributes.js {targetLevel} {preferredAttribute}
 * Use preferredAttribute to focus on that attribute first (optional)
 * Otherwise, the script will just do 10 levels of each attribute at a time.
 */
import { NS } from "NS";


export async function main(ns: NS) {
    if(ns.args.length < 1) {
        ns.tprint("Usage: train-attributes.js targetLevel");
        return;
    }
    let preferredAttribute = "";
    if(ns.args.length >= 2) {
        preferredAttribute = ns.args[1] as string;
    }
    const targetLevel = ns.args[0] as number;

    const attributes = ["strength", "defense", "dexterity", "agility"];
    // charisma first
    // ns.singularity.ch
    while(true) {
        // TODO
    }
}
