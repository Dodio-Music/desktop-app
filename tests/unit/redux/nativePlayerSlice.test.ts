import {describe, test, expect} from 'vitest'
import nativePlayerReducer, {
    updatePlayerState,
    setCurrentTrack,
    setPendingData,
    setRepeatMode
} from '../../../src/renderer/src/redux/nativePlayerSlice'
import {RepeatMode} from '../../../src/shared/PlayerState'
import {BaseSongEntry} from '../../../src/shared/TrackInfo'

// Mock data for testing
const mockTrack: BaseSongEntry = {
    id: 'test-track-1',
    title: 'Test Song',
    artists: ['Test Artist'],
    duration: 180,
    type: 'local',
    picture: '',
    album: 'Test Album'
}

describe('nativePlayerSlice', () => {
    test('should return initial state', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})
        expect(initialState.currentTrack).toBeNull()
        expect(initialState.userPaused).toBe(true)
        expect(initialState.currentTime).toBe(0)
        expect(initialState.duration).toBe(0)
        expect(initialState.waitingForData).toBe(false)
        expect(initialState.latency).toBe(0)
        expect(initialState.playbackRunning).toBe(false)
        expect(initialState.repeatMode).toBeNull()
    })

    test('should handle updatePlayerState', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})
        const updatedState = {
            currentTrack: mockTrack,
            userPaused: false,
            currentTime: 30,
            duration: 180,
            waitingForData: true,
            latency: 50,
            playbackRunning: true,
            repeatMode: RepeatMode.All
        }

        const newState = nativePlayerReducer(initialState, updatePlayerState(updatedState))

        expect(newState).toEqual(updatedState)
        expect(newState.currentTrack).toBe(mockTrack)
        expect(newState.userPaused).toBe(false)
        expect(newState.currentTime).toBe(30)
        expect(newState.repeatMode).toBe(RepeatMode.All)
    })

    test('should handle setCurrentTrack', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})
        const newState = nativePlayerReducer(initialState, setCurrentTrack(mockTrack))

        expect(newState.currentTrack).toBe(mockTrack)
        // Other state should remain unchanged
        expect(newState.userPaused).toBe(true)
        expect(newState.currentTime).toBe(0)
    })

    test('should handle setPendingData', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})
        const pendingData = {
            currentTime: 45,
            duration: 200,
            waitingForData: false
        }

        const newState = nativePlayerReducer(initialState, setPendingData(pendingData))

        expect(newState.currentTime).toBe(45)
        expect(newState.duration).toBe(200)
        expect(newState.waitingForData).toBe(false)
        // Unspecified fields should remain unchanged
        expect(newState.currentTrack).toBeNull()
        expect(newState.userPaused).toBe(true)
    })

    test('should handle setRepeatMode', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})

        // Test setting repeat mode to All
        const allRepeatState = nativePlayerReducer(initialState, setRepeatMode(RepeatMode.All))
        expect(allRepeatState.repeatMode).toBe(RepeatMode.All)

        // Test setting repeat mode to One
        const oneRepeatState = nativePlayerReducer(allRepeatState, setRepeatMode(RepeatMode.One))
        expect(oneRepeatState.repeatMode).toBe(RepeatMode.One)

        // Test setting repeat mode to Off
        const offRepeatState = nativePlayerReducer(oneRepeatState, setRepeatMode(RepeatMode.Off))
        expect(offRepeatState.repeatMode).toBe(RepeatMode.Off)
    })

    test('should handle all repeat modes', () => {
        const repeatModes = [RepeatMode.Off, RepeatMode.All, RepeatMode.One]

        repeatModes.forEach(mode => {
            const state = nativePlayerReducer(undefined, setRepeatMode(mode))
            expect(state.repeatMode).toBe(mode)
        })
    })

    test('should create immutable state updates', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})
        const newState = nativePlayerReducer(initialState, setCurrentTrack(mockTrack))

        // Ensure state is immutable
        expect(initialState).not.toBe(newState)
        expect(initialState.currentTrack).toBeNull()
        expect(newState.currentTrack).toBe(mockTrack)
    })

    test('should handle partial state updates correctly', () => {
        const initialState = nativePlayerReducer(undefined, {type: 'unknown'})

        // First update some fields
        const firstUpdate = nativePlayerReducer(initialState, updatePlayerState({
            currentTime: 0,
            duration: 0,
            latency: 0,
            playbackRunning: false,
            repeatMode: undefined,
            waitingForData: false,
            currentTrack: mockTrack,
            userPaused: false
        }))

        // Then update different fields
        const secondUpdate = nativePlayerReducer(firstUpdate, updatePlayerState({
            currentTime: 60,
            duration: 180
        }))

        expect(secondUpdate.currentTrack).toBe(mockTrack)
        expect(secondUpdate.userPaused).toBe(false)
        expect(secondUpdate.currentTime).toBe(60)
        expect(secondUpdate.duration).toBe(180)
    })
})
