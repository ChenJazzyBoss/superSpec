/**
 * 校验脚本入口
 *
 * 独立运行的校验脚本，可被 AI 通过 Bash 直接调用。
 * 用法：node validate.js <spec-path> [--strict]
 */

import { readFileSync } from 'fs';
import { Validator } from '../core/validator.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('用法: node validate.js <spec-path> [--strict]');
    console.log('');
    console.log('参数:');
    console.log('  <spec-path>  spec 文件路径');
    console.log('  --strict     启用严格模式（WARNING 也导致失败）');
    process.exit(args.includes('--help') ? 0 : 1);
  }

  const strictMode = args.includes('--strict');
  const specPath = args.filter(a => !a.startsWith('--'))[0];

  if (!specPath) {
    console.error('错误: 请提供 spec 文件路径');
    process.exit(1);
  }

  const validator = new Validator(strictMode);
  const report = await validator.validateSpec(specPath);

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.valid ? 0 : 1);
}

main().catch((err) => {
  console.error('校验脚本执行失败:', err.message);
  process.exit(1);
});
