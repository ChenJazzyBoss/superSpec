/**
 * 上游对齐检测 — 统一导出
 * @module upstream
 */

export type {
  UpstreamSource,
  UpstreamConfig,
  DiffEntry,
  UpstreamReport,
} from './types.js';

export { loadUpstreamConfig, validateUpstreamConfig } from './config.js';

export { compareFiles, detectDrift } from './differ.js';

export { generateReport, generateJsonReport } from './reporter.js';
