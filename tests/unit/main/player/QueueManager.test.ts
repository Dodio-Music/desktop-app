import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueManager, RepeatAllStrategy, RepeatOffStrategy, QueueState } from '@main/player/QueueManager';
import { BaseSongEntry } from '@shared/TrackInfo';
import { RepeatMode } from '@shared/PlayerState';
import BrowserWindow = Electron.BrowserWindow;

// Mock electron before anything else
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp')
  },
  ipcMain: {
    handle: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: {
      send: vi.fn()
    }
  }))
}));

// Mock preferences to avoid JsonStore initialization
vi.mock('@main/preferences.js', () => ({
  setPreferences: vi.fn(),
  getPreferences: vi.fn(),
  loadPreferencesFromDisk: vi.fn(),
  registerPreferencesIPC: vi.fn()
}));

describe('QueueManager Strategies', () => {
  const mockTracks: BaseSongEntry[] = [
    { id: '1', title: 'Song 1', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } },
    { id: '2', title: 'Song 2', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } },
    { id: '3', title: 'Song 3', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } },
  ];

  describe('RepeatAllStrategy', () => {
    const strategy = new RepeatAllStrategy();

    it('gets upcoming from user queue first', () => {
      const state: QueueState = {
        current: mockTracks[0],
        userQueue: [mockTracks[2]],
        context: { tracks: mockTracks, startIndex: 0 }
      };
      const upcoming = strategy.getUpcoming(state, 1);
      expect(upcoming[0].id).toBe('3');
    });

    it('gets upcoming from context after user queue', () => {
      const state: QueueState = {
        current: mockTracks[0],
        userQueue: [],
        context: { tracks: mockTracks, startIndex: 0 }
      };
      const upcoming = strategy.getUpcoming(state, 1);
      expect(upcoming[0].id).toBe('2');
    });

    it('wraps around context when repeat all is on', () => {
      const state: QueueState = {
        current: mockTracks[2],
        userQueue: [],
        context: { tracks: mockTracks, startIndex: 2 }
      };
      const upcoming = strategy.getUpcoming(state, 1);
      expect(upcoming[0].id).toBe('1');
    });
  });

  describe('RepeatOffStrategy', () => {
    const strategy = new RepeatOffStrategy();

    it('does not wrap around context', () => {
      const state: QueueState = {
        current: mockTracks[2],
        userQueue: [],
        context: { tracks: mockTracks, startIndex: 2 }
      };
      const upcoming = strategy.getUpcoming(state, 1);
      expect(upcoming).toHaveLength(0);
    });
  });
});

describe('QueueManager', () => {
  let mockWindow: Electron.CrossProcessExports.BrowserWindow;
  let queueManager: QueueManager;
  const mockTracks: BaseSongEntry[] = [
    { id: '1', title: 'Song 1', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } },
    { id: '2', title: 'Song 2', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        send: vi.fn()
      }
    } as unknown as BrowserWindow;
    queueManager = new QueueManager(mockWindow, RepeatMode.All);
  });

  it('sets context and updates current song', () => {
    queueManager.setContext(mockTracks, 0);
    expect(queueManager.getNext()?.id).toBe('2');
  });

  it('advances to next song', () => {
    queueManager.setContext(mockTracks, 0);
    const next = queueManager.next();
    expect(next?.id).toBe('2');
    expect(queueManager.getNext()?.id).toBe('1'); // Wraps because RepeatMode.All
  });

  it('handles user queue with priority', () => {
    const userSong: BaseSongEntry = { id: 'user-1', title: 'User Song', artists: [], album: 'A', duration: 100, type: 'local', context: { type: 'local', name: 'L', url: 'u' } };
    queueManager.setContext(mockTracks, 0);
    queueManager.addToUserQueue(userSong);

    expect(queueManager.getNext()?.id).toBe('user-1');

    const next = queueManager.next();
    expect(next?.id).toBe('user-1');
    expect(queueManager.getNext()?.id).toBe('2');
  });

  it('cycles repeat modes', () => {
    expect(queueManager.getRepeatMode()).toBe(RepeatMode.All);
    queueManager.cycleRepeatMode('forward');
    expect(queueManager.getRepeatMode()).toBe(RepeatMode.One);
    queueManager.cycleRepeatMode('forward');
    expect(queueManager.getRepeatMode()).toBe(RepeatMode.Off);
    queueManager.cycleRepeatMode('forward');
    expect(queueManager.getRepeatMode()).toBe(RepeatMode.All);

    queueManager.cycleRepeatMode('backward');
    expect(queueManager.getRepeatMode()).toBe(RepeatMode.Off);
  });

  it('handles empty context', () => {
    queueManager.setContext([], 0);
    expect(queueManager.getNext()).toBeNull();
    expect(queueManager.next()).toBeNull();
  });

  it('handles previous song correctly', () => {
    queueManager.setContext(mockTracks, 1);
    const prev = queueManager.previous();
    expect(prev?.id).toBe('1');
  });

  it('wraps around to last song on previous if RepeatMode.All', () => {
    queueManager.setRepeatMode(RepeatMode.All);
    queueManager.setContext(mockTracks, 0);
    const prev = queueManager.previous();
    expect(prev?.id).toBe('2');
  });
});
