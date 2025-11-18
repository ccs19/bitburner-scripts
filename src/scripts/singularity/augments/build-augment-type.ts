import { AugmentDefinition } from "BB";
import { NS } from "NS";
//import { readAugmentsFile } from "/scripts/singularity/augments/augment-util";

const AUGMENTS_FILE = "/scripts/singularity/data/augments.json";

let ns: NS;

/** 
 * Builds the augment detail TypeScript type definition
 * by examining the augments in augments.json
 * and inferring the property types.
 */
export async function main(_ns: NS) {
    ns = _ns;
    const augmentsStr = ns.read(AUGMENTS_FILE);
    const augmentsData = JSON.parse(augmentsStr) as AugmentDefinition;
    printPossibleAugmentProperties(augmentsData);

}

function printPossibleAugmentProperties(augments: AugmentDefinition)  {
    let properties = new Map<string, string[]>();
    for (const [augmentName, augmentDetail] of Object.entries(augments)) {
        for (const propertyName of Object.keys(augmentDetail)) {
            const val = augmentDetail[propertyName as keyof typeof augmentDetail];
            let augmentType = getPropType(val);
            if (Array.isArray(val)) {
                augmentType = getPropType(val[0]) + "[]";
            }
            if(properties.has(propertyName)) {
                const existingType = properties.get(propertyName);
                if(existingType && !existingType.includes(augmentType)) {
                    existingType.push(augmentType);
                    properties.set(propertyName, existingType);
                }
            } else {
                properties.set(propertyName, [augmentType]);
            }
        }
    }
    let typeDef = "\n\nexport interface AugmentDefinition {\n" + 
     " [key: string]: AugmentDetail;\n}\n";
    typeDef += "\nexport interface AugmentDetail {\n";
    for (const [propName, types] of Array.from(properties)) {
        typeDef += `  ${propName}: ${types.join(" | ")};\n`;
    }
    typeDef += "}\n";
    ns.tprint(typeDef);
}

function getPropType(value: any): string {
    if (Array.isArray(value)) {
        return "array";
    } else if (typeof value === "number") {
        return "number";
    } else if (typeof value === "boolean") {
        return "boolean";  
    } else if (typeof value === "string") {
        return "string";
    } else {

        return "object";
    }
}