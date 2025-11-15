import { z } from 'zod';
import type { Simplify } from 'type-fest';

const CliConfigSchema = z.object({
  version: z.string().min(1),
  directories: z.object({
    output: z.string().min(1),
    vencordPlugins: z.string().min(1),
    equicordPlugins: z.string().min(1),
  }),
  filenames: z.object({
    packageJson: z.string().min(1),
    shared: z.string().min(1),
    vencord: z.string().min(1),
    equicord: z.string().min(1),
    parseRules: z.string().min(1),
  }),
  symbols: z.object({
    success: z.string(),
  }),
});

export const CLI_CONFIG = {
  version: '1.0.0',
  directories: {
    output: 'plugins',
    vencordPlugins: 'src/plugins',
    equicordPlugins: 'src/equicordplugins',
  },
  filenames: {
    packageJson: 'package.json',
    shared: 'shared.nix',
    vencord: 'vencord.nix',
    equicord: 'equicord.nix',
    parseRules: 'parse-rules.nix',
  },
  symbols: {
    success: '✓',
  },
} as const;

// Validate config at module load time
CliConfigSchema.parse(CLI_CONFIG);

export type CliConfig = Simplify<z.infer<typeof CliConfigSchema>>;
