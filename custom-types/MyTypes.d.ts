export interface ServerBudget {
  availableRam: number;
  scheduledTasks: ScheduledTask[];
}

export interface ScheduleRequest {
  id: string;
  script: string;
  threads: number;
  sourceHost: string;
  type: string;
  requestTime: Date;
  estimatedRunTime: number;
  args?: any[];
  attributes?: any;
  owner?: string;
}

export interface RunningJob {
  startTime?: Date;
  endTime?: Date;
  requestTime: Date;
  tasks: ScheduledTask[];
  requestedThreads: number;
  remainingThreads: number;
  status: TaskStatus | string;
  sourceHost: string;
  args?: any[];
  script: string;
  type?: string;
  estimatedRunTime?: number;
  attributes?: any;
  lastUpdated: Date;
}

declare enum TaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export interface ScheduleResponse {
  id: string;
  tasks: ScheduledTask[];
  /** The status of the schedule request. Either PENDING, RUNNING, or COMPLETE */
  status: TaskStatus | string;
  lastUpdated: Date;
  runningThreads: number;
  requestedThreads: number;
  completedThreads: number;
  attributes?: any;
  type?: string;
}

export interface ScheduledTask {
  runningHost?: string;
  pid?: number;
  args?: any[];
  script: string;
  threads: number;
  status: TaskStatus | string;
  ramUsage: number;
  startTime: Date;
  endTime?: Date;
  estimatedEndTime?: Date;
}

export interface ScheduleTaskRequest {
  id?: string;
  script: string;
  threads: number;
  type?: string;
  args?: any[];
  attributes?: any;
  owner?: string;
  sourceHost?: string;
  daemon?: boolean;
}

export interface RunningJobs {
  [key: number]: RunningJob;
}

export interface CompletedTask {
  pid: number;
  hostName: string;
  endTime: Date;
  jobId: number;
  completionType: "COMPLETED | ORPHANED";
  prune: boolean;
}

export interface HackJobMap {
  [key: string]: HackEntry;
}

export interface HackEntry {
  hackSkill: number;
  hack: HackJob;
  grow: HackJob;
  weaken: HackJob;
}

export interface HackJob {
  pendingThreads: number;
  runningThreads: number;
  jobs: {
    [key: string]: number;
  };
}

export interface TaskCompletion {
  pid: number;
  endTime: Date;
  hostName: string;
  jobId: string;
  completionType: string | "COMPLETED" | "ORPHANED" | "FAILED";
  prune: boolean;
}

declare enum SngWorkType {
  COMPANY = "companyWork",
  FACTION = "factionWork",
  CRIME = "crimeWork",
  NONE = "none",
}

export interface SngCompanyWork {
  companyName: string;
  jobType: string;
  fallback: SngWorkType;
  workUntilFactionJoin: boolean;
  focus: boolean;
}

export interface SngFactionWork {
  factionName: string;
  jobType: string;
  focus: boolean;
}

export interface SngCrimeWork {
  crimeName: string;
  focus: boolean;
}

export interface SingularityConfig {
  currentWorkType: SngWorkType;
  companyWork: SngCompanyWork;
  factionWork: SngFactionWork;
  crimeWork: SngCrimeWork;
  factionAlwaysJoin: string[];
  destroyBitNode: boolean;
  backdoorTargets: string[];
}

export interface AugmentDefinition {
 [key: string]: AugmentDetail;
}

export interface AugmentDetail {
  /** Rep cost to purchase augment */
  repCost: number;
  /** Money cost to purchase augment */
  moneyCost: number;
  /**
   * Company reputation increase
   */
  company_rep: number;
  /** Faction reputation increase */
  faction_rep: number;
  /** Factions associated with the augment */
  factions: string[] | string;
  /** Hacking speed increase*/
  hacking_speed: number;
  /** Hacking money increase */
  hacking_money: number;
  /** Hacking skill increase */
  hacking: number;
  /** Hacking chance increase */
  hacking_chance: number;
  /** Hacking experience increase */
  hacking_exp: number;
  /** Description of the augment */
  stats: string;
  /** ??? */
  isSpecial: boolean;
  /**
   * Strength increase
   */
  strength: number;
  /** 
   * Defense increase
   */
  defense: number;
  /** 
   * Dexterity increase
   */
  dexterity: number;
  /** 
   * Agility increase
   */
  agility: number;
  /** 
   * Charisma increase
   */
  charisma: number;
  /** 
   * Strength experience increase
   */
  strength_exp: number;
  /** 
   * Defense experience increase
   */
  defense_exp: number;
  /** 
   * Dexterity experience increase
   */
  dexterity_exp: number;
  /** 
   * Agility experience increase
   */
  agility_exp: number;
  /** 
   * Charisma experience increase
   */
  charisma_exp: number;
  /** 
   * Hack grow increase
   */
  hacking_grow: number;
  /** Crime money increase */
  crime_money: number;
  /** Crime success rate increase */
  crime_success: number;
  /** Work money increase */
  work_money: number;
  /** Hacknet node money increase */
  hacknet_node_money: number;
  /** Hacknet node purchase cost decrease */
  hacknet_node_ram_cost: number;
  /** Hacknet node purchase cost decrease */
  hacknet_node_core_cost: number;
  /** Hacknet node purchase cost decrease */
  hacknet_node_level_cost: number;
  bladeburner_max_stamina: number;
  bladeburner_stamina_gain: number;
  bladeburner_analysis: number;
  bladeburner_success_chance: number;
  /** Increase starting money */
  startingMoney: number;
  /** Pre-requisites for the augment */
  prereqs: string | string[];
  /** Programs granted by the augment */
  programs: string[];
}

export type PurchaseableAugment = {
  factions: string[];
  name: string;
  price: number;
  repRequirement: number;
}