import { describe, it, expect } from 'vitest';
import { secondsToTime, formatTime, formatDurationHuman } from '@renderer/util/timeUtils';

describe('timeUtils', () => {
  describe('secondsToTime', () => {
    it('formats seconds correctly without hours', () => {
      expect(secondsToTime(0)).toBe('00:00');
      expect(secondsToTime(59)).toBe('00:59');
      expect(secondsToTime(60)).toBe('01:00');
      expect(secondsToTime(3599)).toBe('59:59');
    });

    it('formats seconds correctly with hours', () => {
      expect(secondsToTime(3600)).toBe('01:00:00');
      expect(secondsToTime(3661)).toBe('01:01:01');
      expect(secondsToTime(36000)).toBe('10:00:00');
    });
  });

  describe('formatTime', () => {
    it('formats time without hours (minimal padding)', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('formats time with hours (minimal padding)', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(36000)).toBe('10:00:00');
    });
  });

  describe('formatDurationHuman', () => {
    it('formats duration for minutes and seconds', () => {
      expect(formatDurationHuman(45)).toBe('0 min 45 sec');
      expect(formatDurationHuman(60)).toBe('1 min 0 sec');
      expect(formatDurationHuman(125)).toBe('2 min 5 sec');
    });

    it('formats duration for hours and minutes', () => {
      expect(formatDurationHuman(3600)).toBe('1 hr 0 min');
      expect(formatDurationHuman(3660)).toBe('1 hr 1 min');
      expect(formatDurationHuman(7200)).toBe('2 hrs 0 min');
      expect(formatDurationHuman(7320)).toBe('2 hrs 2 min');
    });
  });
});
