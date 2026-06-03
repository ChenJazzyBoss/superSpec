/**
 * 配置文件加载器
 *
 * 支持 YAML 和 JSON 格式的配置文件加载。
 * 文件不存在时返回 null，解析失败时抛出明确错误。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type { GlobalConfig, ProjectConfig, ChangeConfig } from './types.js';
import { CONFIG_PATHS } from './types.js';

/**
 * 读取并解析配置文件
 *
 * @param filePath - 配置文件的绝对路径
 * @returns 解析后的配置对象，文件不存在时返回 null
 * @throws 文件存在但解析失败时抛出错误
 */
export function loadConfig(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.json') {
      return JSON.parse(content) as Record<string, unknown>;
    }
    if (ext === '.yaml' || ext === '.yml') {
      const result = yaml.load(content);
      if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
        return result as Record<string, unknown>;
      }
      throw new Error(`配置文件内容必须是对象类型，收到: ${typeof result}`);
    }
    throw new Error(`不支持的配置文件格式: ${ext}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`解析配置文件失败 (${filePath}): ${error.message}`);
    }
    throw new Error(`解析配置文件失败 (${filePath}): 未知错误`);
  }
}

/**
 * 加载全局配置
 *
 * 从 ~/.config/superspec/config.json 加载全局配置。
 * 使用用户主目录拼接 CONFIG_PATHS.global 作为路径。
 *
 * @returns 全局配置对象，文件不存在时返回 null
 */
export function loadGlobalConfig(): GlobalConfig | null {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const filePath = path.join(homeDir, CONFIG_PATHS.global);
  return loadConfig(filePath) as GlobalConfig | null;
}

/**
 * 加载项目配置
 *
 * 从当前工作目录下的 .superspec/config.yaml 加载项目配置。
 *
 * @returns 项目配置对象，文件不存在时返回 null
 */
export function loadProjectConfig(): ProjectConfig | null {
  const filePath = path.join(process.cwd(), CONFIG_PATHS.project);
  return loadConfig(filePath) as ProjectConfig | null;
}

/**
 * 加载变更配置
 *
 * 从指定变更目录下的 .superspec.yaml 加载变更配置。
 *
 * @param changeDir - 变更目录的绝对路径
 * @returns 变更配置对象，文件不存在时返回 null
 */
export function loadChangeConfig(changeDir: string): ChangeConfig | null {
  const filePath = path.join(changeDir, CONFIG_PATHS.change);
  return loadConfig(filePath) as ChangeConfig | null;
}
