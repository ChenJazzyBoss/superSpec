/**
 * superSpec CLI 入口
 *
 * 支持 init 和 validate 子命令。
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  .action(async () => {
    // TODO: 在 init 命令整合任务中实现
    console.log('正在初始化 superSpec...');
    console.log('（此命令尚未完整实现，敬请期待）');
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

program.parse();
