import path from 'path';
import chalk from 'chalk';
import semver from 'semver';
import inquirer from 'inquirer';
import { set } from 'lodash';
import JsonFile from '@expo/json-file';
import { Command } from '@expo/commander';

import * as Npm from '../Npm';
import * as Git from '../Git';
import logger from '../Logger';
import * as Utils from '../Utils';
import * as Workspace from '../Workspace';
import * as Formatter from '../Formatter';
import * as Changelogs from '../Changelogs';
import { Package, getListOfPackagesAsync } from '../Packages';
import { EXPO_DIR, IOS_DIR } from '../Constants';

import {
  getBackupAsync,
  invalidateBackup,
  restoreBackupAsync,
  saveBackup,
} from './publish-packages/backup';
import { BACKUP_PATH, NATIVE_DIRECTORIES } from './publish-packages/constants';
import {
  findPackagesToPromoteAsync,
  selectPackagesToPromoteAsync,
  promotePackagesAsync,
} from './publish-packages/promoting';
import {
  ActionOptions,
  ActionPhase,
  ActionType,
  Fabrics,
  PackageFabric,
  PackageState,
  PhaseResult,
  ReleaseType,
} from './publish-packages/types';

const { green, yellow, cyan, blue, magenta, gray, reset } = chalk;

/**
 * An object with actions defined for each ActionType value.
 */
const ACTION_PHASES: { [key in ActionType]: ActionPhase[] } = {
  [ActionType.PUBLISH]: [
    checkPackagesIntegrityAsync,
    findUnpublishedPackagesAsync,
    // findDependantPackagesAsync,
    selectPackagesToPublishAsync,
    updateVersionsAsync,
    updateBundledNativeModulesFileAsync,
    updateWorkspaceDependenciesAsync,
    updateAndroidProjectsAsync,
    updateIosProjectsAsync,
    cutOffChangelogsAsync,
    commitChangesAsync,
    publishPackagesAsync,
  ],
  [ActionType.LIST]: [findUnpublishedPackagesAsync, listUnpublishedPackages],
  [ActionType.PROMOTE]: [
    findPackagesToPromoteAsync,
    selectPackagesToPromoteAsync,
    promotePackagesAsync,
  ],
  [ActionType.BACKPORT]: [],
};

/**
 * Checks whether the command is run on master branch.
 * Otherwise, it prompts to confirm that you know what you're doing.
 */
async function checkBranchNameAsync(): Promise<boolean> {
  const branchName = await Git.getCurrentBranchNameAsync();

  // Publishes can be run on `master` or package's side-branches like `expo-package/1.x.x`
  if (branchName === 'master' || /^[\w\-@]+\/\d+\.(x\.x|\d+\.x)$/.test(branchName)) {
    return true;
  }

  logger.warn(
    `⚠️  It's recommended to publish from ${blue('master')} branch, while you're at ${blue(
      branchName
    )}`
  );

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      prefix: yellow('⚠️ '),
      message: yellow(`Do you want to proceed?`),
      default: true,
    },
  ]);
  logger.log();
  return confirmed;
}

async function checkRepositoryStatusAsync(
  actionType: ActionType,
  options: ActionOptions
): Promise<boolean> {
  const actionCanSkipChecks = [ActionType.LIST, ActionType.PROMOTE].includes(actionType);

  if (actionCanSkipChecks || options.skipRepoChecks) {
    return true;
  }

  if (!(await checkBranchNameAsync())) {
    return false;
  }

  if (await Git.hasUnstagedChangesAsync()) {
    logger.error(`🚫 Repository contains unstaged changes, please make sure to have it clear.\n`);
    return false;
  }
  return true;
}

/**
 * Gets a list of public packages in the monorepo, downloads `npm view` result of them,
 * creates their Changelog instance and fills given fabrics array (it's empty at the beginning).
 */
