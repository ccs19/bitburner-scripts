import { readConfig } from "scripts/singularity/config/sing-config";

const JOBS_BY_TYPE = {
  Software: [
    "Software Engineering Intern",
    "Junior Software Engineer",
    "Senior Software Engineer",
    "Lead Software Developer",
    "Head of Software",
    "Head of Engineering",
    "Vice President of Technology",
    "Chief Technology Officer",
  ],
  "Security Engineer": ["Security Engineer"],
  "Software Consultant": ["Software Consultant", "Senior Software Consultant"],
  "Business Consultant": ["Business Consultant", "Senior Business Consultant"],
  IT: ["IT Intern", "IT Analyst", "IT Manager", "Systems Administrator"],
  "Network Engineer": ["Network Engineer", "Network Administrator"],
  Business: [
    "Business Intern",
    "Business Analyst",
    "Business Manager",
    "Operations Manager",
    "Chief Financial Officer",
    "Chief Executive Officer",
  ],
  Security: [
    "Security Guard",
    "Security Officer",
    "Security Supervisor",
    "Head of Security",
  ],
  Agent: ["Field Agent", "Secret Agent", "Special Operative"],
};

/**
 * @type {import("NS").NS} ns
 * */
let ns;

/**
 * @typedef {"Ecorp"|"MegaCorp" | "KuaiGong International" | "Four Sigma" | "NWO" | "Blade Industries" | "OmniTek Incorporated" | "Bachman & Associates" | "Clarke Incorporated" | "Fulcrum Technologies"} CorpName
 */

/**
 * @typedef Corps
 * @type {Object.<CorpName, string>}
 */

/**
 * @type {Corps}
 */
export const CORPS = {
  ecorp: "ECorp",
  megacorp: "MegaCorp",
  kuaiGong: "KuaiGong International",
  fourSigma: "Four Sigma",
  nwo: "NWO",
  blade: "Blade Industries",
  omnitek: "OmniTek Incorporated",
  bachman: "Bachman & Associates",
  clarke: "Clarke Incorporated",
  fulcrum: "Fulcrum Technologies",
};

/**
 * Try to start a software job.
 * @param {import("NS").NS} _ns
 */
export async function main(_ns) {
  ns = _ns;
  while (true) {
    const companyConfig = readCompanyWork();
    if (!companyConfig) {
      await ns.sleep(10000);
    } else {
      let { currentPosition, matchesType } = getCurrentPosition(companyConfig);
      let hasPosition = false;
      if (currentPosition && matchesType) {
        hasPosition = handleCurrentPosition(
          hasPosition,
          currentPosition,
          companyConfig
        );
      } else if (!matchesType) {
        hasPosition = handlePositionTypeChange(companyConfig, hasPosition);
      } else {
        const position = findPositionToApply(companyConfig);
        if (!position) {
          ns.tprintf(
            "No %s position found for %s",
            companyConfig.jobType,
            companyConfig.companyName
          );
          return;
        } else {
          hasPosition = applyForPosition(
            companyConfig.companyName,
            position,
            false
          );
        }
      }
      if (hasPosition) {
        startWorking(companyConfig.companyName);
      }
    }
    await ns.sleep(10000);
  }
}

function handlePositionTypeChange(companyConfig, hasPosition) {
  const nextPosition = findPositionToApply(companyConfig);
  if (nextPosition) {
    hasPosition = applyForPosition(
      companyConfig.companyName,
      nextPosition,
      true
    );
  }
  return hasPosition;
}

/**
 *
 * @param {boolean} hasPosition
 * @param {string} currentPosition
 * @param {import("BB").SngCompanyWork} companyConfig
 * @returns
 */
function handleCurrentPosition(hasPosition, currentPosition, companyConfig) {
  hasPosition = true;
  let promotionPosition = eligibleForPromotion(currentPosition, companyConfig);
  if (promotionPosition) {
    if (
      !applyForPosition(companyConfig.companyName, promotionPosition, false)
    ) {
      ns.tprintf("Failed to get promotion to %s", promotionPosition);
    }
  }
  return hasPosition;
}

/**
 * Find the position to apply for.
 * @param {import("BB").SngCompanyWork} companyConfig
 * @returns {string | undefined} The position to apply for.
 */
function findPositionToApply(companyConfig) {
  const { companyName, jobType } = companyConfig;

  const jobTypePositions = JOBS_BY_TYPE[jobType];
  if (!jobTypePositions) {
    throw new Error(`No job types found for ${jobType}`);
  }
  const positions = ns.singularity
    // @ts-ignore
    .getCompanyPositions(companyName)
    .map((p) => p.toString())
    .filter((p) => jobTypePositions.includes(p));

  let bestPosition = -1;
  for (let i = 0; i < positions.length; i++) {
    if (meetsSkillRequirements(positions[i], companyName)) {
      bestPosition = i;
    }
  }
  if (bestPosition === -1) {
    return undefined;
  }
  return positions[bestPosition];
}
/**
 * @param {string} job
 * @param {CorpName} corp
 */
