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