async function preparePackageFabricsAsync(options: ActionOptions): Promise<Fabrics> {
  logger.info('🔎 Gathering data about packages...\n');

  const { exclude, packageNames } = options;
  const packages = (await getListOfPackagesAsync()).filter(pkg => {
    const isPrivate = pkg.packageJson.private;
    const isScoped = packageNames.length === 0 || packageNames.includes(pkg.packageName);
    const isExcluded = exclude.includes(pkg.packageName);
    return !isPrivate && isScoped && !isExcluded;
  });

  const fabrics = await Promise.all(
    packages.map(
      async (pkg: Package): Promise<PackageFabric> => {
        const pkgView = await Npm.getPackageViewAsync(pkg.packageName, pkg.packageVersion);
        const changelog = Changelogs.loadFrom(pkg.changelogPath);
        const state = {};

        return { pkg, pkgView, changelog, state };
      }
    )
  );
  return fabrics;
}

/**
 * Checks packages integrity - package is integral if `gitHead` in `package.json` matches `gitHead`
 * of the package published under current version specified in `package.json`.
 */
async function checkPackagesIntegrityAsync(fabrics: Fabrics): Promise<void> {
  logger.info('👁  Checking packages integrity...');

  for (const { pkg, pkgView, changelog, state } of fabrics) {
    if (!pkgView) {
      // If no package view, then the package hasn't been released yet - no need to check integrity.
      state.integral = true;
      continue;
    }

    const gitHead = pkg.packageJson.gitHead;
    const lastVersionInChangelog = await changelog.getLastPublishedVersionAsync();

    const gitHeadMatches = pkg.packageJson.gitHead === pkgView.gitHead;
    const versionMatches = !lastVersionInChangelog || pkgView.version === lastVersionInChangelog;

    state.integral = gitHeadMatches && versionMatches;

    if (state.integral) {
      // Checks passed.
      continue;
    }

    logger.warn(`Package integrity check failed for ${green(pkg.packageName)}.`);

    if (gitHead && !gitHeadMatches) {
      logger.warn(
        `Package head (${green(gitHead)}) doesn't match published head (${green(pkgView.gitHead)}`
      );
    }
    if (lastVersionInChangelog && !versionMatches) {
      logger.warn(
        `Package version (${cyan(
          pkg.packageVersion
        )}) doesn't match last version in its changelog (${cyan(lastVersionInChangelog)})`
      );
    }
  }
}

/**
 * Finds unpublished packages. Package is considered unpublished if there are
 * any new commits or changelog entries prior to previous publish on the current branch.
 */
async function findUnpublishedPackagesAsync(
  fabrics: Fabrics,
  options: ActionOptions
): Promise<void> {
  logger.info('👀 Searching for packages with unpublished changes...');

  const prerelease = options.prerelease === true ? 'rc' : options.prerelease || undefined;

  for (const { pkg, changelog, state } of fabrics) {
    const changelogChanges = await changelog.getChangesAsync();
    const logs = await Git.logAsync(pkg.path, {
      fromCommit: pkg.packageJson.gitHead,
      toCommit: 'head',
    });

    const fileLogs = await Git.logFilesAsync(pkg.path, {
      fromCommit: logs[logs.length - 1]?.hash,
      toCommit: logs[0]?.hash,
    });

    // Remove last commit from logs if `gitHead` is present.
    // @tsapeta: Actually we should check whether last's commit parent is equal to `gitHead`,
    // but that wasn't true prior to publish-packages v2 - let's add it later.
    if (pkg.packageJson.gitHead) {
      logs.pop();
    }

    state.logs = logs;
    state.fileLogs = fileLogs;
    state.changelogChanges = changelogChanges;
    state.hasUnpublishedChanges = logs.length > 0 || changelogChanges.totalCount > 0;
    state.releaseType = getSuggestedReleaseType(
      pkg.packageVersion,
      fileLogs,
      changelogChanges,
      prerelease
    );
    state.releaseVersion = semver.inc(pkg.packageVersion, state.releaseType, prerelease);

    if (!state.releaseType || !state.releaseVersion) {
      // @tsapeta: throw an error?
      continue;
    }
  }

  if (fabrics.filter(({ state }) => state.hasUnpublishedChanges).length === 0) {
    logger.log(green('\n✅ All packages are up-to-date.'));

    // Remove backup file and exit process safely.
    invalidateBackup();
    process.exit(0);
  }
}

