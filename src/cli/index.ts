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
  .action(async (options: { interactive?: boolean; ci?: boolean }) => {
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
      console.log(`\n配置: 语言=${interactiveOptions.language}, 严格模式=${interactiveOptions.strict}`);
      console.log('\n使用 /superspec:generate-spec 开始生成 spec。');
    } else {
      console.log('正在初始化 superSpec...\n');
      const result = initProject(projectRoot, { ci: options.ci });

      if (result.skipped) return;

      console.log('superSpec 初始化完成！\n');
      console.log('已创建以下文件：');
      for (const file of result.created) {
        console.log(`  ${file}`);
      }
      console.log('\n使用 /superspec:generate-spec 开始生成 spec。');
    }
  });

program
  .command('validate')
  .description('校验 spec 文件')
  .argument('<name>', 'spec 名称或文件路径')
  .option('--strict', '启用严格模式（WARNING 也导致失败）')
  .action(async (name: string, options: { strict?: boolean }) => {
    // TODO: 在后续任务中实现
    console.log(`正在校验: ${name}`);
    console.log(`严格模式: ${options.strict ? '是' : '否'}`);
    console.log('（此命令尚未完整实现，敬请期待）');
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
      const validator = new Validator(false);
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

program.parse();
