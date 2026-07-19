import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildRegistrySnapshot } from '@/skills/index.js';
import { getToolDefinitions } from '@/tools/index.js';

/**
 * Documentation tool-count guards.
 *
 * The registry is the source of truth for how many MCP tools this server
 * exposes, but the count is repeated in public docs (READMEs, llms.txt) as
 * prose and a shields.io badge. Those copies drifted once — the docs advertised
 * 322 tools while the registry served 304 — so these guards tie every
 * count-bearing public file to the live `buildRegistrySnapshot()` count instead
 * of a pinned literal. Maintainer docs (AGENTS.md, CONTEXT.md, PROJECT.md)
 * intentionally carry no number and are only checked for stale literals.
 */
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/** Public files whose prose repeats the registry tool count. */
const countBearingFiles = [
  'README.md',
  'README.de.md',
  'README.es.md',
  'README.fr.md',
  'README.ja.md',
  'README.ko.md',
  'README.pt-BR.md',
  'README.ru.md',
  'README.zh-CN.md',
  'llms.txt',
  'package.json',
];

/** Maintainer docs that must stay free of a stale hardcoded count. */
const denumberedFiles = ['AGENTS.md', 'CONTEXT.md', 'PROJECT.md', 'src/tools/registry.ts'];

const staleCount = '322';
const toolCount = buildRegistrySnapshot().toolCount;

describe('documentation tool count', () => {
  it('derives the expected count from the live registry', () => {
    expect(toolCount).toBe(getToolDefinitions().length);
  });

  it.each(countBearingFiles)('%s advertises the live registry count', (file) => {
    const content = readFileSync(`${repoRoot}${file}`, 'utf8');
    expect(content).toContain(String(toolCount));
    expect(content).not.toContain(staleCount);
  });

  it('renders the English README badge from the live registry count', () => {
    const readme = readFileSync(`${repoRoot}README.md`, 'utf8');
    expect(readme).toContain(`tools-${toolCount}-`);
  });

  it.each(denumberedFiles)('%s carries no stale hardcoded count', (file) => {
    const content = readFileSync(`${repoRoot}${file}`, 'utf8');
    expect(content).not.toContain(staleCount);
  });
});