/**
 * Lists packages that have any unpublished changes.
 */
async function listUnpublishedPackages(fabrics: Fabrics): Promise<void> {
  const unpublished = fabrics.filter(({ state }) => state.hasUnpublishedChanges);

  logger.info('🧩 Unpublished packages:\n');
  unpublished.forEach(fabric => printPackageFabric(fabric.pkg, fabric.state));
}

/**
 * Prints gathered crucial informations about the package.
 */
function printPackageFabric(pkg: Package, state: PackageState) {
  const { logs, fileLogs, changelogChanges, releaseType } = state;

  logger.log(
    '📦',
    green.bold(pkg.packageName),
    `has some changes since ${cyan.bold(pkg.packageVersion)}`
  );

  logger.log(yellow(' >'), magenta.bold('New commits:'));

  // eslint-disable-next-line no-unused-expressions
  logs?.forEach(log => {
    logger.log(yellow('   -'), Formatter.formatCommitLog(log));
  });

  const unpublishedChanges = changelogChanges?.versions.unpublished ?? {};

  for (const changeType in unpublishedChanges) {
    const changes = unpublishedChanges[changeType];

    if (changes.length > 0) {
      logger.log(yellow(' >'), magenta.bold(`${Formatter.stripNonAsciiChars(changeType).trim()}:`));

      for (const change of unpublishedChanges[changeType]) {
        logger.log(yellow('   -'), Formatter.formatChangelogEntry(change));
      }
    }
  }

  if (fileLogs?.length) {
    logger.log(yellow(' >'), magenta.bold('File changes:'));

    // eslint-disable-next-line no-unused-expressions
    fileLogs?.forEach(fileLog => {
      logger.log(yellow('   -'), Formatter.formatFileLog(fileLog));
    });
  }

  if (releaseType) {
    const version = pkg.packageVersion;
    const suggestedVersion = semver.inc(version, releaseType);

    logger.log(
      yellow(' >'),
      magenta.bold(
        `Suggested ${cyan(releaseType)} upgrade from ${cyan(version)} to ${cyan(suggestedVersion!)}`
      )
    );
  }

  logger.log();
}

function getSuggestedReleaseType(
  currentVersion: string,
  fileLogs?: Git.GitFileLog[],
  changelogChanges?: Changelogs.ChangelogChanges,
  prerelease?: string
): ReleaseType {
  if (semver.prerelease(currentVersion)) {
    return ReleaseType.PRERELEASE;
  }
  const unpublishedChanges = changelogChanges?.versions.unpublished;
  const hasBreakingChanges = unpublishedChanges?.[Changelogs.ChangeType.BREAKING_CHANGES]?.length;
  const hasNativeChanges = fileLogs && fileLogsContainNativeChanges(fileLogs);

  const releaseType = hasBreakingChanges
    ? ReleaseType.MAJOR
    : hasNativeChanges
    ? ReleaseType.MINOR
    : ReleaseType.PATCH;

  if (prerelease) {
    return ('pre' + releaseType) as ReleaseType;
  }
  return releaseType;
}

function fileLogsContainNativeChanges(fileLogs: Git.GitFileLog[]): boolean {
  return fileLogs.some(fileLog => {
    return NATIVE_DIRECTORIES.some(dir => fileLog.relativePath.startsWith(`${dir}/`));
  });
}

async function findDependantPackagesAsync(fabrics: Fabrics): Promise<void> {
  // nothing yet
}

/**
 * Prompts which suggested packages are going to be published.
 */
