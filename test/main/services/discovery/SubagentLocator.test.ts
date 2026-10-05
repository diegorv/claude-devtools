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

import { SubagentLocator } from '../../../../src/main/services/discovery/SubagentLocator';

const PROJECT_ID = '-Users-test-project';
const SESSION_ID = 'session-1';
const LINE = `{"type":"user","sessionId":"${SESSION_ID}","agentId":"a1"}\n`;

describe('SubagentLocator', () => {
  let projectsDir: string;
  let subagentsDir: string;

  beforeEach(() => {
    projectsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-locator-'));
    subagentsDir = path.join(projectsDir, PROJECT_ID, SESSION_ID, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectsDir, { recursive: true, force: true });
  });

  it('lists direct agent-*.jsonl files in the subagents directory', async () => {
    const direct = path.join(subagentsDir, 'agent-a1.jsonl');
    fs.writeFileSync(direct, LINE);

    const locator = new SubagentLocator(projectsDir);
    expect(await locator.listSubagentFiles(PROJECT_ID, SESSION_ID)).toEqual([direct]);
    expect(await locator.hasSubagents(PROJECT_ID, SESSION_ID)).toBe(true);
  });

  it('lists Workflow agent files under subagents/workflows/{runId}/', async () => {
    const runDir = path.join(subagentsDir, 'workflows', 'wf_abc-123');
    fs.mkdirSync(runDir, { recursive: true });
    const workflowAgent = path.join(runDir, 'agent-a1.jsonl');
    fs.writeFileSync(workflowAgent, LINE);
    fs.writeFileSync(path.join(runDir, 'agent-a1.meta.json'), '{"agentType":"workflow-subagent"}');
    fs.writeFileSync(path.join(runDir, 'journal.jsonl'), '{"event":"start"}\n');

    const locator = new SubagentLocator(projectsDir);
    expect(await locator.listSubagentFiles(PROJECT_ID, SESSION_ID)).toEqual([workflowAgent]);
    expect(await locator.hasSubagents(PROJECT_ID, SESSION_ID)).toBe(true);
  });

  it('returns no subagents when only non-agent files exist', async () => {
    const runDir = path.join(subagentsDir, 'workflows', 'wf_abc-123');
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'journal.jsonl'), '{"event":"start"}\n');

    const locator = new SubagentLocator(projectsDir);
    expect(await locator.listSubagentFiles(PROJECT_ID, SESSION_ID)).toEqual([]);
    expect(await locator.hasSubagents(PROJECT_ID, SESSION_ID)).toBe(false);
  });
});
