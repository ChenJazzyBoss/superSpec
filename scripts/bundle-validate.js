#!/usr/bin/env node

/**
 * esbuild 打包脚本
 *
 * 将 src/scripts/validate-entry.ts 打包为单个 ESM 文件
 * 输出到 dist/scripts/validate.js
 *
 * zod 等 npm 包会被内联，Node 内置模块保持 external
 */

import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'dist', 'scripts');

// Ensure output directory exists
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

try {
  console.log('Bundling validate script...');

  await build({
    entryPoints: [join(rootDir, 'src', 'scripts', 'validate-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: join(outDir, 'validate.js'),
    // Only exclude Node built-in modules; npm packages (like zod) get inlined
    external: ['fs', 'path', 'node:*'],
    banner: {
      js: '// superspec validate script - bundled by esbuild',
    },
  });

  console.log('Bundle complete: dist/scripts/validate.js');
} catch (err) {
  console.error('Bundle failed:', err.message);
  process.exit(1);
}
