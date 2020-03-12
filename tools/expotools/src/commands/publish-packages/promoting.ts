import chalk from 'chalk';
import semver from 'semver';
import readline from 'readline';
import inquirer from 'inquirer';
import stripAnsi from 'strip-ansi';

import * as Npm from '../../Npm';
import logger from '../../Logger';
import { invalidateBackup } from './backup';
import { ActionOptions, Fabrics, PromoteState } from './types';

const { green, yellow, cyan, red } = chalk;

function distTagForVersion(distTags: { [tag: string]: string }, version: string): string | null {
  for (const tag in distTags) {
    if (distTags[tag] === version) {
      return tag;
    }
  }
  return null;
}

function tagFromOptions(options: ActionOptions): string {
  return typeof options.promote === 'string' ? options.promote : 'latest';
}

export async function findPackagesToPromoteAsync(
  fabrics: Fabrics<PromoteState>,
  options: ActionOptions
): Promise<void> {
  logger.info('👀 Searching for packages to promote...');

  const targetTag = tagFromOptions(options);

  for (const { pkg, pkgView, state } of fabrics) {
    const distTags = pkgView?.['dist-tags'] ?? {};
    const currentVersion = pkg.packageVersion;
    const currentDistTag = distTagForVersion(distTags, currentVersion);
    const versionToReplace = distTags?.[targetTag] ?? null;

    state.distTag = currentDistTag;
    state.versionToReplace = versionToReplace;
    state.canPromote = pkgView ? !!state.distTag && state.distTag !== targetTag : false;
    state.isDegrading = versionToReplace ? semver.lt(currentVersion, versionToReplace) : false;
  }
  if (fabrics.filter(({ state }) => state.canPromote).length === 0) {
    logger.success('\n✅ No packages to promote.\n');
    invalidateBackup();
    process.exit(0);
  }
}

/**
 * Prompts the user to select packages to promote.
 * Packages whose the current version is not assigned to any tags are skipped.
 */
export async function selectPackagesToPromoteAsync(
  fabrics: Fabrics<PromoteState>,
  options: ActionOptions
): Promise<void> {
  logger.info('👉 Selecting packages to promote...\n');

  const targetTag = tagFromOptions(options);
  const toPromote = fabrics.filter(({ state }) => state.canPromote);
  const maxLength = toPromote.reduce((acc, { pkg }) => Math.max(acc, pkg.packageName.length), 0);

  const choices = toPromote.map(({ pkg, state }) => {
    const from = cyan.bold(pkg.packageVersion);
    const to = `${yellow(targetTag)} (${cyan.bold(state.versionToReplace ?? 'none')})`;
    const actionStr = state.isDegrading ? red.bold('degrading') : 'promoting';

    return {
      name: `${green(pkg.packageName.padEnd(maxLength))} ${actionStr} ${from} to ${to}`,
      value: pkg.packageName,
      checked: !state.isDegrading,
    };
  });

  const { selectedPackageNames } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackageNames',
      message: 'Which packages do you want to promote?\n',
      choices: [
        // Choices unchecked by default (these being degraded) should be on top.
        // We could sort them, but JS sorting algorithm is unstable :/
        ...choices.filter(choice => !choice.checked),
        ...choices.filter(choice => choice.checked),
      ],
      pageSize: Math.min(15, process.stdout.rows ?? 15),
    },
  ]);

  // Inquirer shows all those selected choices by name and that looks so ugly due to line wrapping.
  // If possible, we clear everything that has been printed after the prompt.
  if (process.stdout.columns) {
    const bufferLength = choices.reduce(
      (acc, choice) => acc + stripAnsi(choice.name).length + 2,
      0
    );
    readline.moveCursor(process.stdout, 0, -Math.ceil(bufferLength / process.stdout.columns));
    readline.clearScreenDown(process.stdout);
  }

  logger.log(yellow(' >'), `Selected ${cyan(selectedPackageNames.length)} packages to promote.`);

  for (const { pkg, state } of fabrics) {
    state.isSelectedToPromote = selectedPackageNames.includes(pkg.packageName);
  }
}

/**
 * Promotes selected packages from the current tag to the tag passed as an option.
 */
export async function promotePackagesAsync(
  fabrics: Fabrics<PromoteState>,
  options: ActionOptions
): Promise<void> {
  const toPromote = fabrics.filter(({ state }) => state.isSelectedToPromote);
  const targetTag = tagFromOptions(options);

  logger.info(`🚀 Promoting packages to ${yellow(targetTag)} tag...`);

  for (const { pkg, state } of toPromote) {
    const currentVersion = pkg.packageVersion;

    logger.log(yellow(' >'), green.bold(pkg.packageName));
    logger.log(yellow('  -'), `Setting ${cyan(currentVersion)} as ${yellow(targetTag)}`);

    await Npm.addTagAsync(pkg.packageName, pkg.packageVersion, targetTag);

    // If the current version had any tag assigned, can we remove this old tag?
    if (state.distTag) {
      logger.log(
        yellow('  -'),
        `Dropping ${yellow(state.distTag)} tag (${cyan(currentVersion)})...`
      );
      await Npm.removeTagAsync(pkg.packageName, state.distTag);
    }
  }

  logger.success(`\n✅ Successfully promoted ${cyan(toPromote.length + '')} packages.`);
}
