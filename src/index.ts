export {
  SpecSchema,
  RequirementSchema,
  ScenarioSchema,
  type Spec,
  type Requirement,
  type Scenario,
} from './core/spec-schema.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
export const version: string = pkg.version;
