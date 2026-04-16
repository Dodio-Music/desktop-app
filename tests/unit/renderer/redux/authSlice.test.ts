import { describe, it, expect } from 'vitest';
import authReducer, { setAuthInfo, AuthState } from '@renderer/redux/authSlice';
import { RendererAuthInfo } from '@main/web/Typing';

describe('authSlice', () => {
  const initialState: AuthState = {
    info: { status: 'no_account' }
  };

  it('should handle initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setAuthInfo', () => {
    const authInfo: RendererAuthInfo = {
      status: 'logged_in',
      username: 'testuser',
      displayName: 'Test User'
    };
    const actual = authReducer(initialState, setAuthInfo(authInfo));
    expect(actual.info).toEqual(authInfo);
  });
});
