#!/usr/bin/env node

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const distDir = join(process.cwd(), 'dist');

console.log('Building superSpec...\n');

// Clean dist directory
if (existsSync(distDir)) {
  console.log('Cleaning dist directory...');
  rmSync(distDir, { recursive: true, force: true });
}

// Create dist directory
console.log('Creating dist directory...');
mkdirSync(distDir, { recursive: true });

// Run TypeScript compiler
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('\nBuild completed successfully!');
} catch (error) {
  console.error('\nBuild failed!');
  console.error(error.message);
  process.exit(1);
}
