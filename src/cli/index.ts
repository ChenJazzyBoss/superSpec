/**
 * superSpec CLI 入口
 *
 * 支持 init 和 validate 子命令。
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initProject } from '../core/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('superspec')
  .description('AI-native spec management tool for Claude Code')
  .version(getVersion());

program
  .command('init')
  .description('初始化 superSpec 项目骨架')
  .option('-i, --interactive', '交互式配置')
  .option('--ci', '生成 GitHub Actions CI workflow')
  .option('-t, --template <type>', '项目类型模板 (general/web-api/cli/library)')
  .option('--list-templates', '列出所有可用模板类型')
  .action(async (options: { interactive?: boolean; ci?: boolean; template?: string; listTemplates?: boolean }) => {
    // --list-templates: 列出模板
    if (options.listTemplates) {
      const { formatTemplateList } = await import('../core/init-templates.js');
      console.log(formatTemplateList());
      return;
    }

    // --template 校验
    if (options.template) {
      const { isValidTemplateType, listTemplates } = await import('../core/init-templates.js');
      if (!isValidTemplateType(options.template)) {
        const templates = listTemplates();
        console.error(`错误: 未知模板类型 "${options.template}"`);
        console.error(`可用模板: ${templates.map((t) => t.type).join(', ')}`);
        process.exit(1);
      }
    }

    const projectRoot = process.cwd();

    if (options.interactive) {
      const { collectInteractiveOptions } = await import('../core/init.js');
      const interactiveOptions = await collectInteractiveOptions();
      console.log('正在初始化 superSpec...\n');
      const result = initProject(projectRoot, interactiveOptions);

      if (result.skipped) return;

      console.log('superSpec 初始化完成！\n');
      console.log('已创建以下文件：');
      for (const file of result.created) {
        console.log(`  ${file}`);
      }
      console.log(`\n配置: 语言=${interactiveOptions.language}, 严格模式=${interactiveOptions.strict}, 模板=${interactiveOptions.template ?? 'general'}`);
      console.log('\n使用 /generate-spec 开始生成 spec。');
    } else {
      console.log('正在初始化 superSpec...\n');
      const initOptions: Record<string, unknown> = { ci: options.ci };
      if (options.template) {
        initOptions.template = options.template;
      }
      const result = initProject(projectRoot, initOptions as Parameters<typeof initProject>[1]);

      if (result.skipped) return;

      console.log('superSpec 初始化完成！\n');
      console.log('已创建以下文件：');
      for (const file of result.created) {
        console.log(`  ${file}`);
      }
      if (options.template) {
        console.log(`\n模板: ${options.template}`);
      }
      console.log('\n使用 /generate-spec 开始生成 spec。');
    }
  });

program
  .command('validate')
  .description('校验 spec 文件')
  .argument('<name>', 'spec 名称或文件路径')
  .option('--strict', '启用严格模式（WARNING 也导致失败）')
  .option('--deep', '启用深度逻辑一致性分析')
  .action(async (name: string, options: { strict?: boolean; deep?: boolean }) => {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { Validator } = await import('../core/validator.js');

    const cwd = process.cwd();

    // 支持文件路径或 spec 名称两种方式
    let specPath: string;
    let specName: string;
    if (name.endsWith('.md') || name.includes('/') || name.includes('\\')) {
      specPath = name;
      specName = name.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '') ?? 'unknown';
    } else {
      specName = name;
      specPath = join(cwd, '.superspec', 'specs', name, 'spec.md');
    }

    if (!existsSync(specPath)) {
      console.error(`错误: spec 文件不存在 ${specPath}`);
      process.exit(1);
    }

    const validator = new Validator({ strictMode: options.strict, deep: options.deep });
    const report = await validator.validateSpec(specPath, specName);

    // 输出报告
    const output: Record<string, unknown> = {
      valid: report.valid,
      issues: report.issues,
      summary: report.summary,
    };
    if (report.scenarioTypes) {
      output.scenarioTypes = report.scenarioTypes;
    }
    console.log(JSON.stringify(output, null, 2));

    process.exit(report.valid ? 0 : 1);
  });

program
  .command('generate')
  .description('根据 spec 生成测试代码骨架')
  .argument('<name>', 'spec 名称')
  .option('-l, --lang <language>', '目标语言（typescript/python）', 'typescript')
  .option('-o, --output <path>', '输出文件路径（默认输出到 stdout）')
  .action(async (name: string, options: { lang: string; output?: string }) => {
    const { readFileSync, writeFileSync, mkdirSync, existsSync } = await import('fs');
    const { dirname, join } = await import('path');
    const { parseSpec } = await import('../core/spec-parser.js');
    const { adapterRegistry } = await import('../adapters/registry.js');
    // 确保 adapters 被加载（它们会自动注册）
    await import('../adapters/typescript.js');
    await import('../adapters/python.js');

    const cwd = process.cwd();
    const specPath = join(cwd, '.superspec', 'specs', name, 'spec.md');

    // 读取 spec
    let spec;
    try {
      const content = readFileSync(specPath, 'utf-8');
      spec = parseSpec(content, name);
    } catch {
      console.error(`错误: 无法读取 spec 文件 ${specPath}`);
      process.exit(1);
    }

    // 获取 adapter
    let adapter;
    try {
      adapter = adapterRegistry.get(options.lang);
    } catch (err) {
      console.error(err instanceof Error ? err.message : '未知错误');
      process.exit(1);
    }

    // 生成代码
    const code = adapter.generate(spec);

    // 输出
    if (options.output) {
      const outputDir = dirname(options.output);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(options.output, code, 'utf-8');
      console.log(`✅ 测试代码已生成: ${options.output}`);
      console.log(`   语言: ${adapter.displayName}`);
      console.log(`   需求数: ${spec.requirements.length}`);
      console.log(`   场景数: ${spec.requirements.reduce((sum, r) => sum + r.scenarios.length, 0)}`);
    } else {
      console.log(code);
    }
  });

program
  .command('update')
  .description('增量更新 spec 文件')
  .argument('<name>', 'spec 名称')
  .option('-f, --file <path>', '从 JSON 文件读取 Delta（默认从 stdin 读取）')
  .action(async (name: string, options: { file?: string }) => {
    const { readFileSync } = await import('fs');
    const { applyDelta } = await import('../core/delta-merge.js');
    const { parseSpec } = await import('../core/spec-parser.js');
    const { Validator } = await import('../core/validator.js');
    const { join } = await import('path');

    const cwd = process.cwd();
    const specPath = join(cwd, '.superspec', 'specs', name, 'spec.md');

    // 读取 Delta JSON
    let deltaJson: string;
    if (options.file) {
      try {
        deltaJson = readFileSync(options.file, 'utf-8');
      } catch {
        console.error(`错误: 无法读取文件 ${options.file}`);
        process.exit(1);
      }
    } else {
      // 从 stdin 读取
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      deltaJson = Buffer.concat(chunks).toString('utf-8');
    }

    // 解析 Delta
    let delta;
    try {
      const { DeltaSchema } = await import('../core/delta-schema.js');
      delta = DeltaSchema.parse(JSON.parse(deltaJson));
    } catch (err) {
      console.error('错误: Delta JSON 格式不正确');
      if (err instanceof Error) console.error(err.message);
      process.exit(1);
    }

    // 读取现有 spec
    let spec;
    try {
      const content = readFileSync(specPath, 'utf-8');
      spec = parseSpec(content, name);
    } catch {
      console.error(`错误: 无法读取 spec 文件 ${specPath}`);
      process.exit(1);
    }

    // 应用 Delta
    try {
      const updated = applyDelta(spec, delta);

      // 生成更新后的 Markdown
      const { generateSpecContent } = await import('../core/delta-markdown.js');
      const newContent = generateSpecContent(updated);

      // 写入文件
      const { writeFileSync } = await import('fs');
      writeFileSync(specPath, newContent, 'utf-8');

      console.log(`✅ spec "${name}" 已更新`);
      console.log(`   需求数: ${updated.requirements.length}`);
      console.log(`   变更项: ${delta.changes.length}`);

      // 自动校验
      const validator = new Validator();
      const report = await validator.validateSpec(specPath, name);
      if (report.valid) {
        console.log('   校验: ✅ 通过');
      } else {
        console.log(`   校验: ❌ 失败 (${report.summary.errors} error, ${report.summary.warnings} warning)`);
        for (const issue of report.issues) {
          if (issue.level === 'ERROR') {
            console.log(`     ❌ ${issue.message}`);
          }
        }
      }
    } catch (err) {
      console.error(`错误: Delta 合并失败`);
      if (err instanceof Error) console.error(err.message);
      process.exit(1);
    }
  });

program
  .command('ci')
  .description('批量校验所有 spec 文件')
  .option('--strict', '启用严格模式（WARNING 也导致失败）')
  .option('--json', '输出 JSON 格式')
  .action(async (options: { strict?: boolean; json?: boolean }) => {
    const { runCi, printCiResult } = await import('../ci/ci-runner.js');
    const cwd = process.cwd();
    const summary = await runCi(cwd, options.strict);

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      printCiResult(summary);
    }

    process.exit(summary.valid ? 0 : 1);
  });

program
  .command('diff')
  .description('对比 spec 的当前版本与历史版本')
  .argument('<name>', 'spec 名称')
  .option('--from <timestamp>', '指定历史版本（格式: YYYY-MM-DDTHH-mm-ss）')
  .action(async (name: string, options: { from?: string }) => {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { parseSpec } = await import('../core/spec-parser.js');
    const { readSnapshot, diffSpec, formatDiff } = await import('../history/index.js');

    const cwd = process.cwd();
    const specDir = join(cwd, '.superspec', 'specs', name);
    const specPath = join(specDir, 'spec.md');

    if (!existsSync(specPath)) {
      console.error(`错误: spec 文件不存在 ${specPath}`);
      process.exit(1);
    }
    const currentContent = readFileSync(specPath, 'utf-8');
    const currentSpec = parseSpec(currentContent, name);

    let previousContent: string | null = null;
    if (options.from) {
      const filename = options.from.endsWith('.md') ? options.from : `${options.from}.md`;
      previousContent = readSnapshot(specDir, filename);
      if (!previousContent) {
        console.error(`错误: 快照 ${options.from} 不存在`);
        process.exit(1);
      }
    } else {
      const { getLatestSnapshot } = await import('../history/index.js');
      previousContent = getLatestSnapshot(specDir);
    }

    if (!previousContent) {
      console.log(`📜 spec "${name}" 无历史版本，无法对比`);
      return;
    }

    const previousSpec = parseSpec(previousContent, name);
    const result = diffSpec(currentSpec, previousSpec);
    console.log(formatDiff(name, result));
  });

program
  .command('history')
  .description('列出 spec 的所有历史快照')
  .argument('<name>', 'spec 名称')
  .action(async (name: string) => {
    const { join } = await import('path');
    const { listSnapshots } = await import('../history/index.js');

    const cwd = process.cwd();
    const specDir = join(cwd, '.superspec', 'specs', name);
    const snapshots = listSnapshots(specDir);

    console.log(`📜 spec "${name}" 历史版本\n`);

    if (snapshots.length === 0) {
      console.log('暂无历史版本');
      return;
    }

    snapshots.forEach((filename: string, index: number) => {
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.md$/);
      if (match) {
        const [, date, h, m, s] = match;
        console.log(`  ${index + 1}. ${date} ${h}:${m}:${s}`);
      } else {
        console.log(`  ${index + 1}. ${filename}`);
      }
    });

    console.log(`\n共 ${snapshots.length} 个历史版本`);
  });

program
  .command('archive')
  .description('归档完成的变更')
  .argument('<name>', '变更名称')
  .action(async (name: string) => {
    const { archiveChange } = await import('../core/archive.js');

    const cwd = process.cwd();

    try {
      console.log(`正在归档变更: ${name}\n`);
      const result = await archiveChange(cwd, name);

      console.log('归档完成！\n');
      console.log(`  变更名称: ${result.name}`);
      console.log(`  目标 spec: ${result.specName}`);
      console.log(`  变更数量: ${result.changesCount}`);
      console.log(`  归档路径: ${result.archivePath}`);
      console.log(`  校验结果: ${result.validationPassed ? '通过' : '未通过'}`);
    } catch (err) {
      console.error(`归档失败: ${err instanceof Error ? err.message : '未知错误'}`);
      process.exit(1);
    }
  });

program
  .command('changes')
  .description('列出进行中的变更')
  .action(async () => {
    const { listChanges } = await import('../core/changes.js');

    const cwd = process.cwd();
    const changes = listChanges(cwd);

    console.log('进行中的变更:\n');

    if (changes.length === 0) {
      console.log('暂无进行中的变更');
      return;
    }

    const statusLabel: Record<string, string> = {
      pending: '待处理',
      ready: '就绪',
      conflict: '冲突',
    };

    for (const change of changes) {
      const status = statusLabel[change.status] ?? change.status;
      console.log(`  ${change.name}`);
      if (change.specName) {
        console.log(`    spec: ${change.specName}`);
      }
      if (change.createdAt) {
        console.log(`    创建时间: ${change.createdAt}`);
      }
      console.log(`    状态: ${status}`);
      console.log('');
    }

    console.log(`共 ${changes.length} 个变更`);
  });

program
  .command('guard')
  .description('检查技能文件的反幻觉配置')
  .argument('<skill-path>', '技能文件路径（SKILL.md）')
  .option('--json', '输出 JSON 格式')
  .action(async (skillPath: string, options: { json?: boolean }) => {
    const { readFileSync, existsSync } = await import('fs');
    const { SkillGuard } = await import('../core/anti-rationalization/skill-guard.js');

    if (!existsSync(skillPath)) {
      console.error(`错误: 技能文件不存在 ${skillPath}`);
      process.exit(1);
    }

    const content = readFileSync(skillPath, 'utf-8');
    const guard = new SkillGuard(content);
    const result = guard.beforeExecute();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.allowed) {
        console.log('✅ 技能配置检查通过');
        console.log('   红线表: 已配置');
        console.log('   HARD-GATE: 条件满足');
      } else {
        console.log('❌ 技能配置检查失败');
        for (const issue of result.issues) {
          console.log(`   - ${issue}`);
        }
      }
    }

    process.exit(result.allowed ? 0 : 1);
  });

program
  .command('uninstall')
  .description('移除 superSpec 生成的所有文件')
  .option('-y, --yes', '跳过确认提示')
  .action(async (options: { yes?: boolean }) => {
    const { getUninstallPreview, uninstallProject } = await import('../core/uninstall.js');

    const cwd = process.cwd();
    const preview = getUninstallPreview(cwd);

    if (preview.length === 0) {
      console.log('未检测到 superSpec 文件，无需卸载。');
      return;
    }

    console.log('将要删除以下文件：\n');
    for (const item of preview) {
      console.log(`  - ${item}`);
    }

    if (!options.yes) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n确认卸载？(y/N) ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('已取消卸载。');
        return;
      }
    }

    const result = uninstallProject(cwd);
    console.log('\n✅ superSpec 已卸载\n');
    if (result.removed.length > 0) {
      console.log('已移除：');
      for (const item of result.removed) {
        console.log(`  ${item}`);
      }
    }
  });

program
  .command('validate-modules')
  .description('校验模块清单文件')
  .argument('<file>', '模块清单文件路径（Markdown 格式）')
  .option('-p, --project <name>', '项目名称', 'default')
  .option('--json', '输出 JSON 格式')
  .action(async (file: string, options: { project: string; json?: boolean }) => {
    const { readFileSync, existsSync } = await import('fs');
    const { validateModuleList } = await import('../core/module-validator.js');

    if (!existsSync(file)) {
      console.error(`错误: 文件不存在 ${file}`);
      process.exit(1);
    }

    const content = readFileSync(file, 'utf-8');
    const report = validateModuleList(content, options.project);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      if (report.valid) {
        console.log('✅ 模块清单校验通过');
        console.log(`   模块数: ${report.summary.modules}`);
        console.log(`   警告: ${report.summary.warnings}`);
      } else {
        console.log('❌ 模块清单校验失败');
        console.log(`   错误: ${report.summary.errors}`);
        console.log(`   警告: ${report.summary.warnings}`);
        console.log('');
        for (const issue of report.issues) {
          const icon = issue.level === 'ERROR' ? '❌' : issue.level === 'WARNING' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} ${issue.message}`);
        }
      }
    }

    process.exit(report.valid ? 0 : 1);
  });

// pipeline 子命令
const pipelineCmd = program.command('pipeline').description('技能协作管道管理');

pipelineCmd
  .command('show')
  .description('显示默认工作流定义')
  .action(async () => {
    const { DEFAULT_WORKFLOW } = await import('../core/pipeline/workflow.js');

    console.log('📋 superSpec 默认工作流\n');
    console.log('  阶段              类型     依赖');
    console.log('  ──────────────── ──────── ──────────────────');
    for (const stage of DEFAULT_WORKFLOW) {
      const type = stage.required ? '必需' : '可选';
      const deps = stage.dependencies.length > 0 ? stage.dependencies.join(', ') : '—';
      console.log(`  ${stage.id.padEnd(16)} ${type.padEnd(8)} ${deps}`);
    }
    console.log(`\n共 ${DEFAULT_WORKFLOW.length} 个阶段`);
  });

pipelineCmd
  .command('next')
  .description('查询指定阶段的推荐下一步')
  .argument('<stage>', '当前阶段名称')
  .action(async (stage: string) => {
    const { DEFAULT_WORKFLOW } = await import('../core/pipeline/workflow.js');

    const idx = DEFAULT_WORKFLOW.findIndex((s) => s.id === stage);
    if (idx === -1) {
      console.error(`错误: 未知阶段 "${stage}"`);
      console.error(`可用阶段: ${DEFAULT_WORKFLOW.map((s) => s.id).join(', ')}`);
      process.exit(1);
    }

    if (idx === DEFAULT_WORKFLOW.length - 1) {
      console.log(`🏁 "${stage}" 已到达工作流末尾`);
      return;
    }

    const nextStage = DEFAULT_WORKFLOW[idx + 1];
    console.log(`📍 当前阶段: ${stage}`);
    console.log(`➡️  推荐下一步: ${nextStage.id} (${nextStage.name})`);
    console.log(`   ${nextStage.required ? '必需阶段' : '可选阶段'}`);
  });

// change 子命令
const changeCmd = program.command('change').description('变更生命周期管理');

changeCmd
  .command('create')
  .description('创建变更目录和 proposal')
  .argument('<name>', '变更名称（kebab-case）')
  .option('--why <reason>', '变更原因')
  .option('--what <changes>', '变更内容')
  .action(async (name: string, options: { why?: string; what?: string }) => {
    const { createChange } = await import('../core/change-lifecycle.js');

    const cwd = process.cwd();

    try {
      const proposal = {
        why: options.why ?? '未指定',
        whatChanges: options.what ?? '未指定',
        newCapabilities: [],
        modifiedCapabilities: [],
        impact: '待评估',
      };

      const dir = createChange(cwd, name, proposal);
      console.log(`✅ 变更目录已创建: ${dir}`);
      console.log(`   下一步: 编辑 proposal.md 或使用 generate-spec 生成 delta spec`);
    } catch (err) {
      console.error(`错误: ${err instanceof Error ? err.message : '未知错误'}`);
      process.exit(1);
    }
  });

changeCmd
  .command('status')
  .description('查询变更状态')
  .argument('<name>', '变更名称')
  .action(async (name: string) => {
    const { getChangeInfo, formatChangeInfo } = await import('../core/change-lifecycle.js');

    const cwd = process.cwd();

    try {
      const info = getChangeInfo(cwd, name);
      console.log(formatChangeInfo(info));
    } catch (err) {
      console.error(`错误: ${err instanceof Error ? err.message : '未知错误'}`);
      process.exit(1);
    }
  });

changeCmd
  .command('apply')
  .description('将变更的 delta spec 合并到主 spec')
  .argument('<name>', '变更名称')
  .option('--dry-run', '仅校验不写入')
  .action(async (name: string, options: { dryRun?: boolean }) => {
    const { applySpecs } = await import('../core/specs-apply.js');

    const cwd = process.cwd();

    try {
      console.log(`${options.dryRun ? '校验' : '应用'}变更: ${name}\n`);
      const result = await applySpecs(cwd, name, { dryRun: options.dryRun });

      if (result.noChanges) {
        console.log('没有找到待应用的 delta spec。');
        return;
      }

      for (const cap of result.capabilities) {
        console.log(`  ${options.dryRun ? '[dry-run]' : '✅'} ${cap.capability}:`);
        if (cap.isNew) console.log(`    新建 spec`);
        if (cap.counts.added) console.log(`    + ${cap.counts.added} added`);
        if (cap.counts.modified) console.log(`    ~ ${cap.counts.modified} modified`);
        if (cap.counts.removed) console.log(`    - ${cap.counts.removed} removed`);
        if (cap.counts.renamed) console.log(`    → ${cap.counts.renamed} renamed`);
      }

      console.log(`\n总计: +${result.totals.added} ~${result.totals.modified} -${result.totals.removed} →${result.totals.renamed}`);
    } catch (err) {
      console.error(`错误: ${err instanceof Error ? err.message : '未知错误'}`);
      process.exit(1);
    }
  });

changeCmd
  .command('list')
  .description('列出所有变更')
  .action(async () => {
    const { listAllChanges } = await import('../core/change-lifecycle.js');

    const cwd = process.cwd();
    const changes = listAllChanges(cwd);

    if (changes.length === 0) {
      console.log('暂无进行中的变更。');
      return;
    }

    console.log(`进行中的变更 (${changes.length}):\n`);
    const phaseLabel: Record<string, string> = {
      proposal: '📋 提案',
      spec: '📄 Spec',
      plan: '📝 计划',
      implement: '🔨 实施',
      verify: '✅ 验证',
      ready: '📦 就绪',
    };

    for (const change of changes) {
      const phase = phaseLabel[change.phase] ?? change.phase;
      console.log(`  ${change.name}`);
      console.log(`    阶段: ${phase}`);
      if (change.capabilities.length > 0) {
        console.log(`    Capabilities: ${change.capabilities.join(', ')}`);
      }
      console.log('');
    }
  });

program.parse();
