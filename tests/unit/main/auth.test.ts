import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyLogin, applyRefresh, clearAuth, removeAccessToken, auth, setupAuth } from '@main/auth';
import { SignInResponse, RefreshTokenResponse } from '@main/web/Typing';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock-user-data')
  },
  safeStorage: {
    encryptString: vi.fn().mockImplementation((s) => Buffer.from(s)),
    decryptString: vi.fn().mockImplementation((b) => b.toString()),
    isEncryptionAvailable: vi.fn().mockReturnValue(true)
  },
  ipcMain: {
    handle: vi.fn()
  },
  BrowserWindow: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('{}')),
    writeFile: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock dodio_api
vi.mock('@main/web/dodio_api.js', () => ({
  refreshAuthToken: vi.fn().mockResolvedValue(null),
  default: {}
}));

describe('auth management', () => {
  const mockWindow = {
    webContents: {
      send: vi.fn()
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Initialize the module state with a mock window
    await setupAuth(mockWindow as unknown as Electron.CrossProcessExports.BrowserWindow);
    vi.clearAllMocks(); // Clear mocks again after setup to only track changes in tests
  });

  const sampleSignIn: SignInResponse = {
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    accessToken: 'access-token',
    accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
    refreshToken: 'refresh-token',
    refreshTokenExpirationDate: new Date(Date.now() + 86400000).toISOString()
  };

  it('applies login correctly', () => {
    applyLogin(sampleSignIn);

    expect(auth.username).toBe('testuser');
    expect(auth.accessToken).toBe('access-token');
    expect(auth.accessTokenExpirationDate).toBeInstanceOf(Date);
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('auth:statusChange', expect.objectContaining({
        status: 'logged_in',
        username: 'testuser'
    }));
  });

  it('applies refresh correctly', () => {
    const refreshRes: RefreshTokenResponse = {
      accessToken: 'new-access-token',
      accessTokenExpirationDate: new Date(Date.now() + 3600000).toISOString(),
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      role: 'USER'
    };

    applyRefresh(refreshRes);
    expect(auth.accessToken).toBe('new-access-token');
  });

  it('clears auth', () => {
    applyLogin(sampleSignIn);
    clearAuth();
    expect(auth.accessToken).toBeUndefined();
    expect(auth.username).toBeUndefined();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('auth:statusChange', expect.objectContaining({
        status: 'no_account'
    }));
  });

  it('removes only access token', () => {
    applyLogin(sampleSignIn);
    removeAccessToken();
    expect(auth.accessToken).toBeUndefined();
    expect(auth.refreshToken).toBe('refresh-token'); // Should still be there
  });
});
