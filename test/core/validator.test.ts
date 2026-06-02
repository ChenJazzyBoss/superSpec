import { describe, it, expect } from 'vitest';
import { Validator } from '../../src/core/validator.js';

describe('Validator', () => {
  const validSpec = `# 测试
## Purpose
用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围和数据类型进行筛选，导出任务异步执行并通过系统通知告知用户完成状态。
## Requirements
### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。
#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件
#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件
#### Scenario: 无效格式处理
Given 用户在导出页面
When 选择不支持的格式
Then 显示错误提示`;

  const invalidSpec = `# 测试
## Purpose
太短了。
## Requirements
### Requirement: 导出格式支持
支持 CSV 格式。
#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件`;

  it('校验正确的 spec 返回 valid: true', async () => {
    const validator = new Validator(false);
    const report = await validator.validateSpecContent('test', validSpec);
    expect(report.valid).toBe(true);
    expect(report.summary.errors).toBe(0);
  });

  it('Zod 结构校验捕获类型错误', async () => {
    const validator = new Validator(false);
    const report = await validator.validateSpecContent('test', invalidSpec);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.message.includes('50'))).toBe(true);
  });

  it('业务规则校验捕获 SHALL/MUST 缺失', async () => {
    const spec = `# 测试
## Purpose
用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围和数据类型进行筛选，导出任务异步执行并通过系统通知告知用户完成状态。
## Requirements
### Requirement: 导出格式支持
支持 CSV 格式。
#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件
#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件`;

    const validator = new Validator(false);
    const report = await validator.validateSpecContent('test', spec);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.message.includes('SHALL'))).toBe(true);
  });

  it('业务规则校验捕获场景数不足', async () => {
    const spec = `# 测试
## Purpose
用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围和数据类型进行筛选，导出任务异步执行并通过系统通知告知用户完成状态。
## Requirements
### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。
#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件`;

    const validator = new Validator(false);
    const report = await validator.validateSpecContent('test', spec);
    expect(report.issues.some(i => i.level === 'WARNING' && i.message.includes('场景'))).toBe(true);
  });

  it('strictMode 下 WARNING 升级为失败', async () => {
    const spec = `# 测试
## Purpose
用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围和数据类型进行筛选，导出任务异步执行并通过系统通知告知用户完成状态。
## Requirements
### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。
#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件
#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件`;

    const validator = new Validator(true);
    const report = await validator.validateSpecContent('test', spec);
    expect(report.valid).toBe(false);
    expect(report.summary.warnings).toBeGreaterThan(0);
  });

  it('校验报告 JSON 格式正确', async () => {
    const validator = new Validator(false);
    const report = await validator.validateSpecContent('test', validSpec);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('valid');
    expect(parsed).toHaveProperty('issues');
    expect(parsed).toHaveProperty('summary');
  });
});