async function selectPackagesToPublishAsync(fabrics: Fabrics): Promise<void> {
  const unpublished = fabrics.filter(({ state }) => state.hasUnpublishedChanges);

  logger.info('👉 Selecting packages to publish...\n');

  for (const { pkg, state } of unpublished) {
    printPackageFabric(pkg, state);

    const { selected } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'selected',
        prefix: '❔',
        message: `Do you want to publish ${green.bold(pkg.packageName)} as version ${cyan.bold(
          state.releaseVersion!
        )}?`,
        default: true,
      },
    ]);
    logger.log();

    state.isSelectedToPublish = selected;
  }

  if (unpublished.filter(({ state }) => state.isSelectedToPublish).length === 0) {
    logger.log(green('\n🤷‍♂️ There is nothing chosen to be published.'));

    // Remove backup file and exit process safely.
    invalidateBackup();
    process.exit(0);
  }
}

/**
 * Updates versions in packages selected to be published.
 */
async function updateVersionsAsync(fabrics: Fabrics): Promise<PhaseResult> {
  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  for (const { pkg, state } of toPublish) {
    const gitHead = state.logs?.[0]?.hash ?? pkg.packageJson.gitHead;

    if (!gitHead || !state.releaseVersion) {
      // TODO: do it better
      continue;
    }

    // Make a deep clone of `package.json` - `pkg.packageJson` should stay immutable.
    const packageJson = Utils.deepCloneObject(pkg.packageJson);

    logger.info(
      `📦 Updating ${magenta.bold('package.json')} in ${green.bold(pkg.packageName)} with...`
    );

    const update = {
      version: state.releaseVersion,
      gitHead,
    };

    for (const key in update) {
      logger.log(yellow(' >'), `${yellow.bold(key)}: ${cyan.bold(update[key])}`);
      set(packageJson, key, update[key]);
    }

    // Saving new contents of `package.json`.
    await JsonFile.writeAsync(path.join(pkg.path, 'package.json'), packageJson);

    logger.log();
  }
  return ['packages/**/package.json'];
}

/**
 * Updates `bundledNativeModules.json` file in `expo` package.
 * It's used internally by some `expo-cli` commands so we know which package versions are compatible with `expo` version.
 */
async function updateBundledNativeModulesFileAsync(fabrics: Fabrics): Promise<PhaseResult> {
  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  if (toPublish.length === 0) {
    return;
  }

  const bundledNativeModulesPath = path.join(EXPO_DIR, 'packages/expo/bundledNativeModules.json');
  const bundledNativeModules = await JsonFile.readAsync<{ [key: string]: string }>(
    bundledNativeModulesPath
  );

  logger.info(`✏️  Updating ${magenta.bold('bundledNativeModules.json')} file...`);

  for (const { pkg, state } of toPublish) {
    const currentRange = bundledNativeModules[pkg.packageName];
    const newRange = `~${state.releaseVersion}`;

    logger.log(
      yellow(' >'),
      `${green.bold(pkg.packageName)}: ${cyan.bold(currentRange)} -> ${cyan.bold(newRange)}`
    );

    bundledNativeModules[pkg.packageName] = newRange;
  }
  await JsonFile.writeAsync(bundledNativeModulesPath, bundledNativeModules);
  return [bundledNativeModulesPath];
}

/**
 * Updates versions of packages to be published in other workspace projects depending on them.
 */
async function updateWorkspaceDependenciesAsync(fabrics: Fabrics): Promise<void> {
  const workspaceInfo = await Workspace.getInfoAsync();
  logger.info('📤 Updating workspace projects...');
}

