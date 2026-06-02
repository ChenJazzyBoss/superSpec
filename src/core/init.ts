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

/** 生成 config.yaml 内容 */
function generateConfigYaml(options: InitOptions = {}): string {
  const language = options.language ?? 'typescript';
  const strict = options.strict ?? false;
  const projectName = options.projectName ?? 'my-project';

  return `version: "1.0.0"
project: "${projectName}"
tool: "claude-code"
language: "${language}"
strict: ${strict}
spec:
  min_purpose_length: 50
  min_scenario_count: 2
  recommended_scenario_count: 3
  min_scenario_text_length: 10
  requirement_keywords:
    - SHALL
    - MUST
`;
}

/** 需要创建的目录列表 */
const DIRECTORIES = [
  '.superspec',
  '.superspec/templates',
  '.superspec/scripts',
  '.superspec/specs',
  '.claude',
  '.claude/skills',
  '.claude/skills/generate-spec',
  '.claude/skills/validate-spec',
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
    'src/skills/generate-spec/SKILL.md',
    '.claude/skills/generate-spec/SKILL.md',
  ],
  [
    'src/skills/validate-spec/SKILL.md',
    '.claude/skills/validate-spec/SKILL.md',
  ],
  [
    'dist/scripts/validate.js',
    '.superspec/scripts/validate.js',
  ],
];

/** 初始化选项 */
export interface InitOptions {
  /** 是否生成 GitHub Actions CI workflow */
  ci?: boolean;
  /** 项目名称 */
  projectName?: string;
  /** 目标语言 */
  language?: 'typescript' | 'python';
  /** 是否启用严格模式 */
  strict?: boolean;
}

/**
 * 交互式收集初始化配置
 */
export async function collectInteractiveOptions(): Promise<InitOptions> {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (question: string): Promise<string> =>
    new Promise((resolve) => rl.question(question, resolve));

  console.log('🎯 superSpec 交互式配置\n');

  const projectName = await ask('项目名称 (my-project): ') || 'my-project';

  let language: 'typescript' | 'python' = 'typescript';
  const langAnswer = await ask('目标语言 (typescript/python) [typescript]: ');
  if (langAnswer.toLowerCase() === 'python') {
    language = 'python';
  }

  const strictAnswer = await ask('启用严格模式？WARNING 也视为错误 (y/N) [N]: ');
  const strict = strictAnswer.toLowerCase() === 'y';

  const ciAnswer = await ask('生成 GitHub Actions CI workflow？(y/N) [N]: ');
  const ci = ciAnswer.toLowerCase() === 'y';

  rl.close();

  console.log('');
  return { projectName, language, strict, ci };
}

/**
 * 初始化 superSpec 项目骨架
 *
 * @param projectRoot - 项目根目录（通常是 process.cwd()）
 * @param options - 初始化选项
 * @returns 初始化结果
 */
export function initProject(projectRoot: string, options: InitOptions = {}): {
  skipped: boolean;
  created: string[];
} {
  const superspecDir = join(projectRoot, '.superspec');

  // 幂等性检查：如果已初始化，跳过
  if (existsSync(superspecDir)) {
    console.log('检测到 .superspec 目录已存在，项目已初始化，跳过。');
    return { skipped: true, created: [] };
  }

  // 检测 Claude Code 配置目录
  const claudeDir = join(projectRoot, '.claude');
  if (!existsSync(claudeDir)) {
    console.warn('警告: 未检测到 Claude Code 配置目录 (.claude/)，将自动创建。');
  }

  const created: string[] = [];

  // 1. 创建目录结构
  for (const dir of DIRECTORIES) {
    const fullPath = join(projectRoot, dir);
    mkdirSync(fullPath, { recursive: true });
  }

  // 2. 复制文件
  for (const [srcRel, destRel] of FILE_COPIES) {
    const srcPath = join(SUPERSPEC_ROOT, srcRel);
    const destPath = join(projectRoot, destRel);

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
  writeFileSync(configPath, generateConfigYaml(options), 'utf-8');
  created.push('.superspec/config.yaml');

  // 4. 创建 .superspec/specs/.gitkeep
  const gitkeepPath = join(projectRoot, '.superspec', 'specs', '.gitkeep');
  writeFileSync(gitkeepPath, '', 'utf-8');
  created.push('.superspec/specs/.gitkeep');

  // 5. 注入 CLAUDE.md
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  injectClaudeMd(claudeMdPath);
  created.push('CLAUDE.md');

  // 6. 生成 CI workflow（如果启用）
  if (options.ci) {
    const ciWorkflowDir = join(projectRoot, '.github', 'workflows');
    const ciWorkflowPath = join(ciWorkflowDir, 'superspec-validate.yml');

    if (existsSync(ciWorkflowPath)) {
      console.log('workflow 已存在，跳过');
    } else {
      mkdirSync(ciWorkflowDir, { recursive: true });
      const workflowContent = `name: superSpec Validate

on:
  pull_request:
    paths:
      - '.superspec/specs/**'
      - '.superspec/scripts/validate.js'

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Bundle validate script
        run: npm run bundle-validate

      - name: Validate all specs
        run: node bin/superspec.js ci

      - name: Validate specs (strict mode)
        run: node bin/superspec.js ci --strict
`;
      writeFileSync(ciWorkflowPath, workflowContent, 'utf-8');
      created.push('.github/workflows/superspec-validate.yml');
    }
  }

  return { skipped: false, created };
}
