import { describe, test, expect } from 'vitest'
import rendererPlayerReducer, {
  setVolume,
  setIsMuted,
  toggleMute,
  increaseVolume,
  decreaseVolume,
} from '../../../src/renderer/src/redux/rendererPlayerSlice'

describe('rendererPlayerSlice', () => {
  test('should return initial state', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    expect(initialState.volume).toBeNull()
    expect(initialState.isMuted).toBe(false)
  })

  test('should handle setVolume', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Test setting valid volume
    const validVolumeState = rendererPlayerReducer(initialState, setVolume(0.5))
    expect(validVolumeState.volume).toBe(0.5)
    
    // Test setting volume to 0
    const zeroVolumeState = rendererPlayerReducer(validVolumeState, setVolume(0))
    expect(zeroVolumeState.volume).toBe(0)
    
    // Test setting volume to 1
    const maxVolumeState = rendererPlayerReducer(zeroVolumeState, setVolume(1))
    expect(maxVolumeState.volume).toBe(1)
  })

  test('should clamp volume values', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Test clamping above 1
    const aboveMaxState = rendererPlayerReducer(initialState, setVolume(1.5))
    expect(aboveMaxState.volume).toBe(1)
    
    // Test clamping below 0
    const belowMinState = rendererPlayerReducer(aboveMaxState, setVolume(-0.5))
    expect(belowMinState.volume).toBe(0)
    
    // Test edge cases
    const edgeCase1 = rendererPlayerReducer(belowMinState, setVolume(1.0001))
    expect(edgeCase1.volume).toBe(1)
    
    const edgeCase2 = rendererPlayerReducer(edgeCase1, setVolume(-0.0001))
    expect(edgeCase2.volume).toBe(0)
  })

  test('should handle setIsMuted', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Test setting to muted
    const mutedState = rendererPlayerReducer(initialState, setIsMuted(true))
    expect(mutedState.isMuted).toBe(true)
    
    // Test setting to unmuted
    const unmutedState = rendererPlayerReducer(mutedState, setIsMuted(false))
    expect(unmutedState.isMuted).toBe(false)
  })

  test('should handle toggleMute', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Initial state is not muted, toggle should mute
    const mutedState = rendererPlayerReducer(initialState, toggleMute())
    expect(mutedState.isMuted).toBe(true)
    
    // Toggle again should unmute
    const unmutedState = rendererPlayerReducer(mutedState, toggleMute())
    expect(unmutedState.isMuted).toBe(false)
  })

  test('should not toggle mute when isMuted is null', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    const nullMutedState = rendererPlayerReducer(initialState, setIsMuted(null))
    
    // Toggle should not change state when isMuted is null
    const unchangedState = rendererPlayerReducer(nullMutedState, toggleMute())
    expect(unchangedState.isMuted).toBe(null)
  })

  test('should handle increaseVolume', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Set initial volume
    const withVolumeState = rendererPlayerReducer(initialState, setVolume(0.5))
    
    // Increase volume
    const increasedState = rendererPlayerReducer(withVolumeState, increaseVolume())
    expect(increasedState.volume).toBe(0.6)
    
    // Test clamping at max
    const nearMaxState = rendererPlayerReducer(increasedState, setVolume(0.95))
    const maxedState = rendererPlayerReducer(nearMaxState, increaseVolume())
    expect(maxedState.volume).toBe(1)
    
    // Should not exceed 1
    const stillMaxedState = rendererPlayerReducer(maxedState, increaseVolume())
    expect(stillMaxedState.volume).toBe(1)
  })

  test('should not increase volume when volume is null', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Should not change when volume is null
    const unchangedState = rendererPlayerReducer(initialState, increaseVolume())
    expect(unchangedState.volume).toBe(null)
  })

  test('should handle decreaseVolume', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Set initial volume
    const withVolumeState = rendererPlayerReducer(initialState, setVolume(0.5))
    
    // Decrease volume
    const decreasedState = rendererPlayerReducer(withVolumeState, decreaseVolume())
    expect(decreasedState.volume).toBe(0.4)
    
    // Test clamping at min
    const nearMinState = rendererPlayerReducer(decreasedState, setVolume(0.05))
    const minState = rendererPlayerReducer(nearMinState, decreaseVolume())
    expect(minState.volume).toBe(0)
    
    // Should not go below 0
    const stillMinState = rendererPlayerReducer(minState, decreaseVolume())
    expect(stillMinState.volume).toBe(0)
  })

  test('should not decrease volume when volume is null', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Should not change when volume is null
    const unchangedState = rendererPlayerReducer(initialState, decreaseVolume())
    expect(unchangedState.volume).toBe(null)
  })

  test('should create immutable state updates', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    const newState = rendererPlayerReducer(initialState, setVolume(0.7))
    
    // Ensure state is immutable
    expect(initialState).not.toBe(newState)
    expect(initialState.volume).toBe(null)
    expect(newState.volume).toBe(0.7)
  })

  test('should handle multiple volume operations', () => {
    const initialState = rendererPlayerReducer(undefined, { type: 'unknown' })
    
    // Set volume and perform multiple operations
    let state = rendererPlayerReducer(initialState, setVolume(0.3))
    state = rendererPlayerReducer(state, increaseVolume())
    state = rendererPlayerReducer(state, increaseVolume())
    state = rendererPlayerReducer(state, decreaseVolume())
    state = rendererPlayerReducer(state, toggleMute())
    
    expect(state.volume).toBe(0.4)
    expect(state.isMuted).toBe(true)
  })
})
