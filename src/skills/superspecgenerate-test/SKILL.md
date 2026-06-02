---
name: superspec:generate-test
description: 当用户需要根据 spec 生成测试代码骨架时使用
---

# 生成测试代码（Generate Test）

## 概述

根据 spec 文件生成特定语言的测试代码骨架。生成的代码包含测试框架结构和 TODO 占位，用户只需填充测试实现。

## 何时使用

**始终使用：**
- 用户要求从 spec 生成测试
- 需要快速创建测试文件骨架
- spec 定义完成后进入编码阶段

## 支持的语言

| 语言 | 命令 | 测试框架 | 文件扩展名 |
|------|------|---------|-----------|
| TypeScript | `--lang typescript` | vitest | .test.ts |
| Python | `--lang python` | pytest | .py |

<EXTREMELY-IMPORTANT>
你在生成测试代码时，必须使用 superspec generate 命令，不要手动编写测试骨架。

步骤：
1. 确认 spec 文件存在且校验通过
2. 执行 `node .superspec/scripts/validate.js <spec-path>` 校验
3. 执行 `node bin/superspec.js generate <name> --lang <language> --output <path>` 生成
4. 检查生成的文件，填充 TODO 占位

这不可协商。
</EXTREMELY-IMPORTANT>

## 工作流程

### 步骤 1：确认 spec 存在

```bash
ls .superspec/specs/<name>/spec.md
```

### 步骤 2：校验 spec

```bash
node .superspec/scripts/validate.js .superspec/specs/<name>/spec.md
```

如果校验失败，先修正 spec 再生成测试。

### 步骤 3：生成测试代码

```bash
# TypeScript (vitest)
node bin/superspec.js generate <name> --lang typescript --output test/<name>.test.ts

# Python (pytest)
node bin/superspec.js generate <name> --lang python --output tests/test_<name>.py
```

### 步骤 4：填充测试实现

生成的代码包含 `// TODO: 实现测试` 或 `assert True # 占位`。

对于每个场景：
1. 读取场景的 Given/When/Then 描述
2. 设置测试前置条件（Given）
3. 执行被测行为（When）
4. 编写断言（Then）

## 生成示例

### TypeScript (vitest)

```typescript
import { describe, it, expect } from 'vitest';

  describe('导出格式支持', () => {
    it('CSV 导出', () => {
      // TODO: 实现测试
      // Given 用户在导出页面
      expect(true).toBe(true); // 占位
    });

    it('XLSX 导出', () => {
      // TODO: 实现测试
      // Given 用户在导出页面
      expect(true).toBe(true); // 占位
    });

  });
```

### Python (pytest)

```python
import pytest


class Test导出格式支持:
    """导出格式支持"""

    def test_csv导出(self):
        """CSV 导出"""
        # TODO: 实现测试
        # Given 用户在导出页面
        assert True  # 占位

    def test_xlsx导出(self):
        """XLSX 导出"""
        # TODO: 实现测试
        # Given 用户在导出页面
        assert True  # 占位
```

## 借口表

| AI 的借口 | 反驳 |
|-----------|------|
| "我直接写测试更快" | 命令生成的骨架保证与 spec 一致。用它。 |
| "生成的代码太简单了" | 骨架是起点，不是终点。填充 TODO。 |
| "我不需要测试框架" | spec 定义了验收场景，测试是它的自然产物。 |
| "校验失败了，跳过吧" | 先修正 spec，再生成测试。质量从源头把控。 |
