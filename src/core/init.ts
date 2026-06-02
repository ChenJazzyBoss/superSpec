/**
 * superSpec 项目初始化模块
 *
 * 实现 initProject() 函数，一键初始化项目骨架：
 * - 创建 .superspec/ 目录结构
 * - 复制模板、脚本、技能文件
 * - 生成 config.yaml
 * - 注入 CLAUDE.md 哨兵
 */

import {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  chmodSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { injectClaudeMd } from './claude-md.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPERSPEC_ROOT = join(__dirname, '..', '..');

/**
 * Git on Windows replaces ':' with U+F03A in file/directory names.
 * This helper converts logical paths (with colons) to actual filesystem paths.
 */
function toFsPath(logicalPath: string): string {
  if (process.platform === 'win32') {
    return logicalPath.replace(/:/g, '');
  }
  return logicalPath;
}

/** config.yaml 内容 */
const CONFIG_YAML = `version: "1.0.0"
tool: "claude-code"
spec:
  min_purpose_length: 50
  min_scenario_count: 2
  recommended_scenario_count: 3
  min_scenario_text_length: 10
  requirement_keywords:
    - SHALL
    - MUST
`;

/** 需要创建的目录列表 */
const DIRECTORIES = [
  '.superspec',
  '.superspec/templates',
  '.superspec/scripts',
  '.superspec/specs',
  '.claude',
  '.claude/skills',
  '.claude/skills/superspec:generate-spec',
  '.claude/skills/superspec:validate-spec',
  '.claude/hooks',
];

/** 文件复制映射: [源路径(相对于项目根), 目标路径(相对于 projectRoot)] */
const FILE_COPIES: [string, string][] = [
  [
    'templates/spec-template.md',
    '.superspec/templates/spec-template.md',
  ],
  [
    'templates/hooks/hooks.json',
    '.claude/hooks/hooks.json',
  ],
  [
    'templates/hooks/session-start',
    '.claude/hooks/session-start',
  ],
  [
    'src/skills/superspec:generate-spec/SKILL.md',
    '.claude/skills/superspec:generate-spec/SKILL.md',
  ],
  [
    'src/skills/superspec:validate-spec/SKILL.md',
    '.claude/skills/superspec:validate-spec/SKILL.md',
  ],
  [
    'dist/scripts/validate.js',
    '.superspec/scripts/validate.js',
  ],
];

/**
 * 初始化 superSpec 项目骨架
 *
 * @param projectRoot - 项目根目录（通常是 process.cwd()）
 * @returns 初始化结果
 */
export function initProject(projectRoot: string): {
  skipped: boolean;
  created: string[];
} {
  const superspecDir = join(projectRoot, '.superspec');

  // 幂等性检查：如果已初始化，跳过
  if (existsSync(superspecDir)) {
    console.log('检测到 .superspec 目录已存在，项目已初始化，跳过。');
    return { skipped: true, created: [] };
  }

  const created: string[] = [];

  // 1. 创建目录结构
  for (const dir of DIRECTORIES) {
    const fullPath = join(projectRoot, toFsPath(dir));
    mkdirSync(fullPath, { recursive: true });
  }

  // 2. 复制文件
  for (const [srcRel, destRel] of FILE_COPIES) {
    const srcPath = join(SUPERSPEC_ROOT, toFsPath(srcRel));
    const destPath = join(projectRoot, toFsPath(destRel));

    if (!existsSync(srcPath)) {
      console.warn(`警告: 源文件不存在，跳过: ${srcRel}`);
      continue;
    }

    copyFileSync(srcPath, destPath);
    created.push(destRel);

    // session-start 需要可执行权限
    if (destRel.endsWith('session-start')) {
      chmodSync(destPath, 0o755);
    }
  }

  // 3. 生成 config.yaml
  const configPath = join(projectRoot, '.superspec', 'config.yaml');
  writeFileSync(configPath, CONFIG_YAML, 'utf-8');
  created.push('.superspec/config.yaml');

  // 4. 创建 .superspec/specs/.gitkeep
  const gitkeepPath = join(projectRoot, '.superspec', 'specs', '.gitkeep');
  writeFileSync(gitkeepPath, '', 'utf-8');
  created.push('.superspec/specs/.gitkeep');

  // 5. 注入 CLAUDE.md
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  injectClaudeMd(claudeMdPath);
  created.push('CLAUDE.md');

  return { skipped: false, created };
}
