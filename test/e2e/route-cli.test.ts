import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const CLI = 'node bin/superspec.js';

describe('E2E: route command', () => {
  it('should detect bug-fix and recommend debug path', () => {
    const output = execSync(`${CLI} route "导出功能报错了"`, { encoding: 'utf-8' });
    expect(output).toContain('排障路径');
  });

  it('should detect new feature and recommend lightweight path', () => {
    const output = execSync(`${CLI} route "新增导出按钮"`, { encoding: 'utf-8' });
    expect(output).toContain('轻量路径');
  });

  it('should detect modification and recommend full path', () => {
    const output = execSync(`${CLI} route "修改导出格式为PDF"`, { encoding: 'utf-8' });
    expect(output).toContain('完整路径');
  });

  it('should route to full path with multiple capabilities', () => {
    const output = execSync(`${CLI} route "新增导出功能" -c 3`, { encoding: 'utf-8' });
    expect(output).toContain('完整路径');
  });

  it('should force full path with --existing-spec flag', () => {
    const output = execSync(`${CLI} route "新增导出按钮" --existing-spec`, { encoding: 'utf-8' });
    expect(output).toContain('完整路径');
  });

  it('should show evidence in output', () => {
    const output = execSync(`${CLI} route "添加批量导出" -c 1 -r 2`, { encoding: 'utf-8' });
    expect(output).toContain('评估依据');
    expect(output).toContain('意图');
    expect(output).toContain('Capability');
  });
});
