/**
 * CLAUDE.md 哨兵管理
 *
 * 使用 sentinel 标记在 CLAUDE.md 中安全注入和卸载 superSpec 上下文。
 *
 * 哨兵格式：
 *   <!-- superspec:begin -->
 *   ... superSpec 上下文内容 ...
 *   <!-- superspec:end -->
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BEGIN_MARKER = '<!-- superspec:begin -->';
const END_MARKER = '<!-- superspec:end -->';

/**
 * 生成 superSpec 上下文内容
 */
function generateContext(): string {
  return `## superSpec

这是一个使用 superSpec 管理 spec 的项目。

### 可用技能

- \`/superspec:generate-spec\` — 生成新的 spec 文件
- \`/superspec:validate-spec\` — 校验 spec 文件

### 校验命令

\`\`\`bash
node .superspec/scripts/validate.js <spec-path>
node .superspec/scripts/validate.js <spec-path> --strict
\`\`\`

### spec 目录结构

\`\`\`
.superspec/
├── config.yaml          # 项目配置
├── scripts/
│   └── validate.js      # 校验脚本
├── specs/
│   └── <spec-name>/
│       └── spec.md      # spec 文件
└── templates/
    └── spec-template.md # spec 模板
\`\`\`
`;
}

/**
 * 向 CLAUDE.md 追加 superSpec 上下文
 *
 * 行为：
 * - 文件不存在：创建并写入上下文
 * - 文件存在但无哨兵：追加上下文到末尾
 * - 文件存在且有哨兵：更新哨兵之间的内容（不重复追加）
 */
export function injectClaudeMd(claudeMdPath: string): { created: boolean; updated: boolean } {
  const context = `${BEGIN_MARKER}\n${generateContext()}${END_MARKER}`;

  if (!existsSync(claudeMdPath)) {
    writeFileSync(claudeMdPath, context + '\n', 'utf-8');
    return { created: true, updated: false };
  }

  const content = readFileSync(claudeMdPath, 'utf-8');

  // 检查是否已有哨兵
  const beginIndex = content.indexOf(BEGIN_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
    // 已有哨兵，替换内容
    const before = content.slice(0, beginIndex);
    const after = content.slice(endIndex + END_MARKER.length);
    writeFileSync(claudeMdPath, before + context + after, 'utf-8');
    return { created: false, updated: true };
  }

  // 无哨兵，追加到末尾
  const separator = content.endsWith('\n') ? '' : '\n';
  writeFileSync(claudeMdPath, content + separator + '\n' + context + '\n', 'utf-8');
  return { created: false, updated: false };
}

/**
 * 从 CLAUDE.md 移除 superSpec 上下文
 */
export function removeClaudeMd(claudeMdPath: string): boolean {
  if (!existsSync(claudeMdPath)) return false;

  const content = readFileSync(claudeMdPath, 'utf-8');
  const beginIndex = content.indexOf(BEGIN_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (beginIndex === -1 || endIndex === -1) return false;

  const before = content.slice(0, beginIndex);
  const after = content.slice(endIndex + END_MARKER.length);
  writeFileSync(claudeMdPath, before.trimEnd() + after, 'utf-8');
  return true;
}

/**
 * 检查 CLAUDE.md 是否已包含 superSpec 上下文
 */
export function hasClaudeMd(claudeMdPath: string): boolean {
  if (!existsSync(claudeMdPath)) return false;
  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes(BEGIN_MARKER) && content.includes(END_MARKER);
}
