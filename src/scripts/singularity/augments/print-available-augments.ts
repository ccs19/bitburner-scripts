import { AugmentDefinition } from "BB";
import { NS } from "NS";
import { readAugmentsFile } from "./augment-util";


let ns: NS;

export async function main(_ns: NS) {
    ns = _ns;
    const augments = readAugmentsFile(ns);

}