function meetsSkillRequirements(job, corp) {
  const playerSkills = ns.getPlayer().skills;
  // @ts-ignore
  const info = ns.singularity.getCompanyPositionInfo(corp, job);
  // @ts-ignore
  const companyRep = ns.singularity.getCompanyRep(corp);

  let meets = playerSkills.hacking >= info.requiredSkills.hacking;
  meets = meets && playerSkills.strength >= info.requiredSkills.strength;
  meets = meets && playerSkills.defense >= info.requiredSkills.defense;
  meets = meets && playerSkills.dexterity >= info.requiredSkills.dexterity;
  meets = meets && playerSkills.agility >= info.requiredSkills.agility;
  meets = meets && playerSkills.charisma >= info.requiredSkills.charisma;
  meets =
    meets && playerSkills.intelligence >= info.requiredSkills.intelligence;
  meets = meets && companyRep >= info.requiredReputation;
  return meets;
}

/**
 *
 * @param {import("BB").SngCompanyWork} companyConfig
 * @returns {Object | undefined}
 */
function getCurrentPosition(companyConfig) {
  const jobs = ns.getPlayer().jobs;
  let currentPosition = undefined;
  if (jobs[companyConfig.companyName]) {
    currentPosition = jobs[companyConfig.companyName];
  }
  if (currentPosition) {
    return {
      currentPosition,
      matchesType: jobMatchesRequestedType(currentPosition, companyConfig),
    };
  }
  return {};
}

/**
 *
 * @param {string} currentPosition
 * @param {import("BB").SngCompanyWork} companyConfig
 * @returns
 */
function eligibleForPromotion(currentPosition, companyConfig) {
  const nextPosition = findNextPosition(companyConfig, currentPosition);
  if (!nextPosition || nextPosition === currentPosition) {
    return undefined;
  }
  const { companyName } = companyConfig;
  return meetsSkillRequirements(
    // @ts-ignore
    nextPosition,
    companyName
  )
    ? nextPosition
    : undefined;
}

/**
 *
 * @param {string} company
 * @param {string} job
 * @param {boolean} quitJob Quit current job at company before applying.
 * @returns {boolean}
 */
// @ts-ignore
function applyForPosition(company, job, quitJob = false) {
  // API docs don't match the return type. Check for boolean first, then
  // string.
  // @ts-ignore
  if (quitJob) {
    ns.singularity.quitJob(company);
  }
  let result = ns.singularity.applyToCompany(company, "Software");
  if (typeof result !== "boolean") {
    result = result != null;
  }
  ns.tprintf("Applying for %s at %s. Success? %s", job, company, result);
  return result;
}

function startWorking(company) {
  if (!alreadyWorking(company)) {
    ns.tprintf("Starting work for %s", company);
    return ns.singularity.workForCompany(company, false);
  }
}

// @ts-ignore
function findNextPosition(companyConfig, currentPosition) {
  const { companyName, jobType } = companyConfig;
  const positions = ns.singularity.getCompanyPositions(companyName);
  const jobsForType = JOBS_BY_TYPE[jobType]
    ? new Set(JOBS_BY_TYPE[jobType])
    : undefined;
  if (!jobsForType) {
    throw new Error(`No jobs known for type ${jobType}`);
  }
  let currentPositionIndex = -1;
  if (jobsForType.has(currentPosition)) {
    currentPositionIndex = Array.from(jobsForType).indexOf(currentPosition);
  }
  for (let i = 0; i < positions.length; i++) {
    if (
      jobsForType.has(positions[i]) &&
      positions[i] !== currentPosition &&
      i > currentPositionIndex
    ) {
      return positions[i];
    }
  }
  return undefined;
}
function alreadyWorking(company) {
  // @ts-ignore
  return ns.singularity.getCurrentWork()?.companyName === company;
}

/**
 * @returns {import("BB").SngCompanyWork | undefined}
 */
function readCompanyWork() {
  const config = readConfig(ns);
  if (config.currentWorkType === "companyWork") {
    return config.companyWork;
  }
  return undefined;
}

/**
 *
 * @param {string} job
 * @param {import("BB").SngCompanyWork} companyConfig
 * @returns
 */
function jobMatchesRequestedType(job, companyConfig) {
  return JOBS_BY_TYPE[companyConfig.jobType].includes(job);
}
