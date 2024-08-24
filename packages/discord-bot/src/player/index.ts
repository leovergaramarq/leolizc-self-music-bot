import { Module } from '../core';
import { clearCommand } from './commands/clear';
import { disconnectCommand } from './commands/disconnect';
import { moveCommand } from './commands/move';
import { nextCommand } from './commands/next';
import { pauseCommand } from './commands/pause';
import { playCommand } from './commands/play';
import { playlistCommand } from './commands/playlist';
import { queueCommand } from './commands/queue';
import { removeCommand } from './commands/remove';
import { resumeCommand } from './commands/resume';
import { shuffleCommand } from './commands/shuffle';

export const playerModule = new Module('reproductor', [
  clearCommand,
  playCommand,
  disconnectCommand,
  moveCommand,
  nextCommand,
  playlistCommand,
  shuffleCommand,
  pauseCommand,
  resumeCommand,
  removeCommand,
  queueCommand,
]);
