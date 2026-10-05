import { describe, expect, it } from 'vitest';

import {
  isCommandOutputContent,
  sanitizeDisplayContent,
} from '../../../src/shared/utils/contentSanitizer';

describe('contentSanitizer', () => {
  describe('bash mode (! commands)', () => {
    it('should treat <bash-stdout> as command output', () => {
      expect(
        isCommandOutputContent('<bash-stdout>/x</bash-stdout><bash-stderr></bash-stderr>')
      ).toBe(true);
    });

    it('should extract stdout from bash output', () => {
      expect(
        sanitizeDisplayContent('<bash-stdout>/x</bash-stdout><bash-stderr></bash-stderr>')
      ).toBe('/x');
    });

    it('should extract stderr when stdout is empty', () => {
      expect(
        sanitizeDisplayContent('<bash-stdout></bash-stdout><bash-stderr>not found</bash-stderr>')
      ).toBe('not found');
    });

    it('should join stdout and stderr when both are present', () => {
      expect(
        sanitizeDisplayContent('<bash-stdout>out</bash-stdout><bash-stderr>err</bash-stderr>')
      ).toBe('out\nerr');
    });

    it('should display <bash-input> as a ! command', () => {
      expect(isCommandOutputContent('<bash-input>pwd</bash-input>')).toBe(false);
      expect(sanitizeDisplayContent('<bash-input>pwd</bash-input>')).toBe('! pwd');
    });
  });
});
