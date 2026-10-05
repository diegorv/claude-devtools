import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@shared/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { buildSubagentDetail } from '../../../../src/main/services/analysis/SubagentDetailBuilder';
import { LocalFileSystemProvider } from '../../../../src/main/services/infrastructure/LocalFileSystemProvider';

import type { SubagentResolver } from '../../../../src/main/services/discovery/SubagentResolver';
import type { SessionParser } from '../../../../src/main/services/parsing/SessionParser';

const PROJECT_ID = '-Users-test-project';
const SESSION_ID = 'session-1';
const AGENT_ID = 'a1';

function createParser(): SessionParser {
  return {
    parseSessionFile: vi.fn(async () => ({
      messages: [{ type: 'user', content: 'Do the task', timestamp: new Date(0) }],
      metrics: { inputTokens: 1, outputTokens: 2, messageCount: 1 },
      taskCalls: [],
    })),
  } as unknown as SessionParser;
}

const resolver = { resolveSubagents: vi.fn(async () => []) } as unknown as SubagentResolver;

describe('buildSubagentDetail', () => {
  let projectsDir: string;
  let subagentsDir: string;

  beforeEach(() => {
    projectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-detail-'));
    subagentsDir = path.join(projectsDir, PROJECT_ID, SESSION_ID, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectsDir, { recursive: true, force: true });
  });

  async function build(parser: SessionParser) {
    return buildSubagentDetail(
      PROJECT_ID,
      SESSION_ID,
      AGENT_ID,
      parser,
      resolver,
      () => [],
      new LocalFileSystemProvider(),
      projectsDir
    );
  }

  it('loads a subagent from {sessionId}/subagents/', async () => {
    const file = path.join(subagentsDir, `agent-${AGENT_ID}.jsonl`);
    fs.writeFileSync(file, '{}\n');
    const parser = createParser();

    const detail = await build(parser);

    expect(parser.parseSessionFile).toHaveBeenCalledWith(file);
    expect(detail?.id).toBe(AGENT_ID);
    expect(detail?.description).toBe('Do the task');
  });

  it('loads a Workflow subagent from subagents/workflows/{runId}/', async () => {
    const runDir = path.join(subagentsDir, 'workflows', 'wf_abc-123');
    fs.mkdirSync(runDir, { recursive: true });
    const file = path.join(runDir, `agent-${AGENT_ID}.jsonl`);
    fs.writeFileSync(file, '{}\n');
    const parser = createParser();

    const detail = await build(parser);

    expect(parser.parseSessionFile).toHaveBeenCalledWith(file);
    expect(detail?.id).toBe(AGENT_ID);
  });

  it('returns null when the subagent file does not exist', async () => {
    const parser = createParser();

    expect(await build(parser)).toBeNull();
    expect(parser.parseSessionFile).not.toHaveBeenCalled();
  });
});
