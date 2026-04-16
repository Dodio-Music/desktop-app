import { describe, it, expect } from 'vitest';
import playerReducer, { 
    setVolume, 
    setIsMuted, 
    toggleMute, 
    increaseVolume, 
    decreaseVolume,
    PlayerState 
} from '@renderer/redux/rendererPlayerSlice';

describe('rendererPlayerSlice', () => {
  const initialState: PlayerState = {
    volume: null,
    isMuted: false,
  };

  it('should handle initial state', () => {
    expect(playerReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should set volume within bounds [0, 1]', () => {
    let state = playerReducer(initialState, setVolume(0.5));
    expect(state.volume).toBe(0.5);

    state = playerReducer(state, setVolume(1.5));
    expect(state.volume).toBe(1);

    state = playerReducer(state, setVolume(-0.5));
    expect(state.volume).toBe(0);
  });

  it('should set isMuted', () => {
    const state = playerReducer(initialState, setIsMuted(true));
    expect(state.isMuted).toBe(true);
  });

  it('should toggle mute', () => {
    let state = playerReducer({ volume: 0.5, isMuted: false }, toggleMute());
    expect(state.isMuted).toBe(true);

    state = playerReducer(state, toggleMute());
    expect(state.isMuted).toBe(false);
  });

  it('should not toggle mute if isMuted is null', () => {
    const state = playerReducer({ volume: 0.5, isMuted: null }, toggleMute());
    expect(state.isMuted).toBeNull();
  });

  it('should increase volume', () => {
    let state = playerReducer({ volume: 0.5, isMuted: false }, increaseVolume());
    expect(state.volume).toBe(0.6);

    state = playerReducer({ volume: 0.95, isMuted: false }, increaseVolume());
    expect(state.volume).toBe(1);
  });

  it('should decrease volume', () => {
    let state = playerReducer({ volume: 0.5, isMuted: false }, decreaseVolume());
    expect(state.volume).toBe(0.4);

    state = playerReducer({ volume: 0.05, isMuted: false }, decreaseVolume());
    expect(state.volume).toBe(0);
  });

  it('should not change volume if it is null', () => {
    let state = playerReducer(initialState, increaseVolume());
    expect(state.volume).toBeNull();

    state = playerReducer(initialState, decreaseVolume());
    expect(state.volume).toBeNull();
  });
});
