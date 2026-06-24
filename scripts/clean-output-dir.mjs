#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const allowedDirs = new Set(['build', 'dist']);
const target = process.argv[2];

if (!allowedDirs.has(target)) {
  throw new Error(`Refusing to clean unexpected output directory: ${target ?? '(empty)'}`);
}

await fs.rm(path.resolve(target), { recursive: true, force: true });
