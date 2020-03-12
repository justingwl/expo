import path from 'path';

import * as Utils from './Utils';

export type GitLogOptions = {
  fromCommit?: string;
  toCommit?: string;
  paths?: string[];
};

export type GitLog = {
  hash: string;
  parent: string;
  title: string;
  authorName: string;
  committerRelativeDate: string;
};

export type GitFileLog = {
  path: string;
  relativePath: string;
  status: GitFileStatus;
};

export enum GitFileStatus {
  M = 'modified',
  C = 'copy',
  R = 'rename',
  A = 'added',
  D = 'deleted',
  U = 'unmerged',
}

/**
 * Returns repository's branch name that you're checked out.
 */
export async function getCurrentBranchNameAsync(): Promise<string> {
  const { stdout } = await Utils.spawnAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return stdout.replace(/\n+$/, '');
}

/**
 * Tries to deduce the SDK version from branch name. Returns null if the branch name is not a release branch.
 */
export async function getSDKVersionFromBranchNameAsync(): Promise<string | null> {
  const currentBranch = await getCurrentBranchNameAsync();
  const match = currentBranch.match(/\bsdk-(\d+)$/);

  if (match) {
    const sdkMajorNumber = match[1];
    return `${sdkMajorNumber}.0.0`;
  }
  return null;
}

/**
 * Returns full head commit hash.
 */
export async function getHeadCommitHashAsync(): Promise<string> {
  const { stdout } = await Utils.spawnAsync('git', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

/**
 * Returns formatted results of `git log` command.
 */
export async function logAsync(cwd: string, options: GitLogOptions = {}): Promise<GitLog[]> {
  const fromCommit = options.fromCommit ?? '';
  const toCommit = options.toCommit ?? 'head';
  const paths = options.paths ?? ['.'];

  const template = {
    hash: '%H',
    parent: '%P',
    title: '%s',
    authorName: '%aN',
    committerRelativeDate: '%cr',
  };

  // We use random \u200b character (zero-width space) instead of double quotes
  // because we need to know which quotes to escape before we pass it to `JSON.parse`.
  // Otherwise, double quotes in commits message would cause this function to throw JSON exceptions.
  const format =
    ',{' +
    Object.entries(template)
      .map(([key, value]) => `\u200b${key}\u200b:\u200b${value}\u200b`)
      .join(',') +
    '}';

  const { stdout } = await Utils.spawnAsync(
    'git',
    ['log', `--pretty=format:${format}`, `${fromCommit}..${toCommit}`, '--', ...paths],
    { cwd }
  );

  // Remove comma at the beginning, escape double quotes and replace \u200b with unescaped double quotes.
  const jsonItemsString = stdout
    .slice(1)
    .replace(/"/g, '\\"')
    .replace(/\u200b/gu, '"');

  return JSON.parse(`[${jsonItemsString}]`);
}

export async function logFilesAsync(cwd: string, options: GitLogOptions): Promise<GitFileLog[]> {
  const fromCommit = options.fromCommit ?? '';
  const toCommit = options.toCommit ?? 'head';

  // This diff command returns a list of relative paths of files that have changed preceded by their status.
  // Status is just a letter, which is also a key of `GitFileStatus` enum.
  const { stdout } = await Utils.spawnAsync(
    'git',
    ['diff', '--name-status', `${fromCommit}..${toCommit}`, '--relative', '--', '.'],
    { cwd }
  );

  return stdout
    .split(/\n/g)
    .filter(Boolean)
    .map(line => {
      const [status, relativePath] = line.split(/\s+/);

      return {
        relativePath,
        path: path.join(cwd, relativePath),
        status: GitFileStatus[status],
      };
    });
}

/**
 * Simply spawns `git add` for given glob path patterns.
 */
export async function addFilesAsync(paths: string[], options?: object): Promise<void> {
  await Utils.spawnAsync('git', ['add', '--', ...paths], options);
}

/**
 * Commits staged changes with given message.
 */
export async function commitAsync(cwd: string, message: string | string[]): Promise<void> {
  const messages = Array.isArray(message) ? message : [message];
  const args = ['commit'].concat(...messages.map(message => ['--message', message]));

  await Utils.spawnAsync('git', args, { cwd });
}

/**
 * Resolves to boolean value meaning whether the repository contains any unstaged changes.
 */
export async function hasUnstagedChangesAsync(paths: string[] = []): Promise<boolean> {
  try {
    await Utils.spawnAsync('git', ['diff', '--quiet', '--', ...paths]);
    return false;
  } catch (error) {
    return true;
  }
}
