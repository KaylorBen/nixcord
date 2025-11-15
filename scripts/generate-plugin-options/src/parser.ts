import { Project, ts } from 'ts-morph';
import pLimit from 'p-limit';
import { basename, dirname, normalize, join } from 'pathe';
import fse from 'fs-extra';
import fg from 'fast-glob';
import { Maybe } from 'true-myth';
import { asyncMap, asyncToArray, asyncFind } from 'iter-tools';
import { pipe, map, filter, pickBy, unique, fromEntries, isNonNull, keys, partition } from 'remeda';
import type { PluginConfig, ParsedPluginsResult } from './types.js';
import { extractPluginInfo, findDefinePluginSettings } from './ast/extractor/plugin.js';
import { extractSettingsFromCall } from './ast/extractor/settings-extractor.js';
import { CLI_CONFIG } from './config.js';

const PLUGIN_SOURCE_FILE_PATTERNS = ['index.tsx', 'index.ts', 'settings.ts'] as const;
const TYPES_FILE_PATH = 'src/utils/types.ts';
const TSCONFIG_FILE_NAME = 'tsconfig.json';
const PARALLEL_PROCESSING_LIMIT = 5;
const PROGRESS_REPORT_INTERVAL = 10;

const PLUGIN_DIR_SEPARATOR_PATTERN = /[-_]/;
const PLUGIN_FILE_GLOB_PATTERN = '*/index.{ts,tsx}';
const CURRENT_DIRECTORY = '.';

async function createProject(sourcePath: string): Promise<Project> {
  const tsConfigPath = normalize(join(sourcePath, TSCONFIG_FILE_NAME));
  const projectOptions: {
    skipAddingFilesFromTsConfig: boolean;
    skipFileDependencyResolution: boolean;
    skipLoadingLibFiles: boolean;
    compilerOptions: {
      target: number;
      module: number;
      jsx: number;
      allowJs: boolean;
      skipLibCheck: boolean;
    };
    tsConfigFilePath?: string;
  } = {
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      skipLibCheck: true,
    },
  };

  if (await fse.pathExists(tsConfigPath)) {
    projectOptions.tsConfigFilePath = tsConfigPath;
  }

  const project = new Project(projectOptions);

  const typesPath = normalize(join(sourcePath, TYPES_FILE_PATH));
  if (await fse.pathExists(typesPath)) {
    project.addSourceFileAtPath(typesPath);
  }

  // Include Discord enum definitions so the type checker can resolve values like
  // ActivityType.PLAYING without us having to special-case them.
  const discordEnumsPath = normalize(join(sourcePath, 'packages/discord-types/src/enums.ts'));
  if (await fse.pathExists(discordEnumsPath)) {
    project.addSourceFileAtPath(discordEnumsPath);
  }

  // Include Shiki themes for shikiCodeblocks so we can resolve theme values
  const shikiThemesPath = normalize(
    join(sourcePath, 'src/plugins/shikiCodeblocks.desktop/api/themes.ts')
  );
  if (await fse.pathExists(shikiThemesPath)) {
    project.addSourceFileAtPath(shikiThemesPath);
  }

  return project;
}

async function findPluginSourceFile(pluginPath: string): Promise<Maybe<string>> {
  const found = await asyncFind(async (pattern: string) => {
    const filePath = normalize(join(pluginPath, pattern));
    return await fse.pathExists(filePath);
  }, PLUGIN_SOURCE_FILE_PATTERNS);

  return found !== undefined ? Maybe.just(normalize(join(pluginPath, found))) : Maybe.nothing();
}

async function parseSinglePlugin(
  pluginDir: string,
  pluginPath: string,
  project: Project,
  typeChecker: ReturnType<Project['getTypeChecker']>
): Promise<Maybe<[string, PluginConfig]>> {
  const filePath = await findPluginSourceFile(pluginPath);
  if (filePath.isNothing) {
    return Maybe.nothing();
  }

  const path = filePath.value;
  const sourceFile = project.addSourceFileAtPath(path);
  const pluginInfo = extractPluginInfo(sourceFile, typeChecker);
  const pluginName =
    pluginInfo.name ??
    pipe(
      pluginDir.split(PLUGIN_DIR_SEPARATOR_PATTERN),
      map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    ).join('');

  if (!pluginName) {
    return Maybe.nothing();
  }

  let settingsCall = findDefinePluginSettings(sourceFile);

  if (settingsCall.isNothing) {
    const settingsPath = normalize(join(pluginPath, 'settings.ts'));
    if (await fse.pathExists(settingsPath)) {
      const settingsFile = project.addSourceFileAtPath(settingsPath);
      settingsCall = findDefinePluginSettings(settingsFile);
    }
  }

  const settings = settingsCall
    .map((call) => extractSettingsFromCall(call, typeChecker, project.getProgram()))
    .unwrapOr({});

  const pluginConfig: PluginConfig = {
    name: pluginName,
    settings,
    ...(pluginInfo.description !== undefined && {
      description: pluginInfo.description,
    }),
  };

  return Maybe.just<[string, PluginConfig]>([pluginName, pluginConfig]);
}

