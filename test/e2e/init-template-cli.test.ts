import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

const CLI = 'node bin/superspec.js';

describe('E2E: init --template and --list-templates', () => {
  describe('superspec init --list-templates', () => {
    it('should list all available templates', () => {
      const output = execSync(`${CLI} init --list-templates`, { encoding: 'utf-8' });
      expect(output).toContain('general');
      expect(output).toContain('web-api');
      expect(output).toContain('cli');
      expect(output).toContain('library');
      expect(output).toContain('superspec init --template');
    });

    it('should include template count', () => {
      const output = execSync(`${CLI} init --list-templates`, { encoding: 'utf-8' });
      expect(output).toMatch(/共 \d+ 个模板/);
    });
  });

  describe('superspec init --template <type>', () => {
    it('should reject invalid template type', () => {
      try {
        execSync(`${CLI} init --template nonexistent`, { encoding: 'utf-8', stdio: 'pipe' });
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(1);
        expect(err.stderr).toContain('未知模板类型');
        expect(err.stderr).toContain('可用模板');
      }
    });

    it('should show template option in help', () => {
      const output = execSync(`${CLI} init --help`, { encoding: 'utf-8' });
      expect(output).toContain('--template');
      expect(output).toContain('--list-templates');
    });
  });
});
