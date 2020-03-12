import { Package } from '../../Packages';
import { PackageViewType } from '../../Npm';
import { GitLog, GitFileLog } from '../../Git';
import { BACKUPABLE_OPTIONS_FIELDS } from './constants';
import { Changelog, ChangelogChanges } from '../../Changelogs';

export type ActionOptions = {
  packageNames: string[];
  listUnpublished: boolean;
  promote: boolean | string;
  backport: boolean | string;
  prerelease: boolean | string;
  exclude: string[];
  retry: boolean;
  commitMessage: string;
  skipRepoChecks: boolean;
  dry: boolean;
};

export type BackupableOptions = Pick<ActionOptions, typeof BACKUPABLE_OPTIONS_FIELDS[number]>;

export type PublishState = {
  hasUnpublishedChanges?: boolean;
  isSelectedToPublish?: boolean;
  changelogChanges?: ChangelogChanges;
  integral?: boolean;
  logs?: GitLog[];
  fileLogs?: GitFileLog[];
  releaseType?: ReleaseType;
  releaseVersion?: string | null;
};

export type PromoteState = {
  distTag?: string | null;
  versionToReplace?: string | null;
  canPromote?: boolean;
  isDegrading?: boolean;
  isSelectedToPromote?: boolean;
};

export type PackageState = PublishState & PromoteState;

export type PackageFabric<State = PackageState> = {
  // Required keys that are assigned during data preparing phase.
  pkg: Package;
  pkgView: PackageViewType | null;
  changelog: Changelog;

  // Fields defined at later steps are being stored as serializable `state` object.
  state: State;
};

export type Fabrics<State = PackageState> = PackageFabric<State>[];

export type StateBackup<State = PackageState> = {
  timestamp: number;
  actionType: ActionType;
  head: string;
  phaseIndex: number;
  options: BackupableOptions;
  state: {
    [key: string]: State;
  };
};

/**
 * Enum of possible release types. It must be in sync with `semver.ReleaseType` union options.
 */
export enum ReleaseType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
  PREMAJOR = 'premajor',
  PREMINOR = 'preminor',
  PREPATCH = 'prepatch',
  PRERELEASE = 'prerelease',
}

/**
 * Type of the action. Certain command options may affect the action type.
 */
export enum ActionType {
  PUBLISH = 'publish',
  LIST = 'list',
  PROMOTE = 'promote',
  BACKPORT = 'backport',
}

/**
 * Signature of the function being a phase of the action.
 */
export type ActionPhase = (
  fabrics: Fabrics,
  options: ActionOptions,
  actionType: ActionType
) => Promise<PhaseResult>;

/**
 * Represents the return type of each phase function.
 * Array of strings is passed as an array of paths to stage after phase is done.
 */
export type PhaseResult = string[] | void;
