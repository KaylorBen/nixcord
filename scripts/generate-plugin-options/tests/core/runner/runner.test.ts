import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import { runGeneratePluginOptions, validateParsedResults } from '../../../src/core/runner/index.js';
import { CLI_CONFIG } from '../../../src/shared/config.js';
import type { GeneratePluginOptionsSummary } from '../../../src/core/runner/index.js';
import type { Result } from 'true-myth';
import { match } from 'ts-pattern';
import { keys } from 'remeda';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mocks = vi.hoisted(() => ({
  parsePlugins: vi.fn(),
  categorizePlugins: vi.fn(),
  generateNixModule: vi.fn((plugins: Record<string, unknown>, label: string) => {
    return `${label}:${keys(plugins).join(',')}`;
  }),
  generateParseRulesModule: vi.fn(() => 'rules'),
  oraPromise: vi.fn((promise: Promise<any>) => promise),
}));

vi.mock('../../../src/core/parser/index.js', () => ({
  parsePlugins: mocks.parsePlugins,
  categorizePlugins: mocks.categorizePlugins,
}));

vi.mock('../../../src/nix/generator.js', () => ({
  generateNixModule: mocks.generateNixModule,
}));

vi.mock('../../../src/nix/parse-rules.js', () => ({
  generateParseRulesModule: mocks.generateParseRulesModule,
}));

vi.mock('ora', () => ({
  oraPromise: mocks.oraPromise,
}));

const basePlugin = {
  name: 'Sample',
  settings: {},
};

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  };
}

async function createRepo(root: string, variant: 'vencord' | 'equicord') {
  const repoRoot = join(root, variant);
  const pluginsDir = match(variant)
    .with('vencord', () => CLI_CONFIG.directories.vencordPlugins)
    .with('equicord', () => CLI_CONFIG.directories.equicordPlugins)
    .exhaustive();
  await fse.ensureDir(join(repoRoot, pluginsDir));
  await fse.writeFile(join(repoRoot, 'package.json'), '{}', 'utf8');
  return repoRoot;
}

function unwrapOk<T, E>(result: Result<T, E>): T {
  return result.match({
    Ok: (value) => value,
    Err: (error) => {
      throw error;
    },
  });
}

function unwrapErr<T, E>(result: Result<T, E>): E {
  return result.match({
    Ok: () => {
      throw new Error('Expected Err result');
    },
    Err: (error) => error,
  });
}

describe('runGeneratePluginOptions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fse.mkdtemp(join(__dirname, 'runner-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fse.remove(tempDir);
  });

  test('writes all output files and returns summary when both sources are provided', async () => {
    const logger = createLogger();
    const vencordRepo = await createRepo(tempDir, 'vencord');
    const equicordRepo = await createRepo(tempDir, 'equicord');
    const vencordResult = {
      vencordPlugins: { Shared: basePlugin, SoloV: basePlugin },
      equicordPlugins: {},
    };
    const equicordResult = {
      vencordPlugins: {},
      equicordPlugins: { Shared: basePlugin, SoloE: basePlugin },
    };

    mocks.parsePlugins.mockResolvedValueOnce(vencordResult).mockResolvedValueOnce(equicordResult);
    mocks.categorizePlugins.mockReturnValue({
      generic: { Shared: basePlugin },
      vencordOnly: { SoloV: basePlugin },
      equicordOnly: { SoloE: basePlugin },
    });

    const outputPath = join(tempDir, 'result', 'modules.nix');
    const result = await runGeneratePluginOptions({
      vencordPath: vencordRepo,
      equicordPath: equicordRepo,
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
      outputPath,
      verbose: false,
      logger,
    });

    expect(result.isOk).toBe(true);
    const summary = unwrapOk<GeneratePluginOptionsSummary, Error>(result);
    expect(summary).toEqual({
      pluginsDir: join(dirname(outputPath), CLI_CONFIG.directories.output),
      sharedCount: 1,
      vencordOnlyCount: 1,
      equicordOnlyCount: 1,
    });

    const pluginsDir = summary.pluginsDir;
    const sharedPath = join(pluginsDir, CLI_CONFIG.filenames.shared);
    const vencordPath = join(pluginsDir, CLI_CONFIG.filenames.vencord);
    const equicordPath = join(pluginsDir, CLI_CONFIG.filenames.equicord);
    const parseRulesPath = join(pluginsDir, CLI_CONFIG.filenames.parseRules);

    await expect(fse.readFile(sharedPath, 'utf8')).resolves.toBe('shared:Shared');
    await expect(fse.readFile(vencordPath, 'utf8')).resolves.toBe('vencord:SoloV');
    await expect(fse.readFile(equicordPath, 'utf8')).resolves.toBe('equicord:SoloE');
    await expect(fse.readFile(parseRulesPath, 'utf8')).resolves.toBe('rules');

    expect(mocks.parsePlugins).toHaveBeenNthCalledWith(1, vencordRepo, {
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
    });
    expect(mocks.parsePlugins).toHaveBeenNthCalledWith(2, equicordRepo, {
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
    });
    expect(mocks.oraPromise).toHaveBeenCalledTimes(2);
  });

  test('skips ora spinner when verbose logging is enabled', async () => {
    const logger = createLogger();
    const vencordRepo = await createRepo(tempDir, 'vencord');
    mocks.parsePlugins.mockResolvedValue({
      vencordPlugins: { Only: basePlugin },
      equicordPlugins: {},
    });
    mocks.categorizePlugins.mockReturnValue({
      generic: {},
      vencordOnly: { Only: basePlugin },
      equicordOnly: {},
    });

    const result = await runGeneratePluginOptions({
      vencordPath: vencordRepo,
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
      outputPath: join(tempDir, 'out.nix'),
      verbose: true,
      logger,
    });

    expect(result.isOk).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Found 1 plugins in Vencord src/plugins')
    );
    expect(mocks.oraPromise).not.toHaveBeenCalled();
  });

  test('returns error result when validation fails', async () => {
    const logger = createLogger();
    const vencordRepo = await createRepo(tempDir, 'vencord');
    mocks.parsePlugins.mockResolvedValue({
      vencordPlugins: { Broken: { name: 'Broken' } as any },
      equicordPlugins: {},
    });

    const result = await runGeneratePluginOptions({
      vencordPath: vencordRepo,
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
      outputPath: join(tempDir, 'out.nix'),
      logger,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result).message).toContain('settings');
  });

  test('fails fast when vencord path is invalid', async () => {
    const logger = createLogger();
    const result = await runGeneratePluginOptions({
      vencordPath: join(tempDir, 'missing'),
      vencordPluginsDir: CLI_CONFIG.directories.vencordPlugins,
      equicordPluginsDir: CLI_CONFIG.directories.equicordPlugins,
      outputPath: join(tempDir, 'out.nix'),
      logger,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result).message).toContain('Vencord source path does not exist');
    expect(mocks.parsePlugins).not.toHaveBeenCalled();
  });
});

describe('validateParsedResults', () => {
  test('throws when either result violates schema', () => {
    const valid = {
      vencordPlugins: { Demo: basePlugin },
      equicordPlugins: {},
    };
    const invalid = {
      vencordPlugins: { Broken: { name: 'Broken' } as any },
      equicordPlugins: {},
    };

    expect(() => validateParsedResults(valid, valid)).not.toThrow();
    expect(() => validateParsedResults(invalid as any)).toThrow(/settings/i);
    expect(() => validateParsedResults(valid, invalid as any)).toThrow(/settings/i);
  });
});