async function parsePluginsFromDirectory(
  pluginsPath: string,
  project: Project,
  typeChecker: ReturnType<Project['getTypeChecker']>,
  isTTY: boolean
): Promise<Record<string, PluginConfig>> {
  const files = await fg(PLUGIN_FILE_GLOB_PATTERN, {
    cwd: pluginsPath,
    absolute: false,
    onlyFiles: true,
  });

  const pluginDirsArray = pipe(
    files,
    map((file: string) => dirname(file)),
    unique(),
    filter((dir: string) => dir !== CURRENT_DIRECTORY)
  );

  if (!isTTY) {
    const dirName = basename(pluginsPath);
    console.log(`Found ${pluginDirsArray.length} plugin directories in ${dirName}`);
  }

  const limit = pLimit(PARALLEL_PROCESSING_LIMIT);
  let processed = 0;

  const results = await asyncToArray(
    asyncMap(async (pluginDir: string) => {
      const pluginPath = normalize(join(pluginsPath, pluginDir));
      const result = await limit(() =>
        parseSinglePlugin(pluginDir, pluginPath, project, typeChecker)
      );
      processed++;
      if (!isTTY && processed % PROGRESS_REPORT_INTERVAL === 0) {
        console.log(`Processed ${processed}/${pluginDirsArray.length} plugins...`);
      }
      return result;
    }, pluginDirsArray)
  );

  const validResults = pipe(
    results,
    filter((maybe) => maybe.isJust),
    map((maybe) => (maybe as Extract<typeof maybe, { isJust: true }>).value)
  );

  return pipe(validResults, fromEntries, pickBy(isNonNull)) as Record<string, PluginConfig>;
}

export interface ParsePluginsOptions {
  vencordPluginsDir?: string;
  equicordPluginsDir?: string;
}

export async function parsePlugins(
  sourcePath: string,
  options: ParsePluginsOptions = {}
): Promise<ParsedPluginsResult> {
  const vencordPluginsDir = options.vencordPluginsDir ?? CLI_CONFIG.directories.vencordPlugins;
  const equicordPluginsDir = options.equicordPluginsDir ?? CLI_CONFIG.directories.equicordPlugins;

  const pluginsPath = normalize(join(sourcePath, vencordPluginsDir));
  const hasPlugins = await fse.pathExists(pluginsPath);

  const equicordPluginsPath = normalize(join(sourcePath, equicordPluginsDir));
  const hasEquicordPlugins = await fse.pathExists(equicordPluginsPath);

  if (!hasPlugins && !hasEquicordPlugins) {
    throw new Error(
      `No plugins directories found. Expected one of:\n` +
        `  - ${pluginsPath}\n` +
        `  - ${equicordPluginsPath}`
    );
  }

  const project = await createProject(sourcePath);
  const typeChecker = project.getTypeChecker();
  const isTTY = process.stdout.isTTY;

  const vencordPlugins: Record<string, PluginConfig> = hasPlugins
    ? await parsePluginsFromDirectory(pluginsPath, project, typeChecker, isTTY)
    : {};

  const equicordPlugins: Record<string, PluginConfig> = hasEquicordPlugins
    ? await parsePluginsFromDirectory(equicordPluginsPath, project, typeChecker, isTTY)
    : {};

  return {
    vencordPlugins,
    equicordPlugins,
  };
}

export function categorizePlugins(
  vencordResult: Readonly<ParsedPluginsResult>,
  equicordResult?: Readonly<ParsedPluginsResult>
): {
  readonly generic: Readonly<Record<string, PluginConfig>>;
  readonly vencordOnly: Readonly<Record<string, PluginConfig>>;
  readonly equicordOnly: Readonly<Record<string, PluginConfig>>;
} {
  const vencordPlugins = vencordResult.vencordPlugins;
  const equicordSharedPlugins = equicordResult?.vencordPlugins ?? {};
  const equicordOnlyPlugins = equicordResult?.equicordPlugins ?? {};

  const [genericTuples, vencordTuples] = pipe(
    keys(vencordPlugins),
    map((name: string) => {
      const config = vencordPlugins[name];
      const equicordConfig = equicordSharedPlugins[name];
      return equicordConfig
        ? ([name, equicordConfig] as [string, PluginConfig])
        : ([name, config] as [string, PluginConfig]);
    }),
    partition(([name, _]: readonly [string, PluginConfig]) => name in equicordSharedPlugins)
  );

  return {
    generic: pipe(genericTuples, fromEntries, pickBy(isNonNull)) as Record<string, PluginConfig>,
    vencordOnly: pipe(vencordTuples, fromEntries, pickBy(isNonNull)) as Record<
      string,
      PluginConfig
    >,
    equicordOnly: pickBy(equicordOnlyPlugins, isNonNull) as Record<string, PluginConfig>,
  };
}
