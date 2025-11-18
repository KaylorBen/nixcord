#!/usr/bin/env node

import { runCli, handleCliError } from './cli/index.js';
export { runGeneratePluginOptions, validateParsedResults } from './core/runner/index.js';

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  await runCli().catch(handleCliError);
}
