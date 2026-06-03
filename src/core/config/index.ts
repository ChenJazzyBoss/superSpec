/**
 * 配置分层系统
 *
 * 统一导出配置类型、加载器和合并引擎。
 */

export type {
  GlobalConfig,
  ProjectConfig,
  ChangeConfig,
  ResolvedConfig,
} from './types.js';

export { CONFIG_PATHS } from './types.js';

export {
  loadConfig,
  loadGlobalConfig,
  loadProjectConfig,
  loadChangeConfig,
} from './loader.js';

export {
  deepMerge,
  resolveConfig,
} from './merger.js';
