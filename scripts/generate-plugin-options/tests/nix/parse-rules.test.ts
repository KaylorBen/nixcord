import { describe, test, expect } from 'vitest';
import type { PluginConfig } from '../../src/shared/types.js';
import { generateParseRulesModule } from '../../src/nix/parse-rules.js';

describe('generateParseRulesModule()', () => {
  const shared: Record<string, PluginConfig> = {
    showConnections: {
      name: 'ShowConnections',
      description: 'Show connected accounts',
      settings: {},
    },
  };

  const vencordOnly: Record<string, PluginConfig> = {
    iLoveSpam: {
      name: 'iLoveSpam',
      description: 'Keep spam visible',
      settings: {},
    },
  };

  const equicordOnly: Record<string, PluginConfig> = {
    petpet: {
      name: 'petpet',
      description: 'Pet pets',
      settings: {},
    },
  };

  test('includes auto-detected lowercase plugin names', () => {
    const output = generateParseRulesModule(shared, vencordOnly, equicordOnly);
    expect(output).toContain('iLoveSpam');
    expect(output).toContain('petpet');
    expect(output).not.toContain('showConnections');
  });

  test('always includes static upper-name entries', () => {
    const output = generateParseRulesModule({}, {}, {});
    expect(output).toContain('webhook');
    expect(output).toContain('owner');
  });
});