async function updateAndroidProjectsAsync(fabrics: Fabrics): Promise<PhaseResult> {
  logger.info('🤖 Updating Android projects...');

  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  for (const { pkg, state } of toPublish) {
    const buildGradlePath = path.relative(EXPO_DIR, path.join(pkg.path, 'android/build.gradle'));

    logger.log(
      yellow(' >'),
      `Updating ${yellow('version')} and ${yellow('versionCode')} in ${magenta(buildGradlePath)}`
    );

    await Utils.transformFileAsync(path.join(EXPO_DIR, buildGradlePath), [
      {
        // update version and versionName in android/build.gradle
        pattern: /\b(version\s*=\s*|versionName\s+)(['"])(.*?)\2/g,
        replaceWith: `$1$2${state.releaseVersion}$2`,
      },
      {
        pattern: /\bversionCode\s+(\d+)\b/g,
        replaceWith: (match, p1) => {
          const versionCode = parseInt(p1, 10);
          return `versionCode ${versionCode + 1}`;
        },
      },
    ]);
  }
  return ['packages/**/android/build.gradle'];
}

async function updateIosProjectsAsync(fabrics: Fabrics): Promise<PhaseResult> {
  logger.info('🍎 Updating iOS projects...');

  const podspecNames = fabrics
    .filter(
      ({ pkg, state }) =>
        state.isSelectedToPublish && pkg.podspecName && pkg.isIncludedInExpoClientOnPlatform('ios')
    )
    .map(({ pkg }) => pkg.podspecName) as string[];

  if (podspecNames.length === 0) {
    logger.log(yellow(' >'), 'No iOS pods to update.\n');
    return;
  }

  logger.log(yellow(' >'), 'Updating pods:', podspecNames.map(name => green(name)).join(', '));

  await Utils.spawnAsync('pod', ['update', ...podspecNames, '--no-repo-update'], {
    cwd: IOS_DIR,
    env: process.env,
  });
  return ['ios/Pods', 'ios/Podfile.lock'];
}

/**
 * Cuts off changelogs - renames unpublished section heading
 * to the new version and adds new unpublished section on top.
 */
async function cutOffChangelogsAsync(fabrics: Fabrics): Promise<PhaseResult> {
  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  if (toPublish.length === 0) {
    return;
  }

  logger.info('✂️  Cutting off changelogs...');

  for (const { pkg, changelog, state } of toPublish) {
    if (state.releaseVersion && !semver.prerelease(state.releaseVersion)) {
      logger.log(yellow(' >'), green.bold(pkg.packageName) + '...');
      await changelog.cutOffAsync(state.releaseVersion);
    } else {
      logger.log(
        yellow(' >'),
        gray(`Skipped ${green.bold(pkg.packageVersion)}, because it's a prerelease version.`)
      );
    }
  }
  return ['packages/**/CHANGELOG.md'];
}

async function commitChangesAsync(fabrics: Fabrics, options: ActionOptions): Promise<void> {
  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  logger.info('📼 Committing changes...');

  const commitDescription = toPublish
    .map(({ pkg, state }) => `${pkg.packageName}@${state.releaseVersion}`)
    .join('\n');

  await Git.commitAsync(EXPO_DIR, [options.commitMessage, commitDescription]);
}

async function publishPackagesAsync(fabrics: Fabrics): Promise<void> {
  const toPublish = fabrics.filter(({ state }) => state.isSelectedToPublish);

  if (toPublish.length === 0) {
    return;
  }

  logger.info('🚀 Publishing packages...');
}

/**
 * Returns ActionType value based on provided command options.
 */
function actionTypeForOptions(options: ActionOptions): ActionType {
  if (options.listUnpublished) {
    return ActionType.LIST;
  }
  if (options.promote) {
    return ActionType.PROMOTE;
  }
  if (options.backport) {
    return ActionType.BACKPORT;
  }
  return ActionType.PUBLISH;
}

/**
 * Method that goes through given action phases and handles restoring and saving action state.
 */
async function runActionAsync(
  actionType: ActionType,
  fabrics: Fabrics,
  options: ActionOptions,
  phases: ActionPhase[]
): Promise<void> {
  const headCommitHash = await Git.getHeadCommitHashAsync();
  const backup = await getBackupAsync(actionType, headCommitHash, options);

  let phaseIndex = 0;

  if (backup) {
    phaseIndex = await restoreBackupAsync(backup, fabrics);
  }

  for (; phaseIndex < phases.length; phaseIndex++) {
    try {
      const pathsToStage = await phases[phaseIndex](fabrics, options, actionType);

      if (pathsToStage && pathsToStage.length > 0) {
        await Git.addFilesAsync(pathsToStage);
      }
    } catch (error) {
      logger.error();
      logger.error(`💥 Command failed at phase ${cyan(phaseIndex + '/' + (phases.length - 1))}.`);
      logger.error('💥 Error message:', reset(error.stack.replace(/^Error:\s*/, '')));
      error.stderr && logger.error('💥 Standard error output:\n', reset(error.stderr));
      process.exit(1);
    }

    // Print new line after each phase.
    logger.log();

    // Make a backup after each successful phase.
    saveBackup(actionType, headCommitHash, phaseIndex, fabrics, options);
  }
  invalidateBackup();
  process.exit(0);
}

/**
 * Main action of the command.
 */
async function main(packageNames: string[], options: ActionOptions): Promise<void> {
  // Commander doesn't put arguments to options object, let's add it for convenience. In fact, this is an option.
  options.packageNames = packageNames;

  const actionType = actionTypeForOptions(options);
  const phases = ACTION_PHASES[actionType];

  if (!(await checkRepositoryStatusAsync(actionType, options))) {
    return;
  }

  if (phases) {
    const fabrics = await preparePackageFabricsAsync(options);
    await runActionAsync(actionType, fabrics, options, phases);
  }
}

export default (program: Command) => {
  program
    .command('publish-packages [packageNames...]')
    .alias('pub-pkg', 'publish', 'pp')
    .option(
      '-l, --list-unpublished',
      'Lists packages with unpublished changes since the previous version.',
      false
    )
    .option(
      '-p, --promote [promote]',
      'Promotes packages from one tag to another. Defaults to `next` if value is not provided.',
      false
    )
    .option(
      '-b, --backport <version>',
      'Creates a new branch for backporting changes to the single package from given package version.',
      false
    )
    .option(
      '-i, --prerelease [prereleaseIdentifier]',
      'If used, suggested release type will be a prerelease with given prerelease identifier or `rc` if value is not provided.',
      false
    )
    .option(
      '-e, --exclude <packageName>',
      'Name of the package to be excluded from publish. Can be passed multiple times to exclude more than one package. It has higher priority than `scope` flag.',
      (value, previous) => previous.concat(value),
      []
    )
    .option(
      '-r, --retry',
      `Retries previous call from the state saved before the phase at which the process has stopped. Some other options and arguments must stay the same.`,
      false
    )
    .option(
      '-m, --commit-message <commitMessage>',
      'Customizes publish commit message.',
      'Publish packages'
    )
    .option(
      '--skip-repo-checks',
      'Skips checking whether the command is run on master branch and there are no unstaged changes.',
      false
    )
    .option(
      '-d, --dry',
      'Whether to skip `npm publish` command. Despite this, some files might be changed after running this script.',
      false
    )
    .description(
      // prettier-ignore
      `This script publishes packages within the monorepo and takes care of bumping version numbers,
updating other workspace projects, committing and pushing changes to remote repo.

As it's prone to errors due to its complexity and the fact it sometimes may take some time, we made it stateful.
It's been splitted into a few phases after each a backup is saved under ${magenta.bold(path.relative(EXPO_DIR, BACKUP_PATH))} file
and all file changes it made are added to Git's index as part of the backup. Due to its stateful nature,
your local repo must be clear (without unstaged changes) and you shouldn't make any changes in the repo when the command is running.

In case of any errors or mistakes you can always go back to the previous phase with ${magenta.italic('--retry')} flag,
but remember to leave staged changes as they were because they're also part of the backup.`
    )
    .asyncAction(main);
};
