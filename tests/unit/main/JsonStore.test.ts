import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonStore } from '@main/JsonStore';
import fs from 'fs/promises';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock-user-data')
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn()
  }
}));

describe('JsonStore', () => {
  const defaultData = { theme: 'dark', volume: 0.5 };
  let store: JsonStore<typeof defaultData>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    store = new JsonStore('test.json', defaultData);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default data', () => {
    expect(() => store.get()).toThrow('Store not loaded yet');
  });

  it('loads data from file if it exists', async () => {
    const savedData = { theme: 'light', volume: 0.8 };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedData));

    const loaded = await store.load();
    expect(loaded).toEqual(savedData);
  });

  it('uses default data if file does not exist or is invalid', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    await store.load();
    expect(store.get()).toEqual(defaultData);
  });

  it('filters unknown keys during load', async () => {
    const maliciousData = { theme: 'light', unknownKey: 'hacker' };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(maliciousData));

    const loaded = await store.load();
    expect(loaded).toEqual({ theme: 'light', volume: 0.5 });
  });

  it('updates data and schedules save', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(defaultData));
    await store.load();

    store.set({ volume: 1.0 });
    expect(fs.writeFile).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runOnlyPendingTimersAsync();

    expect(fs.writeFile).toHaveBeenCalled();
    expect(fs.rename).toHaveBeenCalled();
  });

  it('debounces multiple sets', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(defaultData));
    await store.load();

    // Trigger 3 sets quickly
    store.set({ volume: 0.1 });
    store.set({ volume: 0.2 });
    store.set({ volume: 0.3 });

    // Ensure save hasn't run yet
    expect(fs.writeFile).not.toHaveBeenCalled();

    // Advance time once
    vi.advanceTimersByTime(500);
    await vi.runOnlyPendingTimersAsync();

    // Should only save ONCE with the final value
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"volume": 0.3'),
        expect.any(String)
    );
  });
});
