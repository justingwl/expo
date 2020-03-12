import fs from 'fs-extra';
import chalk from 'chalk';
import { pick } from 'lodash';
import inquirer from 'inquirer';
import JsonFile from '@expo/json-file';
import * as jsondiffpatch from 'jsondiffpatch';

import logger from '../../Logger';
import { BACKUP_PATH, BACKUP_EXPIRATION_TIME, BACKUPABLE_OPTIONS_FIELDS } from './constants';
import { Fabrics, StateBackup, BackupableOptions, ActionType, ActionOptions } from './types';

const { cyan, magenta } = chalk;

export async function backupExistsAsync(): Promise<boolean> {
  try {
    await fs.access(BACKUP_PATH, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates backup compatibility with options passed to the command.
 */
export function isBackupValid(
  backup: StateBackup,
  actionType: ActionType,
  currentHead: string,
  options: ActionOptions
): boolean {
  if (actionType !== backup.actionType) {
    return false;
  }
  if (currentHead !== backup.head || Date.now() - backup.timestamp > BACKUP_EXPIRATION_TIME) {
    return false;
  }
  const delta = jsondiffpatch.diff(pickBackupableOptions(options), backup.options);
  return !delta;
}

/**
 * Returns command's backup if it exists and is still valid, `null` otherwise.
 * Backup is valid if current head commit hash is the same as from the time where the backup was saved,
 * and if the time difference is no longer than `BACKUP_EXPIRATION_TIME`.
 */
export async function getBackupAsync(
  actionType: ActionType,
  currentHead: string,
  options: ActionOptions
): Promise<StateBackup | null> {
  if (!(await backupExistsAsync())) {
    return null;
  }
  const backup = await JsonFile.readAsync<StateBackup>(BACKUP_PATH);

  if (!isBackupValid(backup, actionType, currentHead, options)) {
    logger.warn(
      `⚠️  Found backup file but you've run the command with different options. Continuing from scratch...\n`
    );
    return null;
  }
  if (options.retry) {
    return backup;
  }
  const { restore } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'restore',
      prefix: '❔',
      message: cyan('Found valid backup file. Would you like to use it?'),
    },
  ]);
  logger.log();
  return restore ? backup : null;
}

/**
 * Applies given backup to fabrics. Returns an index of phase at which the backup was saved.
 */
export async function restoreBackupAsync(backup: StateBackup, fabrics: Fabrics): Promise<number> {
  const dateString = new Date(backup.timestamp).toLocaleString();

  logger.info(`♻️  Restoring from backup saved on ${magenta(dateString)}...\n`);

  for (const item of fabrics) {
    const restoredState = backup.state[item.pkg.packageName];

    if (restoredState) {
      item.state = { ...item.state, ...restoredState };
    }
  }
  return backup.phaseIndex;
}

/**
 * Returns options that are capable of being backed up.
 * We will need just a few options to determine whether the backup is valid
 * and we can't pass them all because `options` is in fact commander's `Command` instance.
 */
export function pickBackupableOptions(options: ActionOptions): BackupableOptions {
  return pick(options, BACKUPABLE_OPTIONS_FIELDS);
}

/**
 * Saves backup of command's state.
 * This method is synchronous as we must be able to complete it immediately before exiting the process.
 */
export function saveBackup(
  actionType: ActionType,
  head: string,
  phaseIndex: number,
  fabrics: Fabrics,
  options: ActionOptions
) {
  const backup: StateBackup = {
    timestamp: Date.now(),
    actionType,
    head,
    phaseIndex,
    options: pickBackupableOptions(options),
    state: {},
  };

  for (const { pkg, state } of fabrics) {
    backup.state[pkg.packageName] = JSON.parse(JSON.stringify(state));
  }
  fs.outputFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2));
}

/**
 * Removes backup file.
 */
export function invalidateBackup() {
  fs.removeSync(BACKUP_PATH);
}
